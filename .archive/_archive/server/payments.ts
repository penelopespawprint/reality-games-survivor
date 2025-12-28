// server/payments.ts
import { Router, Request, Response } from "express";
import Stripe from "stripe";
import prisma from "./prisma.js";
import { authenticate, requireAdmin } from "./middleware.js";

const router = Router();

// Initialize Stripe with the API key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

// =============================================================================
// CREATE CHECKOUT SESSION - Start payment flow for joining a paid league
// POST /api/payments/create-checkout
// =============================================================================
router.post("/create-checkout", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { leagueId, successUrl, cancelUrl } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!leagueId) {
      return res.status(400).json({ error: "League ID is required" });
    }

    // Get the league details
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: {
        id: true,
        name: true,
        code: true,
        entryFee: true,
        charityEnabled: true,
        charityPercentage: true,
        currentPlayers: true,
        maxPlayers: true,
        status: true,
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    // Check if league is full
    if (league.currentPlayers >= league.maxPlayers) {
      return res.status(400).json({ error: "League is full" });
    }

    // Check if user is already a member
    const existingMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: { userId, leagueId },
      },
    });

    if (existingMembership) {
      return res.status(400).json({ error: "You are already a member of this league" });
    }

    // Get entry fee (default to 0 if not set)
    const entryFee = league.entryFee ? Number(league.entryFee) : 0;

    if (entryFee <= 0) {
      return res.status(400).json({ error: "This league has no entry fee. Join directly." });
    }

    // Get user email for Stripe
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, name: true },
    });

    // Build product description - mention 7% processing fee for charity leagues
    let description = `Entry fee for ${league.name}`;
    if (league.charityEnabled) {
      const charityPct = league.charityPercentage || 100;
      const netPct = Math.round(charityPct * 0.93); // After 7% processing fee
      description += ` (${netPct}% of pot goes to winner's charity after 7% processing fee)`;
    }

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: user?.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${league.name} Entry Fee`,
              description,
            },
            unit_amount: Math.round(entryFee * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      metadata: {
        userId,
        leagueId,
        leagueCode: league.code,
        charityEnabled: String(league.charityEnabled),
      },
      success_url: successUrl || `${process.env.CLIENT_ORIGIN}/join-success?session_id={CHECKOUT_SESSION_ID}&league_id=${leagueId}`,
      cancel_url: cancelUrl || `${process.env.CLIENT_ORIGIN}/join-league?code=${league.code}`,
    });

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        userId,
        leagueId,
        amount: entryFee,
        stripeSessionId: session.id,
        stripePaymentId: session.payment_intent as string || `pending_${session.id}`,
        status: "PENDING",
      },
    });

    res.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

// =============================================================================
// VERIFY AND JOIN - Called after successful payment to join the league
// POST /api/payments/verify-and-join
// =============================================================================
router.post("/verify-and-join", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { sessionId } = req.body;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Retrieve the session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return res.status(400).json({ error: "Payment not completed" });
    }

    const leagueId = session.metadata?.leagueId;
    const paymentUserId = session.metadata?.userId;

    // Verify the user matches
    if (paymentUserId !== userId) {
      return res.status(403).json({ error: "Payment does not belong to this user" });
    }

    if (!leagueId) {
      return res.status(400).json({ error: "League ID not found in session" });
    }

    // Check if already a member (idempotency)
    const existingMembership = await prisma.leagueMembership.findUnique({
      where: {
        userId_leagueId: { userId, leagueId },
      },
    });

    if (existingMembership) {
      return res.json({ success: true, message: "Already a member", alreadyMember: true });
    }

    // Update payment record and add user to league in a transaction
    await prisma.$transaction(async (tx) => {
      // Update payment status
      await tx.payment.updateMany({
        where: { stripeSessionId: sessionId },
        data: {
          status: "COMPLETED",
          stripePaymentId: session.payment_intent as string,
        },
      });

      // Add user to league
      await tx.leagueMembership.create({
        data: {
          userId,
          leagueId,
          role: "MEMBER",
        },
      });

      // Increment player count
      await tx.league.update({
        where: { id: leagueId },
        data: { currentPlayers: { increment: 1 } },
      });
    });

    res.json({ success: true, leagueId });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// =============================================================================
// STRIPE WEBHOOK - Handle Stripe events
// POST /api/payments/webhook
// Note: Raw body middleware is applied in index.ts before express.json()
// =============================================================================
router.post("/webhook", async (req: Request, res: Response) => {
    const sig = req.headers["stripe-signature"];

    if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(400).json({ error: "Missing signature or webhook secret" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.payment_status === "paid") {
          const userId = session.metadata?.userId;
          const leagueId = session.metadata?.leagueId;

          if (userId && leagueId) {
            // Check if already a member (webhook might fire after verify-and-join)
            const existingMembership = await prisma.leagueMembership.findUnique({
              where: {
                userId_leagueId: { userId, leagueId },
              },
            });

            if (!existingMembership) {
              await prisma.$transaction(async (tx) => {
                // Update payment status
                await tx.payment.updateMany({
                  where: { stripeSessionId: session.id },
                  data: {
                    status: "COMPLETED",
                    stripePaymentId: session.payment_intent as string,
                  },
                });

                // Add user to league
                await tx.leagueMembership.create({
                  data: {
                    userId,
                    leagueId,
                    role: "MEMBER",
                  },
                });

                // Increment player count
                await tx.league.update({
                  where: { id: leagueId },
                  data: { currentPlayers: { increment: 1 } },
                });
              });

              console.log(`Webhook: Added user ${userId} to league ${leagueId}`);
            }
          }
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;

        await prisma.payment.updateMany({
          where: { stripeSessionId: session.id },
          data: { status: "FAILED" },
        });

        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;

        await prisma.payment.updateMany({
          where: { stripePaymentId: charge.payment_intent as string },
          data: { status: "REFUNDED" },
        });

        console.log(`Charge refunded: ${charge.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  }
);

