/**
 * Trivia Page - 24 Questions with 24h Lockout
 *
 * Users must be logged in to play.
 * Shows leaderboard when user gets wrong answer or completes all 24.
 * 24 torches light up for each correct answer.
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Loader2, AlertCircle, Mail, LogIn, Trophy } from 'lucide-react';
import { apiWithAuth } from '@/lib/api';
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
  const [gameStarted, setGameStarted] = useState(false);
  const [questionReady, setQuestionReady] = useState(false); // User clicked "Start" for current question
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(20);
  const [timerActive, setTimerActive] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [funFact, setFunFact] = useState<string | null>(null);
  const [wrongMessage, setWrongMessage] = useState<string>("It's time for you to go.");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardTitle, setLeaderboardTitle] = useState<string>('The Tribe Has Spoken');

  // Track previous lockout state to detect when it changes
  const [wasLocked, setWasLocked] = useState(false);

  // Fetch progress first (needed for auto-start logic)
  const { data: progress } = useQuery<ProgressData>({
    queryKey: ['trivia', 'progress'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');
      const response = await apiWithAuth<{ data: ProgressData }>(
        '/trivia/progress',
        session.access_token
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) throw new Error('No data returned');
      return response.data.data;
    },
    enabled: !!user && !!session?.access_token,
    // Refetch more frequently when locked to detect when lockout expires
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data?.isLocked) {
        // Check every 30 seconds when locked to detect expiration
        return 30000;
      }
      return 60000;
    },
  });

  // Auto-start game if user already has progress (and not locked/complete)
  useEffect(() => {
    if (progress && progress.questionsAnswered > 0 && !progress.isLocked && !progress.isComplete) {
      setGameStarted(true);
    }
  }, [progress]);

  // Detect when lockout expires and refresh question state
  useEffect(() => {
    if (progress) {
      if (wasLocked && !progress.isLocked) {
        // Lockout just expired! Invalidate and refetch the next question
        console.log('Lockout expired, refreshing trivia state...');
        queryClient.invalidateQueries({ queryKey: ['trivia', 'next'] });
        // Reset local state
        setShowResult(false);
        setSelectedIndex(null);
        setIsTimedOut(false);
        setTimeRemaining(20);
        setQuestionReady(false);
        setTimerActive(false);
        setShowLeaderboard(false);
        // Auto-start the game again
        setGameStarted(true);
      }
      setWasLocked(progress.isLocked);
    }
  }, [progress?.isLocked, wasLocked, queryClient]);

  // Fetch next question (only when game is started)
  const {
    data: triviaData,
    isLoading: questionLoading,
    refetch: refetchQuestion,
  } = useQuery<TriviaResponse>({
    queryKey: ['trivia', 'next'],
    queryFn: async () => {
      if (!session?.access_token) throw new Error('Not authenticated');
      const response = await apiWithAuth<{ data: TriviaResponse }>(
        '/trivia/next',
        session.access_token
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) throw new Error('No data returned');
      return response.data.data;
    },
    enabled: !!user && !!session?.access_token && gameStarted,
    retry: false,
  });

  // Reset question state when a new question loads (but DON'T start timer yet)
  useEffect(() => {
    if (
      triviaData?.question &&
      !triviaData.alreadyAnswered &&
      !triviaData.isLocked &&
      gameStarted
    ) {
      setTimeRemaining(20);
      setIsTimedOut(false);
      setShowResult(false);
      setSelectedIndex(null);
      setFunFact(null);
      setQuestionReady(false); // Reset - user must click "Start" for this question
      setTimerActive(false); // Don't start timer until user clicks "Start"
    }
  }, [triviaData?.question?.id, gameStarted]);

  // Start timer only when user clicks "Start" for the question
  const handleStartQuestion = () => {
    setQuestionReady(true);
    setTimerActive(true);
  };

  // Timer countdown - only runs when timerActive is true
  useEffect(() => {
    if (!timerActive || showResult || isTimedOut) {
      return;
    }

    if (timeRemaining <= 0) {
      setIsTimedOut(true);
      setTimerActive(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          setIsTimedOut(true);
          setTimerActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining, timerActive, showResult, isTimedOut]);

  // Submit answer mutation
  interface AnswerResponse {
    isCorrect: boolean;
    correctIndex: number;
    funFact: string | null;
    isLocked: boolean;
    lockedUntil: string | null;
  }

  const submitAnswer = useMutation({
    mutationFn: async (answerIndex: number): Promise<AnswerResponse> => {
      if (!session?.access_token) throw new Error('Not authenticated');
      if (!triviaData?.question) throw new Error('No question available');

      const response = await apiWithAuth<{ data: AnswerResponse }>(
        '/trivia/answer',
        session.access_token,
        {
          method: 'POST',
          body: JSON.stringify({
            questionId: triviaData.question.id,
            selectedIndex: answerIndex,
          }),
        }
      );
      if (response.error) throw new Error(response.error);
      if (!response.data?.data) throw new Error('No data returned');
      return response.data.data;
    },
    onSuccess: (data) => {
      setTimerActive(false);
      setIsCorrect(data.isCorrect);
      setFunFact(data.funFact || null);
      setShowResult(true);

      if (!data.isCorrect) {
        const msg = WRONG_MESSAGES[Math.floor(Math.random() * WRONG_MESSAGES.length)];
        setWrongMessage(msg);
        setLeaderboardTitle(msg);
        // Show leaderboard after showing the wrong answer for 3 seconds
        setTimeout(() => {
          setShowLeaderboard(true);
        }, 3000);
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
    setTimerActive(false);
    submitAnswer.mutate(index);
  };

  // Auto-advance to next question after correct answer
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
      setLeaderboardTitle('Trivia Champion!');
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
        </main>
        <Footer />
      </div>
    );
  }

  // Show loading while auth is initializing OR while waiting for session to load trivia data
  const isWaitingForSession = user && !session?.access_token;
  const isLoadingTrivia = user && session?.access_token && gameStarted && questionLoading;

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

        {/* Start Button - shown when game not started and not locked/complete */}
        {!gameStarted && !isLocked && !isComplete && (progress?.questionsAnswered || 0) === 0 && (
          <div className="bg-white rounded-2xl shadow-card p-8 border-2 border-burgundy-200 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full mb-6 shadow-lg">
              <Trophy className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-2xl font-display font-bold text-neutral-800 mb-4">
              Ready to Begin?
            </h2>
            <p className="text-neutral-600 mb-6 max-w-md mx-auto">
              You have 20 seconds per question. Get one wrong and you're locked out for 24 hours.
              Answer all 24 correctly to join the leaderboard!
            </p>
            <button
              onClick={() => setGameStarted(true)}
              className="px-8 py-4 bg-gradient-to-r from-burgundy-600 to-burgundy-700 text-white font-bold text-lg rounded-xl hover:from-burgundy-500 hover:to-burgundy-600 transition-all shadow-lg transform hover:scale-105"
            >
              Start Trivia Challenge
            </button>
            <p className="text-sm text-neutral-500 mt-4">Your progress is saved automatically.</p>
          </div>
        )}

        {/* Loading state when game started but question not loaded */}
        {gameStarted && !isLocked && !isComplete && questionLoading && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-burgundy-500 animate-spin" />
          </div>
        )}

        {/* Question Card */}
        {gameStarted && !isLocked && !isComplete && question && (
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
            questionReady={questionReady}
            onStartQuestion={handleStartQuestion}
          />
        )}

        {/* No questions available */}
        {gameStarted && !isLocked && !isComplete && !question && !questionLoading && (
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
