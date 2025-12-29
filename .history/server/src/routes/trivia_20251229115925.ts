/**
 * Trivia Routes
 * Handles 24-question trivia with 24h lockout on wrong answer
 */
import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../middleware/authenticate.js';
import { supabaseAdmin } from '../config/supabase.js';
import { sendSuccess, sendValidationError, sendInternalError, sendForbidden } from '../lib/api-response.js';
import { EmailService } from '../emails/index.js';

const router = Router();

// GET /api/trivia/next - Get next unanswered question and progress
router.get('/next', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check if user is locked out
    const { data: lockoutCheck, error: lockoutError } = await supabaseAdmin.rpc('is_user_trivia_locked', {
      p_user_id: userId,
    });

    if (lockoutError) {
      console.error('Lockout check error:', lockoutError);
      return sendInternalError(res, 'Failed to check lockout status');
    }

    const isLocked = lockoutCheck?.[0]?.is_user_trivia_locked ?? false;

    if (isLocked) {
      // Get lockout expiration time
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('trivia_locked_until')
        .eq('id', userId)
        .single();

      return sendSuccess(res, {
        isLocked: true,
        lockedUntil: user?.trivia_locked_until || null,
        message: 'You got a question wrong! Come back in 24 hours to continue.',
      });
    }

    // Get progress
    const { data: progress, error: progressError } = await supabaseAdmin.rpc('get_trivia_progress', {
      p_user_id: userId,
    });

    if (progressError) {
      console.error('Progress error:', progressError);
      return sendInternalError(res, 'Failed to fetch progress');
    }

    const progressData = progress?.[0];

    // If all questions completed, return completion status
    if (progressData?.is_complete) {
      // Get leaderboard entry
      const { data: leaderboardEntry } = await supabaseAdmin
        .from('daily_trivia_leaderboard')
        .select('days_to_complete')
        .eq('user_id', userId)
        .single();

      return sendSuccess(res, {
        isComplete: true,
        questionsAnswered: progressData.questions_answered,
        questionsCorrect: progressData.questions_correct,
        daysToComplete: leaderboardEntry?.days_to_complete || null,
      });
    }

    // Get next unanswered question
    const { data: questionData, error: questionError } = await supabaseAdmin.rpc('get_next_trivia_question', {
      p_user_id: userId,
    });

    if (questionError) {
      console.error('Question error:', questionError);
      return sendInternalError(res, 'Failed to fetch question');
    }

    const question = questionData?.[0];

    if (!question) {
      return sendSuccess(res, {
        isComplete: true,
        questionsAnswered: progressData?.questions_answered || 0,
        questionsCorrect: progressData?.questions_correct || 0,
      });
    }

    // Check if user already answered this question (wrong answer)
    const { data: existingAnswer } = await supabaseAdmin
      .from('daily_trivia_answers')
      .select('selected_index, is_correct, answered_at')
      .eq('user_id', userId)
      .eq('question_id', question.id)
      .single();

    return sendSuccess(res, {
      question: {
        id: question.id,
        questionNumber: question.question_number,
        question: question.question,
        options: question.options,
        // Don't include castaway_name to avoid giving away answer
      },
      progress: {
        totalQuestions: progressData?.total_questions || 24,
        questionsAnswered: progressData?.questions_answered || 0,
        questionsCorrect: progressData?.questions_correct || 0,
      },
      alreadyAnswered: !!existingAnswer,
      userAnswer: existingAnswer
        ? {
            selectedIndex: existingAnswer.selected_index,
            isCorrect: existingAnswer.is_correct,
            answeredAt: existingAnswer.answered_at,
            correctIndex: question.correct_index,
          }
        : null,
      funFact: question.fun_fact,
      isLocked: false,
    });
  } catch (error) {
    console.error('Trivia next error:', error);
    return sendInternalError(res, 'Failed to fetch trivia question');
  }
});

