/**
 * Global Chat Component
 *
 * Inline chat for the global leaderboard page.
 * Uses the global league's message channel.
 */

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Send, Loader2, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react';

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    display_name: string;
    avatar_url: string | null;
  };
}

export function GlobalChat() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch the global league ID
  const { data: globalLeague } = useQuery({
    queryKey: ['global-league'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leagues')
        .select('id')
        .eq('is_global', true)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const leagueId = globalLeague?.id;

  // Fetch messages
  const { data: messages, isLoading } = useQuery({
    queryKey: ['global-chat-messages', leagueId],
    queryFn: async () => {
      if (!leagueId) return [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from('league_messages')
        .select(
          `
          id,
          user_id,
          content,
          created_at,
          user:users (
            display_name,
            avatar_url
          )
        `
        )
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data as Message[]).reverse();
    },
    enabled: !!leagueId,
    refetchInterval: 10000,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      if (!leagueId) throw new Error('No global league found');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).from('league_messages').insert({
        league_id: leagueId,
        user_id: user!.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setMessage('');
      queryClient.invalidateQueries({ queryKey: ['global-chat-messages', leagueId] });
      inputRef.current?.focus();
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    if (!leagueId) return;

    const channel = supabase
      .channel(`global-chat-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'league_messages',
          filter: `league_id=eq.${leagueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['global-chat-messages', leagueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isExpanded]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessage.isPending && user) {
      sendMessage.mutate(message.trim());
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format name as "First Name + Last Initial" (e.g., "John S." or "Mary")
  const formatDisplayName = (displayName: string | undefined): string => {
    if (!displayName) return 'Unknown';
    const parts = displayName.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  };

  if (!leagueId) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-5 py-4 border-b border-cream-200 bg-cream-50 flex items-center justify-between hover:bg-cream-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-burgundy-500" />
          <h3 className="font-semibold text-neutral-800">Global Chat</h3>
          <span className="text-sm text-neutral-400">{messages?.length || 0} messages</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-neutral-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-neutral-400" />
        )}
      </button>

      {isExpanded && (
        <>
          {/* Messages */}
          <div className="h-64 overflow-y-auto p-4 space-y-3 bg-cream-50/50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 text-burgundy-500 animate-spin" />
              </div>
            ) : messages?.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="h-10 w-10 text-neutral-300 mb-2" />
                <p className="text-neutral-500 text-sm">No messages yet</p>
                <p className="text-xs text-neutral-400">Be the first to say something!</p>
              </div>
            ) : (
              messages?.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
                    {/* Avatar */}
                    <div
                      className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-semibold ${
                        isOwn ? 'bg-burgundy-500' : 'bg-neutral-400'
                      }`}
                    >
                      {msg.user?.display_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>

                    {/* Message */}
                    <div className={`max-w-[75%] ${isOwn ? 'text-right' : ''}`}>
                      {!isOwn && (
                        <p className="text-xs text-neutral-500 mb-0.5 px-1">
                          {formatDisplayName(msg.user?.display_name)}
                        </p>
                      )}
                      <div
                        className={`inline-block px-3 py-1.5 rounded-2xl text-sm ${
                          isOwn
                            ? 'bg-burgundy-500 text-white rounded-br-md'
                            : 'bg-white text-neutral-800 rounded-bl-md border border-cream-200'
                        }`}
                      >
                        {msg.content}
                      </div>
                      <p className="text-xs text-neutral-400 mt-0.5 px-1">
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          {user ? (
            <form onSubmit={handleSubmit} className="p-3 border-t border-cream-200 bg-white">
              <div className="flex gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Say something..."
                  className="flex-1 px-3 py-2 text-sm rounded-full border border-cream-300 bg-cream-50 focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
                  disabled={sendMessage.isPending}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || sendMessage.isPending}
                  className="w-9 h-9 rounded-full bg-burgundy-500 text-white flex items-center justify-center hover:bg-burgundy-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendMessage.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-3 border-t border-cream-200 bg-cream-50 text-center">
              <p className="text-sm text-neutral-500">Sign in to join the conversation</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
