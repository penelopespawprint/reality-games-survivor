/**
 * Announcements Card
 *
 * Displays announcements from the database with priority styling.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Megaphone, AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  is_active: boolean;
  created_at: string;
  expires_at: string | null;
}

export function AnnouncementsCard() {
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const now = new Date().toISOString();
      // Use raw query since announcements table may not be in generated types yet
      const { data, error } = await supabase
        .from('announcements' as any)
        .select('*')
        .eq('is_active', true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      return (data || []) as unknown as Announcement[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-card border border-cream-200 p-6">
        <div className="animate-pulse">
          <div className="h-5 w-32 bg-cream-200 rounded mb-4" />
          <div className="h-4 w-full bg-cream-100 rounded mb-2" />
          <div className="h-4 w-3/4 bg-cream-100 rounded" />
        </div>
      </div>
    );
  }

  if (!announcements || announcements.length === 0) {
    return null; // Don't show card if no announcements
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: AlertTriangle,
          iconColor: 'text-red-500',
          titleColor: 'text-red-700',
        };
      case 'high':
        return {
          bg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: Megaphone,
          iconColor: 'text-amber-500',
          titleColor: 'text-amber-700',
        };
      case 'medium':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: Info,
          iconColor: 'text-blue-500',
          titleColor: 'text-blue-700',
        };
      default:
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: CheckCircle2,
          iconColor: 'text-green-500',
          titleColor: 'text-green-700',
        };
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden">
      <div className="p-4 border-b border-cream-100 flex items-center gap-2">
        <Megaphone className="h-5 w-5 text-burgundy-500" />
        <h3 className="font-display font-bold text-neutral-800">Announcements</h3>
      </div>

      <div className="divide-y divide-cream-100">
        {announcements.map((announcement) => {
          const style = getPriorityStyle(announcement.priority);
          const Icon = style.icon;

          return (
            <div key={announcement.id} className={`p-4 ${style.bg} border-l-4 ${style.border}`}>
              <div className="flex items-start gap-3">
                <Icon className={`h-5 w-5 ${style.iconColor} flex-shrink-0 mt-0.5`} />
                <div className="flex-1 min-w-0">
                  <h4 className={`font-semibold ${style.titleColor} mb-1`}>{announcement.title}</h4>
                  <p className="text-neutral-600 text-sm line-clamp-2">{announcement.content}</p>
                  <p className="text-neutral-400 text-xs mt-2">
                    {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
