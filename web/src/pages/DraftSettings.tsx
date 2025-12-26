import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Settings,
  Users,
  Shuffle,
  GripVertical,
  Save,
  Loader2,
  AlertCircle,
  Check,
  Crown,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Navigation } from '@/components/Navigation';

export default function DraftSettings() {
  const { leagueId } = useParams<{ leagueId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draftOrder, setDraftOrder] = useState<string[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      return user;
    },
  });

  // Fetch league details
  const { data: league, isLoading: leagueLoading } = useQuery({
    queryKey: ['league', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('leagues')
        .select('*, seasons(*)')
        .eq('id', leagueId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!leagueId,
  });

  // Fetch league members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['league-members', leagueId],
    queryFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { data, error } = await supabase
        .from('league_members')
        .select('*, users(id, display_name, avatar_url)')
        .eq('league_id', leagueId)
        .order('draft_position', { ascending: true });
      if (error) throw error;

      // Initialize draft order from existing positions or member order
      const order = data?.map((m: any) => m.user_id) || [];
      if (draftOrder.length === 0 && order.length > 0) {
        setDraftOrder(order);
      }
      return data || [];
    },
    enabled: !!leagueId,
  });

  // Check if user is commissioner
  const isCommissioner = currentUser?.id === league?.commissioner_id;

  // Randomize draft order
  const randomizeDraftOrder = () => {
    const shuffled = [...draftOrder].sort(() => Math.random() - 0.5);
    setDraftOrder(shuffled);
    setHasChanges(true);
  };

  // Drag handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newOrder = [...draftOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(index, 0, draggedItem);
    setDraftOrder(newOrder);
    setDraggedIndex(index);
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Save draft order mutation
  const saveDraftOrder = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');

      // Update each member's draft position
      const updates = draftOrder.map((userId, index) =>
        supabase
          .from('league_members')
          .update({ draft_position: index + 1 })
          .eq('league_id', leagueId)
          .eq('user_id', userId)
      );

      const results = await Promise.all(updates);
      const error = results.find((r) => r.error)?.error;
      if (error) throw error;

      // Update league draft_order JSON
      const { error: leagueError } = await supabase
        .from('leagues')
        .update({ draft_order: draftOrder })
        .eq('id', leagueId);

      if (leagueError) throw leagueError;
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      queryClient.invalidateQueries({ queryKey: ['league-members', leagueId] });
    },
  });

  // Start draft mutation
  const startDraft = useMutation({
    mutationFn: async () => {
      if (!leagueId) throw new Error('No league ID');
      const { error } = await supabase
        .from('leagues')
        .update({
          draft_status: 'in_progress',
          draft_started_at: new Date().toISOString(),
          status: 'drafting',
        })
        .eq('id', leagueId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['league', leagueId] });
      navigate(`/leagues/${leagueId}/draft`);
    },
  });

  const getMemberByUserId = (userId: string) => {
    return members?.find((m: any) => m.user_id === userId);
  };

  const isLoading = leagueLoading || membersLoading;
  const canStartDraft = league?.draft_status === 'pending' && members && members.length >= 2;
  const draftAlreadyStarted = league?.draft_status !== 'pending';

  if (isLoading) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </div>
      </>
    );
  }

  if (!isCommissioner) {
    return (
      <>
        <Navigation />
        <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
          <div className="flex items-center gap-3 mb-6">
            <Link
              to={`/leagues/${leagueId}`}
              className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
            >
              <ArrowLeft className="h-5 w-5 text-neutral-600" />
            </Link>
            <h1 className="text-2xl font-display font-bold text-neutral-800">Draft Settings</h1>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-display font-bold text-neutral-800 mb-2">Access Denied</h2>
            <p className="text-neutral-600">Only the league creator can manage draft settings.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navigation />
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 p-4 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            to={`/leagues/${leagueId}/settings`}
            className="p-2 bg-white rounded-xl shadow-card hover:shadow-card-hover transition-all border border-cream-200"
          >
            <ArrowLeft className="h-5 w-5 text-neutral-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-bold text-neutral-800 flex items-center gap-2">
              <Settings className="h-6 w-6 text-burgundy-500" />
              Draft Settings
            </h1>
            <p className="text-neutral-500">{league?.name}</p>
          </div>
        </div>

        {/* Draft Status */}
        <div
          className={`rounded-2xl p-4 mb-6 ${
            draftAlreadyStarted
              ? 'bg-amber-50 border border-amber-200'
              : 'bg-green-50 border border-green-200'
          }`}
        >
          <div className="flex items-center gap-3">
            {draftAlreadyStarted ? (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            ) : (
              <Check className="h-5 w-5 text-green-600" />
            )}
            <div>
              <p
                className={`font-medium ${draftAlreadyStarted ? 'text-amber-800' : 'text-green-800'}`}
              >
                {draftAlreadyStarted
                  ? `Draft is ${league?.draft_status}`
                  : 'Draft has not started yet'}
              </p>
              <p className={`text-sm ${draftAlreadyStarted ? 'text-amber-600' : 'text-green-600'}`}>
                {draftAlreadyStarted
                  ? 'Draft order cannot be changed after the draft begins.'
                  : 'Set the draft order below before starting.'}
              </p>
            </div>
          </div>
        </div>

        {/* Draft Order */}
        <div className="bg-white rounded-2xl shadow-card border border-cream-200 mb-6">
          <div className="px-4 py-3 border-b border-cream-200 flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-neutral-800 flex items-center gap-2">
              <Users className="h-5 w-5 text-burgundy-500" />
              Draft Order
            </h2>
            {!draftAlreadyStarted && (
              <button
                onClick={randomizeDraftOrder}
                className="flex items-center gap-2 px-3 py-1.5 bg-burgundy-100 hover:bg-burgundy-200 text-burgundy-700 rounded-lg text-sm transition-colors"
              >
                <Shuffle className="h-4 w-4" />
                Randomize
              </button>
            )}
          </div>

          <div className="divide-y divide-cream-100">
            {draftOrder.map((userId, index) => {
              const member = getMemberByUserId(userId);
              const isCurrentUser = userId === currentUser?.id;

              return (
                <div
                  key={userId}
                  draggable={!draftAlreadyStarted}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    !draftAlreadyStarted ? 'cursor-grab active:cursor-grabbing' : ''
                  } ${draggedIndex === index ? 'bg-burgundy-50' : ''} ${
                    isCurrentUser ? 'bg-burgundy-50/50' : ''
                  }`}
                >
                  {!draftAlreadyStarted && (
                    <GripVertical className="h-5 w-5 text-neutral-400 flex-shrink-0" />
                  )}
                  <div className="w-8 h-8 bg-burgundy-500 rounded-full flex items-center justify-center text-white font-bold">
                    {index + 1}
                  </div>
                  {member?.users?.avatar_url ? (
                    <img
                      src={member.users.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-cream-100 rounded-full flex items-center justify-center border border-cream-200">
                      <Users className="h-5 w-5 text-neutral-400" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-neutral-800 font-medium flex items-center gap-2">
                      {member?.users?.display_name}
                      {userId === league?.commissioner_id && (
                        <Crown className="h-4 w-4 text-burgundy-500" />
                      )}
                    </p>
                    {isCurrentUser && <p className="text-burgundy-500 text-sm">You</p>}
                  </div>
                  <div className="text-neutral-500 text-sm">
                    Pick {index + 1} & {(members?.length || 0) * 2 - index}
                  </div>
                </div>
              );
            })}
          </div>

          {members?.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
              <p className="text-neutral-600">No members yet.</p>
              <p className="text-neutral-500 text-sm">Invite players to join your league.</p>
            </div>
          )}
        </div>

        {/* Snake Draft Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
          <h3 className="text-neutral-800 font-medium mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            Snake Draft Format
          </h3>
          <p className="text-neutral-600 text-sm">
            Each player drafts 2 castaways. Round 1 goes in order (1, 2, 3...), then Round 2
            reverses (...3, 2, 1). This ensures fairness by giving later picks an earlier second
            pick.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {!draftAlreadyStarted && (
            <>
              <button
                onClick={() => saveDraftOrder.mutate()}
                disabled={!hasChanges || saveDraftOrder.isPending}
                className="btn btn-primary w-full flex items-center justify-center gap-2"
              >
                {saveDraftOrder.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-5 w-5" />
                    Save Draft Order
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  if (confirm('Are you sure you want to start the draft? This cannot be undone.')) {
                    startDraft.mutate();
                  }
                }}
                disabled={!canStartDraft || startDraft.isPending || hasChanges}
                className="w-full bg-green-600 hover:bg-green-500 disabled:bg-neutral-300 disabled:text-neutral-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {startDraft.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Start Draft Now'
                )}
              </button>

              {hasChanges && (
                <p className="text-amber-600 text-sm text-center">
                  Save your changes before starting the draft.
                </p>
              )}
            </>
          )}

          {draftAlreadyStarted && (
            <Link
              to={`/leagues/${leagueId}/draft`}
              className="btn btn-primary w-full flex items-center justify-center gap-2"
            >
              Go to Draft Room
            </Link>
          )}
        </div>
      </div>
    </>
  );
}
