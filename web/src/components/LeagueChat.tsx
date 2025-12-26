import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Send, Loader2, MessageCircle } from 'lucide-react';

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

interface LeagueChatProps {
  leagueId: string;
}

export function LeagueChat({ leagueId }: LeagueChatProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch messages - using type assertion since league_messages isn't in generated types yet
  const { data: messages, isLoading } = useQuery({
    queryKey: ['league-messages', leagueId],
    queryFn: async () => {
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
        .order('created_at', { ascending: true })
        .limit(100);
      if (error) throw error;
      return data as Message[];
    },
    refetchInterval: 10000, // Fallback polling every 10s
  });

  // Send message mutation - using type assertion since league_messages isn't in generated types yet
  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
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
      queryClient.invalidateQueries({ queryKey: ['league-messages', leagueId] });
      inputRef.current?.focus();
    },
  });

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase
      .channel(`league-chat-${leagueId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'league_messages',
          filter: `league_id=eq.${leagueId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['league-messages', leagueId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [leagueId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessage.isPending) {
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Group messages by date
  const groupedMessages =
    messages?.reduce(
      (groups, msg) => {
        const date = new Date(msg.created_at).toDateString();
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(msg);
        return groups;
      },
      {} as Record<string, Message[]>
    ) || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[500px] bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-cream-200 bg-cream-50">
        <div className="flex items-center gap-3">
          <MessageCircle className="h-5 w-5 text-burgundy-500" />
          <h3 className="font-semibold text-neutral-800">League Chat</h3>
          <span className="text-sm text-neutral-400">{messages?.length || 0} messages</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {Object.keys(groupedMessages).length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-neutral-300 mb-3" />
            <p className="text-neutral-500 font-medium">No messages yet</p>
            <p className="text-sm text-neutral-400">Be the first to say something!</p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, dateMessages]) => (
            <div key={date}>
              {/* Date separator */}
              <div className="flex items-center gap-4 my-4">
                <div className="flex-1 h-px bg-cream-200" />
                <span className="text-xs text-neutral-400 font-medium">
                  {formatDate(dateMessages[0].created_at)}
                </span>
                <div className="flex-1 h-px bg-cream-200" />
              </div>

              {/* Messages for this date */}
              {dateMessages.map((msg, idx) => {
                const isOwn = msg.user_id === user?.id;
                const showAvatar = idx === 0 || dateMessages[idx - 1].user_id !== msg.user_id;

                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''} ${showAvatar ? 'mt-4' : 'mt-1'}`}
                  >
                    {/* Avatar placeholder */}
                    <div className={`w-8 flex-shrink-0 ${!showAvatar ? 'invisible' : ''}`}>
                      {showAvatar && (
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold ${
                            isOwn ? 'bg-burgundy-500' : 'bg-neutral-400'
                          }`}
                        >
                          {(msg.user as any)?.display_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                    </div>

                    {/* Message bubble */}
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'}`}>
                      {showAvatar && !isOwn && (
                        <p className="text-xs text-neutral-500 mb-1 ml-1">
                          {(msg.user as any)?.display_name || 'Unknown'}
                        </p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-burgundy-500 text-white rounded-br-md'
                            : 'bg-cream-100 text-neutral-800 rounded-bl-md'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                      </div>
                      <p
                        className={`text-xs text-neutral-400 mt-1 ${isOwn ? 'text-right mr-1' : 'ml-1'}`}
                      >
                        {formatTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-cream-200 bg-cream-50">
        <div className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2 rounded-full border border-cream-300 bg-white focus:outline-none focus:ring-2 focus:ring-burgundy-500 focus:border-transparent"
            disabled={sendMessage.isPending}
          />
          <button
            type="submit"
            disabled={!message.trim() || sendMessage.isPending}
            className="w-10 h-10 rounded-full bg-burgundy-500 text-white flex items-center justify-center hover:bg-burgundy-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMessage.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
