import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy,
  Users,
  Calendar,
  Star,
  Award,
  BookOpen,
  ArrowRight,
  Target,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useSiteCopy } from '@/lib/hooks/useSiteCopy';
import { EditableText } from '@/components/EditableText';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { AdminReorderControls } from '@/components/AdminReorderControls';
import { useEditMode } from '@/lib/hooks/useEditMode';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export default function HowToPlay() {
  const { user, isAdmin } = useAuth();
  const { getCopy } = useSiteCopy();
  const { isEditMode } = useEditMode();
  const queryClient = useQueryClient();

  // Fetch step order from database
  const { data: stepOrder } = useQuery({
    queryKey: ['how-to-play', 'step-order'],
    queryFn: async () => {
      const { data } = await supabase
        .from('site_copy')
        .select('content')
        .eq('key', 'how-to-play.step-order')
        .single();
      if (data?.content) {
        try {
          return JSON.parse(data.content) as number[];
        } catch {
          return [0, 1, 2, 3, 4, 5];
        }
      }
      return [0, 1, 2, 3, 4, 5];
    },
  });

  // Mutation to save step order
  const saveStepOrder = useMutation({
    mutationFn: async (newOrder: number[]) => {
      const { error } = await supabase
        .from('site_copy')
        .upsert({
          key: 'how-to-play.step-order',
          page: 'how-to-play',
          content: JSON.stringify(newOrder),
          is_active: true,
        }, { onConflict: 'key' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['how-to-play', 'step-order'] });
    },
  });

  const handleStepMoveUp = (currentIndex: number) => {
    if (!stepOrder || currentIndex === 0) return;
    const newOrder = [...stepOrder];
    [newOrder[currentIndex - 1], newOrder[currentIndex]] = [newOrder[currentIndex], newOrder[currentIndex - 1]];
    saveStepOrder.mutate(newOrder);
  };

  const handleStepMoveDown = (currentIndex: number) => {
    if (!stepOrder || currentIndex === stepOrder.length - 1) return;
    const newOrder = [...stepOrder];
    [newOrder[currentIndex], newOrder[currentIndex + 1]] = [newOrder[currentIndex + 1], newOrder[currentIndex]];
    saveStepOrder.mutate(newOrder);
  };

  const steps = [
    {
      icon: Users,
      title: getCopy('how-to-play.step1.title', 'Join or Create a League'),
      description: getCopy(
        'how-to-play.step1.description',
        'Play with friends in a private league or join a public one. Each league has its own leaderboard and bragging rights.'
      ),
    },
    {
      icon: Trophy,
      title: getCopy('how-to-play.step2.title', 'Rank Your Castaways'),
      description: getCopy(
        'how-to-play.step2.description',
        'After the first episode, participants rank all castaways 1-24. This determines who you get in the snake draft.'
      ),
    },
    {
      icon: Target,
      title: getCopy('how-to-play.step3.title', 'Get Your Team'),
      description: getCopy(
        'how-to-play.step3.description',
        'After the deadline, the system runs a snake draft. You get 2 castaways based on your draft position and rankings.'
      ),
    },
    {
      icon: Calendar,
      title: getCopy('how-to-play.step4.title', 'Make Weekly Picks (Starting/Benched)'),
      description: getCopy(
        'how-to-play.step4.description',
        'Each week, choose which of your 2 castaways to "start" for that episode. Only your starting castaway earns points - the other is benched.'
      ),
    },
    {
      icon: Star,
      title: getCopy('how-to-play.step5.title', 'Earn Points'),
      description: getCopy(
        'how-to-play.step5.description',
        "Points are based on your STARTING castaway's performance that week. Your benched castaway does not score."
      ),
      linkTo: '/scoring',
      linkText: 'View Full Scoring Rules →',
    },
    {
      icon: Award,
      title: getCopy('how-to-play.step6.title', 'Win Your League'),
      description: getCopy(
        'how-to-play.step6.description',
        'The player with the most total points at the end of the season wins! Track your progress on the leaderboard.'
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      {/* Hero Header */}
      <div className="px-6 py-10 text-center bg-gradient-to-b from-burgundy-50 to-transparent">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-3">
            <BookOpen className="h-9 w-9 text-burgundy-500" />
            <EditableText copyKey="how-to-play.header.title" as="h1" className="text-3xl md:text-4xl font-display font-bold text-neutral-800">
              {getCopy('how-to-play.header.title', 'How to Play')}
            </EditableText>
          </div>
          <EditableText copyKey="how-to-play.header.subtitle" as="p" className="text-neutral-600 text-lg max-w-2xl mx-auto">
            {getCopy(
              'how-to-play.header.subtitle',
              'Everything you need to know to dominate your league'
            )}
          </EditableText>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Quick Links - Moved to top */}
        <section className="mb-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              to="/scoring"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-burgundy-100 rounded-xl flex items-center justify-center">
                    <Star className="h-6 w-6 text-burgundy-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">Scoring Rules</h3>
                    <p className="text-neutral-500 text-sm">100+ ways to earn points</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-burgundy-500 transition-colors" />
              </div>
            </Link>
            <Link
              to="/sms-commands"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <MessageSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">SMS Commands</h3>
                    <p className="text-neutral-500 text-sm">Make picks via text</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-green-500 transition-colors" />
              </div>
            </Link>
            <Link
              to="/timeline"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">Weekly Timeline</h3>
                    <p className="text-neutral-500 text-sm">Know every deadline</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-amber-500 transition-colors" />
              </div>
            </Link>
            <Link
              to="/faq"
              className="bg-white rounded-2xl shadow-card border border-cream-200 p-6 hover:shadow-card-hover transition-shadow group"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-neutral-800">FAQ</h3>
                    <p className="text-neutral-500 text-sm">Common questions answered</p>
                  </div>
                </div>
                <ArrowRight className="h-5 w-5 text-neutral-400 group-hover:text-blue-500 transition-colors" />
              </div>
            </Link>
          </div>
        </section>

        {/* Steps Section */}
        <section className="mb-16">
          <EditableText copyKey="how-to-play.steps.section-title" as="h2" className="text-2xl font-display font-bold text-neutral-800 mb-8 text-center">
            {getCopy('how-to-play.steps.section-title', 'The Game in 6 Steps')}
          </EditableText>
          <div className="space-y-6">
            {(stepOrder || [0, 1, 2, 3, 4, 5]).map((originalIndex, displayIndex) => {
              const step = steps[originalIndex];
              if (!step) return null;
              return (
              <div
                key={originalIndex}
                className="bg-white rounded-2xl shadow-card border border-cream-200 overflow-hidden relative"
              >
                {isAdmin && isEditMode && (
                  <div className="absolute top-2 right-2 z-10">
                    <AdminReorderControls
                      index={displayIndex}
                      totalItems={steps.length}
                      onMoveUp={() => handleStepMoveUp(displayIndex)}
                      onMoveDown={() => handleStepMoveDown(displayIndex)}
                    />
                  </div>
                )}
                <div className="p-6 md:p-8">
                  <div className="flex items-start gap-4 md:gap-6">
                    <div className="flex-shrink-0 w-14 h-14 bg-burgundy-500 rounded-2xl flex items-center justify-center shadow-lg">
                      <step.icon className="h-7 w-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-burgundy-500 font-bold text-sm">
                          Step {displayIndex + 1}
                        </span>
                      </div>
                      <EditableText copyKey={`how-to-play.step${originalIndex + 1}.title`} as="h3" className="text-xl md:text-2xl font-display font-bold text-neutral-800 mb-2">
                        {step.title}
                      </EditableText>
                      <EditableText copyKey={`how-to-play.step${originalIndex + 1}.description`} as="p" className="text-neutral-600 mb-4">
                        {step.description}
                      </EditableText>
                      {'linkTo' in step && step.linkTo && (
                        <Link
                          to={step.linkTo}
                          className="inline-flex items-center gap-2 mt-2 text-burgundy-600 hover:text-burgundy-700 font-medium"
                        >
                          {step.linkText || 'Learn more'}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              );
            })}
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center pb-16">
          <div className="bg-gradient-to-r from-burgundy-500 to-burgundy-600 rounded-2xl p-8 md:p-12 text-white shadow-lg">
            <EditableText copyKey="how-to-play.cta.title" as="h2" className="text-2xl md:text-3xl font-display font-bold mb-4">
              {getCopy('how-to-play.cta.title', 'Ready to Play?')}
            </EditableText>
            <EditableText copyKey="how-to-play.cta.description" as="p" className="text-burgundy-100 mb-8 max-w-lg mx-auto text-lg">
              {getCopy(
                'how-to-play.cta.description',
                'Join Season 50: In the Hands of the Fans and prove you know more about Survivor strategy than your friends.'
              )}
            </EditableText>
            {user ? (
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-4 rounded-xl hover:bg-cream-100 transition-colors text-lg"
              >
                {getCopy('how-to-play.cta.button-logged-in', 'Go to Dashboard')}
                <ArrowRight className="h-5 w-5" />
              </Link>
            ) : (
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-burgundy-600 font-bold px-8 py-4 rounded-xl hover:bg-cream-100 transition-colors text-lg"
              >
                {getCopy('how-to-play.cta.button-logged-out', "Join Now - It's Free")}
                <ArrowRight className="h-5 w-5" />
              </Link>
            )}
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
