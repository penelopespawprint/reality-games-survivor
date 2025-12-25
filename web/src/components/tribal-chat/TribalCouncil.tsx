import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { TribalMessage } from './TribalMessage';
import { TribalInput } from './TribalInput';
import { TorchHeader } from './TorchHeader';
import { OnlineUsers } from './OnlineUsers';
import './tribal-chat.css';

export interface ChatMessage {
  id: string;
  league_id: string | null;
  user_id: string;
  content: string;
  reactions: Record<string, string[]>;
  reply_to_id: string | null;
  is_anonymous: boolean;
  gif_url: string | null;
  mentions: string[];
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    role: string;
  };
  reply_to?: ChatMessage;
}

export interface OnlineUser {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_typing: boolean;
  last_seen_at: string;
}

interface TribalCouncilProps {
  leagueId?: string | null;  // null = global chat
  leagueName?: string;
  isCommissioner?: boolean;
  isGlobal?: boolean;
}

export function TribalCouncil({
  leagueId = null,
  leagueName = 'ALL SURVIVORS',
  isCommissioner = false,
  isGlobal = false,
}: TribalCouncilProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [votingBoothMode, setVotingBoothMode] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Fetch initial messages
  useEffect(() => {
    async function fetchMessages() {
      setIsLoading(true);

      let query = supabase
        .from('chat_messages')
        .select(`
          *,
          user:users!chat_messages_user_id_fkey (
            id, display_name, avatar_url, role
          ),
          reply_to:chat_messages!chat_messages_reply_to_id_fkey (
            id, content, user_id,
            user:users!chat_messages_user_id_fkey (display_name)
          )
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })
        .limit(100);

      if (leagueId) {
        query = query.eq('league_id', leagueId);
      } else {
        query = query.is('league_id', null);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
        setTimeout(scrollToBottom, 100);
      }

      setIsLoading(false);
    }

    fetchMessages();
  }, [leagueId, scrollToBottom]);

  // Subscribe to realtime updates
  useEffect(() => {
    const channelName = leagueId ? `chat:league:${leagueId}` : 'chat:global';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: leagueId ? `league_id=eq.${leagueId}` : 'league_id=is.null',
        },
        async (payload) => {
          // Fetch the full message with user data
          const { data } = await supabase
            .from('chat_messages')
            .select(`
              *,
              user:users!chat_messages_user_id_fkey (
                id, display_name, avatar_url, role
              ),
              reply_to:chat_messages!chat_messages_reply_to_id_fkey (
                id, content, user_id,
                user:users!chat_messages_user_id_fkey (display_name)
              )
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages((prev) => [...prev, data]);
            scrollToBottom();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'chat_messages',
          filter: leagueId ? `league_id=eq.${leagueId}` : 'league_id=is.null',
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((msg) =>
              msg.id === payload.new.id
                ? { ...msg, ...payload.new }
                : msg
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, scrollToBottom]);

  // Presence heartbeat
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await supabase.rpc('update_chat_presence', {
        p_league_id: leagueId,
        p_is_typing: isTyping,
      });
    };

    updatePresence();
    const interval = setInterval(updatePresence, 30000); // Every 30s

    return () => clearInterval(interval);
  }, [user, leagueId, isTyping]);

  // Fetch online users
  useEffect(() => {
    async function fetchOnlineUsers() {
      const { data } = await supabase.rpc('get_online_users', {
        p_league_id: leagueId,
      });
      if (data) {
        setOnlineUsers(data);
      }
    }

    fetchOnlineUsers();
    const interval = setInterval(fetchOnlineUsers, 10000); // Every 10s

    return () => clearInterval(interval);
  }, [leagueId]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2000);
  }, [isTyping]);

  // Send message
  const sendMessage = async (content: string, gifUrl?: string) => {
    if (!user || (!content.trim() && !gifUrl)) return;

    // Extract mentions (@username)
    const mentionMatches = content.match(/@(\w+)/g) || [];
    const mentionedUsers: string[] = [];

    // TODO: Resolve usernames to user IDs
    // For now, we'll store empty mentions

    const { error } = await supabase.from('chat_messages').insert({
      league_id: leagueId,
      user_id: user.id,
      content: content.trim(),
      gif_url: gifUrl || null,
      reply_to_id: replyingTo?.id || null,
      is_anonymous: votingBoothMode,
      mentions: mentionedUsers,
    });

    if (error) {
      console.error('Error sending message:', error);
    } else {
      setReplyingTo(null);
    }
  };

  // Handle reaction
  const handleReaction = async (messageId: string, reactionType: string) => {
    const { error } = await supabase.rpc('add_chat_reaction', {
      p_message_id: messageId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.error('Error adding reaction:', error);
    }
  };

  // Handle delete message
  const handleDelete = async (messageId: string) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_deleted: true,
        deleted_by: user?.id,
        deleted_at: new Date().toISOString(),
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error deleting message:', error);
    }
  };

  // Handle pin message
  const handlePin = async (messageId: string, isPinned: boolean) => {
    const { error } = await supabase
      .from('chat_messages')
      .update({
        is_pinned: !isPinned,
        pinned_by: !isPinned ? user?.id : null,
        pinned_at: !isPinned ? new Date().toISOString() : null,
      })
      .eq('id', messageId);

    if (error) {
      console.error('Error pinning message:', error);
    }
  };

  // Get pinned messages
  const pinnedMessages = messages.filter((msg) => msg.is_pinned);
  const regularMessages = messages.filter((msg) => !msg.is_pinned);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';
  const canModerate = isAdmin || isCommissioner;

  return (
    <div className="tribal-council">
      <TorchHeader
        title={isGlobal ? 'TRIBAL COUNCIL' : 'TRIBAL COUNCIL'}
        subtitle={leagueName}
        onlineCount={onlineUsers.length}
      />

      <div className="tribal-council-body">
        <div className="tribal-messages-container">
          {isLoading ? (
            <div className="tribal-loading">
              <div className="torch-loading">
                <span className="flame">🔥</span>
                <span className="loading-text">Lighting the torches...</span>
              </div>
            </div>
          ) : (
            <>
              {/* Pinned Messages */}
              {pinnedMessages.length > 0 && (
                <div className="tribal-pinned-section">
                  <div className="pinned-header">📌 Pinned Messages</div>
                  {pinnedMessages.map((message) => (
                    <TribalMessage
                      key={message.id}
                      message={message}
                      currentUserId={user?.id}
                      canModerate={canModerate}
                      onReply={() => setReplyingTo(message)}
                      onReaction={handleReaction}
                      onDelete={handleDelete}
                      onPin={handlePin}
                      isCommissioner={
                        message.user_id === leagueId
                          ? false
                          : message.user?.role === 'admin'
                      }
                    />
                  ))}
                </div>
              )}

              {/* Regular Messages */}
              <div className="tribal-messages">
                {regularMessages.map((message) => (
                  <TribalMessage
                    key={message.id}
                    message={message}
                    currentUserId={user?.id}
                    canModerate={canModerate}
                    onReply={() => setReplyingTo(message)}
                    onReaction={handleReaction}
                    onDelete={handleDelete}
                    onPin={handlePin}
                    isCommissioner={false}
                  />
                ))}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </div>

        <OnlineUsers users={onlineUsers} />
      </div>

      <TribalInput
        onSend={sendMessage}
        onTyping={handleTyping}
        replyingTo={replyingTo}
        onCancelReply={() => setReplyingTo(null)}
        votingBoothMode={votingBoothMode}
        onToggleVotingBooth={() => setVotingBoothMode(!votingBoothMode)}
        disabled={!user}
      />
    </div>
  );
}
