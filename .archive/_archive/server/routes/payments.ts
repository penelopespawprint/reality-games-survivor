import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "../prisma.js";
import { authenticate, requireAdmin } from "../middleware.js";
import { paymentLogger, logError } from "../logger.js";

const router = Router();

// Validate Stripe environment variables at startup
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const isProduction = process.env.NODE_ENV === "production";

if (isProduction) {
  if (!stripeSecretKey) {
    paymentLogger.fatal("STRIPE_SECRET_KEY is required in production");
    process.exit(1);
  }
  if (!stripeWebhookSecret) {
    paymentLogger.fatal("STRIPE_WEBHOOK_SECRET is required in production");
    process.exit(1);
  }
  paymentLogger.info("Stripe configuration validated");
} else {
  if (!stripeSecretKey) {
    paymentLogger.warn("STRIPE_SECRET_KEY not set - payment routes will fail");
  }
  if (!stripeWebhookSecret) {
    paymentLogger.warn("STRIPE_WEBHOOK_SECRET not set - webhooks will fail");
  }
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: "2025-12-15.clover" })
  : null;

/**
 * Create Stripe Checkout Session for league entry fee
 * POST /api/payments/create-checkout
 */
router.post("/create-checkout", authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { leagueId } = req.body;

  if (!stripe) {
    return res.status(503).json({ error: "Payment system not configured" });
  }

  if (!leagueId) {
    return res.status(400).json({ error: "leagueId is required" });
  }

  try {
    // Get league details
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    if (!league.entryFee || Number(league.entryFee) === 0) {
      return res.status(400).json({ error: "This league has no entry fee" });
    }

    // Check if user is already a member
    const existingMembership = await prisma.leagueMembership.findUnique({
      where: { userId_leagueId: { userId, leagueId } },
    });

    if (existingMembership) {
      return res.status(400).json({ error: "You are already a member of this league" });
    }

    // Check if user already paid for this league
    const existingPayment = await prisma.payment.findFirst({
      where: {
        userId,
        leagueId,
        status: "COMPLETED",
      },
    });

    if (existingPayment) {
      return res.status(400).json({ error: "You have already paid for this league" });
    }

    // Get user details for prefill
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${league.name} - Entry Fee`,
              description: league.charityEnabled
                ? `Entry fee for ${league.name}. ${league.charityPercentage || 100}% goes to the winner's chosen charity!`
                : `Entry fee for ${league.name}`,
            },
            unit_amount: Math.round(Number(league.entryFee) * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL || "http://localhost:5050"}/join-success?session_id={CHECKOUT_SESSION_ID}&league_id=${leagueId}`,
      cancel_url: `${process.env.FRONTEND_URL || "http://localhost:5050"}/join-league?cancelled=true&league_id=${leagueId}`,
      customer_email: user?.email,
      metadata: {
        userId,
        leagueId,
        leagueName: league.name,
        charityEnabled: String(league.charityEnabled),
      },
    });

    // Create pending payment record
    await prisma.payment.create({
      data: {
        userId,
        leagueId,
        amount: league.entryFee,
        stripePaymentId: session.payment_intent as string || `pending_${session.id}`,
        stripeSessionId: session.id,
        status: "PENDING",
        metadata: {
          sessionId: session.id,
          charityEnabled: league.charityEnabled,
        },
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    logError(paymentLogger, error, { userId, leagueId, context: "create_checkout" });
    res.status(500).json({ error: "Failed to create payment session" });
  }
});

/**
 * Stripe Webhook Handler
 * POST /api/payments/webhook
 */
router.post("/webhook", async (req: Request, res: Response) => {
  if (!stripe) {
    return res.status(503).json({ error: "Payment system not configured" });
  }

  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    paymentLogger.error("STRIPE_WEBHOOK_SECRET not set");
    return res.status(500).json({ error: "Webhook secret not configured" });
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(
      req.body, // Must be raw body
      sig,
      webhookSecret
    );
  } catch (err: any) {
    paymentLogger.warn({ error: err.message }, "Webhook signature verification failed");
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const { userId, leagueId } = session.metadata || {};

      if (!userId || !leagueId) {
        paymentLogger.error({ sessionId: session.id }, "Missing metadata in checkout session");
        break;
      }

      try {
        // Update payment status
        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: {
            status: "COMPLETED",
            stripePaymentId: session.payment_intent as string,
          },
        });

        // Add user to league
        await prisma.leagueMembership.create({
          data: {
            userId,
            leagueId,
            role: "MEMBER",
          },
        });

        // Update league player count
        await prisma.league.update({
          where: { id: leagueId },
          data: {
            currentPlayers: { increment: 1 },
          },
        });

        paymentLogger.info({ userId, leagueId }, "Payment completed, user joined league");
      } catch (dbError) {
        logError(paymentLogger, dbError, { userId, leagueId, context: "process_payment" });
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Mark payment as failed
      await prisma.payment.updateMany({
        where: { stripeSessionId: session.id },
        data: { status: "FAILED" },
      });

      paymentLogger.info({ sessionId: session.id }, "Checkout session expired");
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      // Mark payment as refunded
      await prisma.payment.updateMany({
        where: { stripePaymentId: paymentIntentId },
        data: { status: "REFUNDED" },
      });

      paymentLogger.info({ paymentIntentId }, "Payment refunded");
      break;
    }

    default:
      paymentLogger.debug({ eventType: event.type }, "Unhandled webhook event");
  }

  res.json({ received: true });
});

/**
 * Verify payment and join league (for success page)
 * POST /api/payments/verify-and-join
 */
router.post("/verify-and-join", authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  const { sessionId, leagueId } = req.body;

  if (!sessionId || !leagueId) {
    return res.status(400).json({ error: "sessionId and leagueId are required" });
  }

  try {
    // Check for completed payment
    const payment = await prisma.payment.findFirst({
      where: {
        userId,
        leagueId,
        stripeSessionId: sessionId,
        status: "COMPLETED",
      },
    });

    if (!payment) {
      return res.status(400).json({ error: "Payment not found or not completed" });
    }

    // Check/create membership (might already exist from webhook)
    let membership = await prisma.leagueMembership.findUnique({
      where: { userId_leagueId: { userId, leagueId } },
    });

    if (!membership) {
      membership = await prisma.leagueMembership.create({
        data: {
          userId,
          leagueId,
          role: "MEMBER",
        },
      });

      await prisma.league.update({
        where: { id: leagueId },
        data: { currentPlayers: { increment: 1 } },
      });
    }

    const league = await prisma.league.findUnique({
      where: { id: leagueId },
    });

    res.json({
      success: true,
      league,
      membership,
    });
  } catch (error: any) {
    logError(paymentLogger, error, { context: "verify_payment" });
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

/**
 * Get user's payment history
 * GET /api/payments/my-payments
 */
router.get("/my-payments", authenticate, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;

  try {
    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        league: {
          select: { id: true, name: true, code: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ payments });
  } catch (error) {
    logError(paymentLogger, error, { userId, context: "fetch_payments" });
    res.status(500).json({ error: "Failed to fetch payment history" });
  }
});

// =============================================================================
// Admin Routes
// =============================================================================

/**
 * Get all pending charity payouts (admin)
 * GET /api/payments/admin/pending-payouts
 */
router.get("/admin/pending-payouts", authenticate, requireAdmin, async (req: Request, res: Response) => {
  try {
    const payouts = await prisma.charityPayout.findMany({
      where: { payoutStatus: "PENDING" },
      include: {
        league: { select: { id: true, name: true, code: true } },
        winner: { select: { id: true, name: true, email: true, favoriteCharity: true, charityUrl: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate total pot per league
    const leagueStats = await Promise.all(
      payouts.map(async (payout) => {
        const totalPaid = await prisma.payment.aggregate({
          where: {
            leagueId: payout.leagueId,
            status: "COMPLETED",
          },
          _sum: { amount: true },
        });

        return {
          ...payout,
          totalPot: totalPaid._sum.amount || 0,
        };
      })
    );

    res.json({ payouts: leagueStats });
  } catch (error) {
    logError(paymentLogger, error, { context: "fetch_pending_payouts" });
    res.status(500).json({ error: "Failed to fetch pending payouts" });
  }
});

/**
 * Mark charity payout as paid (admin)
 * POST /api/payments/admin/mark-paid
 */
router.post("/admin/mark-paid", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const adminId = (req as any).user?.id;
  const { payoutId, notes } = req.body;

  if (!payoutId) {
    return res.status(400).json({ error: "payoutId is required" });
  }

  try {
    const payout = await prisma.charityPayout.update({
      where: { id: payoutId },
      data: {
        payoutStatus: "PAID",
        paidAt: new Date(),
        paidByAdminId: adminId,
        notes: notes || null,
      },
      include: {
        league: { select: { name: true } },
        winner: { select: { name: true, email: true } },
      },
    });

    paymentLogger.info({ payoutId, charityName: payout.charityName, amount: payout.amount, adminId }, "Charity payout marked as paid");

    res.json({ success: true, payout });
  } catch (error) {
    logError(paymentLogger, error, { payoutId, adminId, context: "mark_payout_paid" });
    res.status(500).json({ error: "Failed to update payout status" });
  }
});

/**
 * Create charity payout record (typically at season end)
 * POST /api/payments/admin/create-payout
 */
router.post("/admin/create-payout", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { leagueId, winnerUserId, charityName, charityUrl, amount } = req.body;

  if (!leagueId || !winnerUserId || !charityName || !amount) {
    return res.status(400).json({
      error: "leagueId, winnerUserId, charityName, and amount are required",
    });
  }

  try {
    const payout = await prisma.charityPayout.create({
      data: {
        leagueId,
        winnerUserId,
        charityName,
        charityUrl,
        amount,
        payoutStatus: "PENDING",
      },
      include: {
        league: { select: { name: true } },
        winner: { select: { name: true, email: true } },
      },
    });

    paymentLogger.info({ leagueId, charityName, amount, winnerName: payout.winner.name }, "Charity payout created");

    res.json({ success: true, payout });
  } catch (error) {
    logError(paymentLogger, error, { leagueId, charityName, context: "create_payout" });
    res.status(500).json({ error: "Failed to create payout record" });
  }
});

/**
 * Get league payment stats (admin)
 * GET /api/payments/admin/league/:leagueId/stats
 */
router.get("/admin/league/:leagueId/stats", authenticate, requireAdmin, async (req: Request, res: Response) => {
  const { leagueId } = req.params;

  try {
    const [league, payments, payouts] = await Promise.all([
      prisma.league.findUnique({
        where: { id: leagueId },
        select: {
          id: true,
          name: true,
          entryFee: true,
          charityEnabled: true,
          charityPercentage: true,
          currentPlayers: true,
        },
      }),
      prisma.payment.findMany({
        where: { leagueId, status: "COMPLETED" },
        select: { amount: true, createdAt: true },
      }),
      prisma.charityPayout.findMany({
        where: { leagueId },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    const charityAmount = league.charityEnabled
      ? (totalCollected * (league.charityPercentage || 100)) / 100
      : 0;

    res.json({
      league,
      stats: {
        totalPayments: payments.length,
        totalCollected,
        charityAmount,
        payoutHistory: payouts,
      },
    });
  } catch (error) {
    logError(paymentLogger, error, { leagueId, context: "fetch_league_stats" });
    res.status(500).json({ error: "Failed to fetch stats" });
  }
});

export default router;
