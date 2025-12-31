/**
 * Trivia Page - 24 Questions with 24h Lockout
 *
 * Users must be logged in or submit email to play.
 * Shows leaderboard when user gets wrong answer or completes all 24.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Loader2, AlertCircle, Mail, LogIn, Trophy, CheckCircle, Lightbulb } from 'lucide-react';
import { apiWithAuth, api } from '@/lib/api';
import {
  TriviaRulesCard,
  TriviaTorchProgress,
  TriviaLockoutCard,
  TriviaCompletionCard,
  TriviaQuestionCard,
  TriviaCTACard,
  TriviaLeaderboardModal,
} from '@/components/trivia';

interface TriviaQuestion {
  id: string;
  questionNumber: number;
  question: string;
  options: string[];
}

interface TriviaResponse {
  question: TriviaQuestion | null;
  progress: {
    totalQuestions: number;
    questionsAnswered: number;
    questionsCorrect: number;
  };
  alreadyAnswered: boolean;
  userAnswer: {
    selectedIndex: number;
    isCorrect: boolean;
    answeredAt: string;
    correctIndex: number;
  } | null;
  funFact: string | null;
  isLocked: boolean;
  lockedUntil: string | null;
  isComplete: boolean;
  daysToComplete: number | null;
}

interface ProgressData {
  totalQuestions: number;
  questionsAnswered: number;
  questionsCorrect: number;
  isLocked: boolean;
  lockedUntil: string | null;
  isComplete: boolean;
  daysToComplete: number | null;
}

interface TriviaQuestionWithAnswer {
  id: string;
  questionNumber: number;
  question: string;
  options: string[];
  correctIndex: number;
  correctAnswer: string;
  funFact: string | null;
}

const WRONG_MESSAGES = [
  "It's time for you to go.",
  'The Tribe Has Spoken.',
  'Your torch has been snuffed.',
  'Time for you to go.',
  'Blindsided!',
  "That's a vote against you.",
  "You've been voted out of the trivia.",
  'Grab your torch and head out.',
  "You didn't have the numbers.",
  "Should've played your idol.",
  'The jury saw right through that.',
  'Outplayed. Outwitted. Outlasted... by this quiz.',
  'Drop your buff.',
  'The tribe has spoken... and they said no.',
  'Not immunity-worthy.',
];

export function Trivia() {
  const { user, loading: authLoading, session } = useAuth();
  const queryClient = useQueryClient();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [funFact, setFunFact] = useState<string | null>(null);
  const [wrongMessage, setWrongMessage] = useState<string>("It's time for you to go.");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTitle, setLeaderboardTitle] = useState<string>('The Tribe Has Spoken');

  // Fetch next question and progress
  const {
    data: triviaData,
    isLoading: questionLoading,
    refetch: refetchQuestion,
  } = useQuery<TriviaResponse>({
    queryKey: ['trivia', 'next'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');
      const response = await apiWithAuth<TriviaResponse>('/trivia/next', session.access_token);
      if (response.error) throw new Error(response.error);
      if (!response.data) throw new Error('No data returned');
      return response.data;
    },
    enabled: !!user && !!session?.access_token,
    retry: false,
  });

  // Fetch progress separately
  const { data: progress } = useQuery<ProgressData>({
    queryKey: ['trivia', 'progress'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');
      const response = await apiWithAuth<ProgressData>('/trivia/progress', session.access_token);
      if (response.error) throw new Error(response.error);
      if (!response.data) throw new Error('No data returned');
      return response.data;
    },
    enabled: !!user && !!session?.access_token,
    refetchInterval: 60000,
  });

  // Fetch all questions (public - no auth required)
  const { data: allQuestionsData } = useQuery<{ questions: TriviaQuestionWithAnswer[] }>({
    queryKey: ['trivia', 'all-questions'],
    queryFn: async () => {
      const response = await api<{ questions: TriviaQuestionWithAnswer[] }>('/trivia/questions');
      if (response.error) throw new Error(response.error);
      if (!response.data) throw new Error('No data returned');
      return response.data;
    },
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Timer countdown
  useEffect(() => {
    if (
      !triviaData?.question ||
      triviaData.alreadyAnswered ||
      showResult ||
      isTimedOut ||
      triviaData.isLocked
    ) {
      return;
    }

    if (timeRemaining <= 0) {
      setIsTimedOut(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimedOut(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [
    timeRemaining,
    triviaData?.question,
    triviaData?.alreadyAnswered,
    triviaData?.isLocked,
    showResult,
    isTimedOut,
  ]);

  // Reset timer when new question loads
  useEffect(() => {
    if (triviaData?.question && !triviaData.alreadyAnswered && !triviaData.isLocked) {
      setTimeRemaining(20);
      setIsTimedOut(false);
      setShowResult(false);
      setSelectedIndex(null);
      setFunFact(null);
    }
    // Only reset when question ID changes, not when other triviaData fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [triviaData?.question?.id]);

  // Submit answer mutation
  interface AnswerResponse {
    isCorrect: boolean;
    correctIndex: number;
    funFact: string | null;
    isLocked: boolean;
    lockedUntil: string | null;
  }

  const submitAnswer = useMutation({
    mutationFn: async (selectedIndex: number): Promise<AnswerResponse> => {
      if (!session?.access_token) throw new Error('Not authenticated');
      if (!triviaData?.question) throw new Error('No question available');

      const response = await apiWithAuth<AnswerResponse>('/trivia/answer', session.access_token, {
        method: 'POST',
        body: JSON.stringify({
          questionId: triviaData.question.id,
          selectedIndex,
        }),
      });
      if (response.error) throw new Error(response.error);
      if (!response.data) throw new Error('No data returned');
      return response.data;
    },
    onSuccess: (data) => {
      setIsCorrect(data.isCorrect);
      setFunFact(data.funFact || null);
      setShowResult(true);

      if (!data.isCorrect) {
        const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
        setWrongMessage(msg);
        setLeaderboardTitle(msg);
        // Show leaderboard after a brief delay when wrong
        setTimeout(() => {
          setShowLeaderboard(true);
        }, 2000);
      }

      queryClient.invalidateQueries({ queryKey: ['trivia', 'next'] });
      queryClient.invalidateQueries({ queryKey: ['trivia', 'progress'] });
    },
  });

  const handleTimeout = useCallback(() => {
    if (triviaData?.question && !triviaData.alreadyAnswered && !showResult) {
      setWrongMessage(WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)]);
      submitAnswer.mutate(-1);
    }
  }, [triviaData?.question, triviaData?.alreadyAnswered, showResult, submitAnswer]);

  // Handle timeout when timer reaches 0
  useEffect(() => {
    if (isTimedOut && triviaData?.question && !triviaData.alreadyAnswered && !showResult) {
      handleTimeout();
    }
  }, [isTimedOut, triviaData?.question, triviaData?.alreadyAnswered, showResult, handleTimeout]);

  const handleAnswer = (index: number) => {
    if (triviaData?.alreadyAnswered || showResult || isTimedOut || triviaData?.isLocked) return;
    setSelectedIndex(index);
    submitAnswer.mutate(index);
  };

  // Auto-advance to next question
  useEffect(() => {
    if (showResult && !triviaData?.isLocked && isCorrect) {
      const timer = setTimeout(() => {
        refetchQuestion();
        setShowResult(false);
        setSelectedIndex(null);
        setIsTimedOut(false);
        setTimeRemaining(20);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [showResult, triviaData?.isLocked, isCorrect, refetchQuestion]);

  // Show leaderboard when completing all 24 questions
  useEffect(() => {
    if (triviaData?.isComplete || progress?.isComplete) {
      setLeaderboardTitle('🏆 Trivia Champion!');
      setWrongMessage('You completed all 24 questions!');
      setShowLeaderboard(true);
    }
  }, [triviaData?.isComplete, progress?.isComplete]);

  // Show auth gate if not logged in
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="flex-1 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-6 shadow-lg">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl font-display font-bold text-neutral-800 mb-4">
              Survivor Trivia Challenge
            </h1>
            <p className="text-lg text-neutral-600 max-w-md mx-auto">
              Answer 24 questions to prove you're the ultimate Survivor fan. Get one wrong? Come
              back in 24 hours!
            </p>
          </div>

          {/* Rules Preview */}
          <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-8">
            <h2 className="text-xl font-semibold text-neutral-800 mb-4">How It Works</h2>
            <ul className="space-y-3 text-neutral-600">
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">1.</span>
                <span>Answer 24 Survivor trivia questions</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">2.</span>
                <span>You have 20 seconds per question</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">3.</span>
                <span>Get one wrong = 24 hour lockout</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-orange-500 font-bold">4.</span>
                <span>Complete all 24 to join the leaderboard!</span>
              </li>
            </ul>
          </div>

          {/* Auth Options */}
          <div className="bg-white rounded-2xl shadow-card p-8 border-2 border-burgundy-200 mb-8">
            <h2 className="text-xl font-semibold text-neutral-800 mb-6 text-center">
              Sign in to play
            </h2>

            <div className="space-y-4">
              <Link
                to="/login"
                state={{ from: '/trivia' }}
                className="flex items-center justify-center gap-3 w-full py-4 bg-gradient-to-r from-burgundy-600 to-burgundy-700 text-white font-semibold rounded-xl hover:from-burgundy-500 hover:to-burgundy-600 transition-all shadow-lg"
              >
                <LogIn className="h-5 w-5" />
                Sign In
              </Link>

              <Link
                to="/signup"
                state={{ from: '/trivia' }}
                className="flex items-center justify-center gap-3 w-full py-4 bg-white text-burgundy-600 font-semibold rounded-xl border-2 border-burgundy-200 hover:bg-burgundy-50 transition-all"
              >
                <Mail className="h-5 w-5" />
                Create Account
              </Link>
            </div>

            <p className="text-sm text-neutral-500 text-center mt-6">
              Your progress is saved to your account so you can continue anytime.
            </p>
          </div>

          {/* All Questions Section - Always expanded */}
          {allQuestionsData?.questions && (
            <div>
              <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-neutral-800">
                      All 24 Trivia Questions
                    </h3>
                    <p className="text-sm text-neutral-500">Study up before you play!</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {allQuestionsData.questions.map((q) => (
                  <div
                    key={q.id}
                    className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden p-4"
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <span className="flex-shrink-0 w-8 h-8 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {q.questionNumber}
                      </span>
                      <p className="text-neutral-800 font-medium flex-1">{q.question}</p>
                    </div>

                    <div className="space-y-2 mb-4 ml-11">
                      {q.options.map((option, idx) => (
                        <div
                          key={idx}
                          className={`p-3 rounded-lg flex items-center gap-2 ${
                            idx === q.correctIndex
                              ? 'bg-green-50 border border-green-200'
                              : 'bg-neutral-50 border border-neutral-100'
                          }`}
                        >
                          {idx === q.correctIndex && (
                            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                          )}
                          <span
                            className={
                              idx === q.correctIndex
                                ? 'text-green-800 font-medium'
                                : 'text-neutral-600'
                            }
                          >
                            {option}
                          </span>
                        </div>
                      ))}
                    </div>

                    {q.funFact && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 ml-11">
                        <div className="flex items-start gap-2">
                          <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-amber-800">{q.funFact}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while auth is initializing OR while waiting for session to load trivia data
  const isWaitingForSession = user && !session?.access_token;
  const isLoadingTrivia = user && session?.access_token && questionLoading;

  if (authLoading || isWaitingForSession || isLoadingTrivia) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
        <Navigation />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  const question = triviaData?.question;
  const alreadyAnswered = triviaData?.alreadyAnswered;
  const userAnswer = triviaData?.userAnswer;
  const isLocked = triviaData?.isLocked || progress?.isLocked;
  const lockedUntil = triviaData?.lockedUntil || progress?.lockedUntil;
  const isComplete = triviaData?.isComplete || progress?.isComplete;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cream-100 to-cream-200 flex flex-col">
      <Navigation />

      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Rules Card */}
        {!isLocked && !isComplete && <TriviaRulesCard />}

        {/* Torch Progress */}
        {progress && !isComplete && (
          <TriviaTorchProgress
            questionsAnswered={progress.questionsAnswered}
            totalQuestions={progress.totalQuestions}
            questionsCorrect={progress.questionsCorrect}
          />
        )}

        {/* Lockout Card */}
        {isLocked && lockedUntil && <TriviaLockoutCard lockedUntil={lockedUntil} />}

        {/* Completion Card */}
        {isComplete && progress?.daysToComplete && (
          <TriviaCompletionCard daysToComplete={progress.daysToComplete} />
        )}

        {/* Question Card */}
        {!isLocked && !isComplete && question && (
          <TriviaQuestionCard
            question={question}
            totalQuestions={progress?.totalQuestions || 24}
            timeRemaining={timeRemaining}
            selectedIndex={selectedIndex}
            showResult={showResult}
            isCorrect={isCorrect}
            isTimedOut={isTimedOut}
            alreadyAnswered={alreadyAnswered || false}
            userAnswer={userAnswer || null}
            correctIndex={submitAnswer.data?.correctIndex ?? userAnswer?.correctIndex ?? -1}
            funFact={funFact || triviaData?.funFact || null}
            wrongMessage={wrongMessage}
            isPending={submitAnswer.isPending}
            onAnswer={handleAnswer}
          />
        )}

        {/* No Question Available - Show all questions as study guide */}
        {!isLocked && !isComplete && !question && allQuestionsData?.questions && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-card p-6 border border-cream-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Lightbulb className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-neutral-800">
                    All 24 Trivia Questions
                  </h3>
                  <p className="text-sm text-neutral-500">Study up before you play!</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {allQuestionsData.questions.map((q) => (
                <div
                  key={q.id}
                  className="bg-white rounded-xl shadow-sm border border-cream-200 overflow-hidden p-4"
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="flex-shrink-0 w-8 h-8 bg-burgundy-100 text-burgundy-700 rounded-full flex items-center justify-center font-bold text-sm">
                      {q.questionNumber}
                    </span>
                    <p className="text-neutral-800 font-medium flex-1">{q.question}</p>
                  </div>

                  <div className="space-y-2 mb-4 ml-11">
                    {q.options.map((option, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg flex items-center gap-2 ${
                          idx === q.correctIndex
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-neutral-50 border border-neutral-100'
                        }`}
                      >
                        {idx === q.correctIndex && (
                          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                        )}
                        <span
                          className={
                            idx === q.correctIndex
                              ? 'text-green-800 font-medium'
                              : 'text-neutral-600'
                          }
                        >
                          {option}
                        </span>
                      </div>
                    ))}
                  </div>

                  {q.funFact && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 ml-11">
                      <div className="flex items-start gap-2">
                        <Lightbulb className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-amber-800">{q.funFact}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No questions at all */}
        {!isLocked && !isComplete && !question && !allQuestionsData?.questions && (
          <div className="bg-white rounded-2xl shadow-card p-12 border border-cream-200 text-center">
            <AlertCircle className="h-12 w-12 text-neutral-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-neutral-800 mb-2">No Questions Available</h3>
            <p className="text-neutral-500">Check back later for trivia questions!</p>
          </div>
        )}

        {/* CTA Card */}
        {!isComplete && <TriviaCTACard />}
      </main>

      <Footer />

      {/* Leaderboard Modal - shows when user gets wrong answer or completes */}
      <TriviaLeaderboardModal
        isOpen={showLeaderboard}
        onClose={() => setShowLeaderboard(false)}
        accessToken={session?.access_token || ''}
        currentUserId={user?.id}
        title={leaderboardTitle}
        subtitle={
          isComplete
            ? "You've joined the ranks of Survivor trivia masters!"
            : 'Your torch has been snuffed. Come back in 24 hours.'
        }
        isCompletion={isComplete || false}
      />
    </div>
  );
}

export default Trivia;