// =============================================================================
// MY PAYMENTS - Get user's payment history
// GET /api/payments/my-payments
// =============================================================================
router.get("/my-payments", authenticate, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const payments = await prisma.payment.findMany({
      where: { userId },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            code: true,
            charityEnabled: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(payments);
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

// =============================================================================
// ADMIN: PENDING PAYOUTS - Get all pending charity payouts
// GET /api/payments/admin/pending-payouts
// =============================================================================
router.get("/admin/pending-payouts", requireAdmin, async (_req: Request, res: Response) => {
  try {
    const payouts = await prisma.charityPayout.findMany({
      where: { payoutStatus: "PENDING" },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            code: true,
            charityPercentage: true,
          },
        },
        winner: {
          select: {
            id: true,
            name: true,
            email: true,
            favoriteCharity: true,
            charityUrl: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json(payouts);
  } catch (error) {
    console.error("Error fetching pending payouts:", error);
    res.status(500).json({ error: "Failed to fetch pending payouts" });
  }
});

// =============================================================================
// ADMIN: CREATE PAYOUT - Create a charity payout record
// POST /api/payments/admin/create-payout
// =============================================================================
router.post("/admin/create-payout", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { leagueId, winnerUserId, charityName, charityUrl, amount } = req.body;

    if (!leagueId || !winnerUserId || !charityName || !amount) {
      return res.status(400).json({
        error: "Missing required fields: leagueId, winnerUserId, charityName, amount"
      });
    }

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

    res.json(payout);
  } catch (error) {
    console.error("Error creating payout:", error);
    res.status(500).json({ error: "Failed to create payout" });
  }
});

// =============================================================================
// ADMIN: MARK PAID - Mark a charity payout as completed
// POST /api/payments/admin/mark-paid
// =============================================================================
router.post("/admin/mark-paid", requireAdmin, async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user?.id;
    const { payoutId, notes } = req.body;

    if (!payoutId) {
      return res.status(400).json({ error: "Payout ID is required" });
    }

    const payout = await prisma.charityPayout.update({
      where: { id: payoutId },
      data: {
        payoutStatus: "PAID",
        paidAt: new Date(),
        paidByAdminId: adminId,
        notes,
      },
      include: {
        league: { select: { name: true } },
        winner: { select: { name: true, email: true } },
      },
    });

    res.json(payout);
  } catch (error) {
    console.error("Error marking payout as paid:", error);
    res.status(500).json({ error: "Failed to mark payout as paid" });
  }
});

// =============================================================================
// LEAGUE PREVIEW - Get league info including entry fee (public endpoint)
// GET /api/payments/league/:code/preview
// =============================================================================
router.get("/league/:code/preview", async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const league = await prisma.league.findUnique({
      where: { code },
      select: {
        id: true,
        name: true,
        code: true,
        description: true,
        entryFee: true,
        charityEnabled: true,
        charityPercentage: true,
        maxPlayers: true,
        currentPlayers: true,
        status: true,
        isPasswordProtected: true,
      },
    });

    if (!league) {
      return res.status(404).json({ error: "League not found" });
    }

    // Calculate total pot if charity league
    let totalPot = 0;
    if (league.entryFee && Number(league.entryFee) > 0) {
      const paidMembers = await prisma.payment.count({
        where: {
          leagueId: league.id,
          status: "COMPLETED",
        },
      });
      totalPot = paidMembers * Number(league.entryFee);
    }

    // Calculate net pot after 7% processing fee
    const netPot = Math.round(totalPot * 0.93 * 100) / 100;

    res.json({
      ...league,
      entryFee: league.entryFee ? Number(league.entryFee) : 0,
      totalPot,
      netPot, // After 7% processing fee
      processingFee: 0.07, // 7% fee for transparency
      spotsRemaining: league.maxPlayers - league.currentPlayers,
    });
  } catch (error) {
    console.error("Error fetching league preview:", error);
    res.status(500).json({ error: "Failed to fetch league preview" });
  }
});

// =============================================================================
// ADMIN: ALL PAYMENTS - Get all payments for admin dashboard
// GET /api/payments/admin/all
// =============================================================================
router.get("/admin/all", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { status, leagueId } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (leagueId) where.leagueId = leagueId;

    const payments = await prisma.payment.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        league: {
          select: {
            id: true,
            name: true,
            code: true,
            charityEnabled: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary stats
    const stats = {
      totalPayments: payments.length,
      totalRevenue: payments
        .filter((p) => p.status === "COMPLETED")
        .reduce((sum, p) => sum + Number(p.amount), 0),
      pendingPayments: payments.filter((p) => p.status === "PENDING").length,
      refundedPayments: payments.filter((p) => p.status === "REFUNDED").length,
    };

    res.json({ payments, stats });
  } catch (error) {
    console.error("Error fetching all payments:", error);
    res.status(500).json({ error: "Failed to fetch payments" });
  }
});

export default router;