// POST /api/trivia/answer - Submit answer to current question
router.post('/answer', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const { questionId, selectedIndex } = req.body;

    if (typeof questionId !== 'string' || typeof selectedIndex !== 'number') {
      return sendValidationError(res, 'Invalid request data');
    }

    // Check if user is locked out
    const { data: lockoutCheck } = await supabaseAdmin.rpc('is_user_trivia_locked', {
      p_user_id: userId,
    });

    const isLocked = lockoutCheck?.[0]?.is_user_trivia_locked ?? false;

    if (isLocked) {
      return sendForbidden(res, 'You are locked out for 24 hours after getting a question wrong');
    }

    // Get the question
    const { data: question, error: questionError } = await supabaseAdmin
      .from('daily_trivia_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !question) {
      return sendInternalError(res, 'Question not found');
    }

    // Check if already answered
    const { data: existingAnswer } = await supabaseAdmin
      .from('daily_trivia_answers')
      .select('id')
      .eq('user_id', userId)
      .eq('question_id', questionId)
      .single();

    if (existingAnswer) {
      return sendValidationError(res, 'You have already answered this question');
    }

    // Handle timeout (selectedIndex = -1)
    const isTimeout = selectedIndex === -1;
    const isCorrect = isTimeout ? false : selectedIndex === question.correct_index;

    // Check if this is user's first trivia answer (for welcome email)
    const { count: answerCount } = await supabaseAdmin
      .from('daily_trivia_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    const isFirstAnswer = (answerCount || 0) === 0;

    // Save answer
    const { error: insertError } = await supabaseAdmin.from('daily_trivia_answers').insert({
      user_id: userId,
      question_id: questionId,
      selected_index: isTimeout ? null : selectedIndex,
      is_correct: isCorrect,
    });

    if (insertError) {
      return sendInternalError(res, 'Failed to save answer');
    }

    // Send trivia welcome email on first answer
    if (isFirstAnswer) {
      try {
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('email, display_name')
          .eq('id', userId)
          .single();

        if (user?.email) {
          await EmailService.sendTriviaWelcome({
            displayName: user.display_name || 'Survivor Fan',
            email: user.email,
          });
        }
      } catch (emailErr) {
        console.error('Failed to send trivia welcome email:', emailErr);
        // Don't fail the request if email fails
      }
    }

    // If wrong answer, lock user out for 24 hours and increment attempts
    if (!isCorrect) {
      const lockoutUntil = new Date();
      lockoutUntil.setHours(lockoutUntil.getHours() + 24);

      // Get current attempts count
      const { data: userData } = await supabaseAdmin
        .from('users')
        .select('trivia_attempts')
        .eq('id', userId)
        .single();

      await supabaseAdmin
        .from('users')
        .update({
          trivia_locked_until: lockoutUntil.toISOString(),
          trivia_attempts: (userData?.trivia_attempts || 0) + 1,
        })
        .eq('id', userId);
    }

    // Update user's trivia stats
    const { data: progress } = await supabaseAdmin.rpc('get_trivia_progress', {
      p_user_id: userId,
    });

    const progressData = progress?.[0];

    await supabaseAdmin
      .from('users')
      .update({
        trivia_questions_answered: progressData?.questions_answered || 0,
        trivia_questions_correct: progressData?.questions_correct || 0,
      })
      .eq('id', userId);

    // Check if user completed all questions
    if (progressData?.is_complete && isCorrect) {
      // Calculate days to complete
      const { data: firstAnswer } = await supabaseAdmin
        .from('daily_trivia_answers')
        .select('answered_at')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .order('answered_at', { ascending: true })
        .limit(1)
        .single();

      const { data: lastAnswer } = await supabaseAdmin
        .from('daily_trivia_answers')
        .select('answered_at')
        .eq('user_id', userId)
        .eq('is_correct', true)
        .order('answered_at', { ascending: false })
        .limit(1)
        .single();

      if (firstAnswer && lastAnswer) {
        const startDate = new Date(firstAnswer.answered_at);
        const endDate = new Date(lastAnswer.answered_at);
        const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // Get user display name and attempts count
        const { data: userProfile } = await supabaseAdmin
          .from('users')
          .select('display_name, trivia_attempts')
          .eq('id', userId)
          .single();

        // Attempts = lockouts + 1 (the successful run)
        const attempts = (userProfile?.trivia_attempts || 0) + 1;

        // Update or insert leaderboard entry
        await supabaseAdmin
          .from('daily_trivia_leaderboard')
          .upsert({
            user_id: userId,
            display_name: userProfile?.display_name || 'Anonymous',
            days_to_complete: daysDiff,
            completed_at: lastAnswer.answered_at,
            attempts: attempts,
          }, {
            onConflict: 'user_id',
          });
      }
    }

    return sendSuccess(res, {
      isCorrect,
      correctIndex: question.correct_index,
      funFact: question.fun_fact,
      isTimeout,
      isLocked: !isCorrect, // Locked if wrong
      lockedUntil: !isCorrect ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : null,
    });
  } catch (error) {
    console.error('Trivia answer error:', error);
    return sendInternalError(res, 'Failed to submit answer');
  }
});

// GET /api/trivia/progress - Get user's progress
router.get('/progress', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    const { data: progress, error } = await supabaseAdmin.rpc('get_trivia_progress', {
      p_user_id: userId,
    });

    if (error) {
      console.error('Progress error:', error);
      return sendInternalError(res, 'Failed to fetch progress');
    }

    const progressData = progress?.[0];

    // Get leaderboard entry if complete
    let daysToComplete = null;
    if (progressData?.is_complete) {
      const { data: leaderboardEntry } = await supabaseAdmin
        .from('daily_trivia_leaderboard')
        .select('days_to_complete')
        .eq('user_id', userId)
        .single();

      daysToComplete = leaderboardEntry?.days_to_complete || null;
    }

    return sendSuccess(res, {
      totalQuestions: progressData?.total_questions || 24,
      questionsAnswered: progressData?.questions_answered || 0,
      questionsCorrect: progressData?.questions_correct || 0,
      isLocked: progressData?.is_locked || false,
      lockedUntil: progressData?.locked_until || null,
      isComplete: progressData?.is_complete || false,
      daysToComplete,
    });
  } catch (error) {
    console.error('Trivia progress error:', error);
    return sendInternalError(res, 'Failed to fetch progress');
  }
});

// GET /api/trivia/leaderboard - Get trivia leaderboard (public, but requires auth)
router.get('/leaderboard', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { data: leaderboard, error } = await supabaseAdmin
      .from('daily_trivia_leaderboard')
      .select('user_id, display_name, days_to_complete, attempts, completed_at')
      .order('days_to_complete', { ascending: true })
      .order('attempts', { ascending: true })
      .order('completed_at', { ascending: true })
      .limit(50);

    if (error) {
      console.error('Leaderboard error:', error);
      return sendInternalError(res, 'Failed to fetch leaderboard');
    }

    // Add rank to each entry
    const rankedLeaderboard = (leaderboard || []).map((entry, index) => ({
      rank: index + 1,
      displayName: entry.display_name,
      daysToComplete: entry.days_to_complete,
      attempts: entry.attempts || 1,
      completedAt: entry.completed_at,
      userId: entry.user_id,
    }));

    return sendSuccess(res, { leaderboard: rankedLeaderboard });
  } catch (error) {
    console.error('Trivia leaderboard error:', error);
    return sendInternalError(res, 'Failed to fetch leaderboard');
  }
});

export default router;
