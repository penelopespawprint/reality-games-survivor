import { Router, Request, Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { stripe, STRIPE_WEBHOOK_SECRET } from '../config/stripe.js';
import { validateTwilioWebhook } from '../config/twilio.js';
import Stripe from 'stripe';
import { EmailService } from '../emails/index.js';

const router = Router();

// POST /webhooks/stripe - Handle Stripe events
router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === 'league_donation') {
          const { league_id, user_id } = session.metadata;

          // Check not already added
          const { data: existing } = await supabaseAdmin
            .from('league_members')
            .select('id')
            .eq('league_id', league_id)
            .eq('user_id', user_id)
            .single();

          if (!existing) {
            // Add user to league
            await supabaseAdmin.from('league_members').insert({
              league_id,
              user_id,
            });
          }

          // Record payment
          const amount = (session.amount_total || 0) / 100;
          await supabaseAdmin.from('payments').insert({
            user_id,
            league_id,
            amount,
            currency: session.currency || 'usd',
            stripe_session_id: session.id,
            stripe_payment_intent_id: session.payment_intent as string,
            status: 'completed',
          });

          console.log(`User ${user_id} joined league ${league_id} via payment`);

          // Send payment confirmation email
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, display_name')
            .eq('id', user_id)
            .single();

          const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('name')
            .eq('id', league_id)
            .single();

          if (user && league) {
            // Send payment confirmation email
            await EmailService.sendPaymentConfirmed({
              displayName: user.display_name,
              email: user.email,
              leagueName: league.name,
              leagueId: league_id,
              amount,
              date: new Date(),
            });

            // Also send league joined email
            const { data: leagueWithSeason } = await supabaseAdmin
              .from('leagues')
              .select('name, max_players, seasons(name, premiere_at, draft_deadline)')
              .eq('id', league_id)
              .single();

            const { count: memberCount } = await supabaseAdmin
              .from('league_members')
              .select('*', { count: 'exact', head: true })
              .eq('league_id', league_id);

            const season = (leagueWithSeason as any)?.seasons;
            if (season) {
              const premiereDate = new Date(season.premiere_at);
              const firstPickDue = new Date(premiereDate);
              firstPickDue.setDate(firstPickDue.getDate() + 7);
              firstPickDue.setHours(15, 0, 0, 0);

              await EmailService.sendLeagueJoined({
                displayName: user.display_name,
                email: user.email,
                leagueName: leagueWithSeason!.name,
                leagueId: league_id,
                seasonName: season.name,
                memberCount: memberCount || 1,
                maxMembers: leagueWithSeason!.max_players || 12,
                premiereDate: premiereDate,
                draftDeadline: new Date(season.draft_deadline),
                firstPickDue: firstPickDue,
              });
            }

            // Log notification
            await EmailService.logNotification(
              user_id,
              'email',
              `Payment received - ${league.name}`,
              `$${amount.toFixed(2)} payment confirmed for ${league.name}`
            );
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}`);
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        console.log(`Charge refunded: ${charge.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Error processing webhook:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// POST /webhooks/sms - Handle Twilio inbound SMS
router.post('/sms', async (req: Request, res: Response) => {
  try {
    // Validate Twilio webhook signature to prevent spoofing
    const twilioSignature = req.headers['x-twilio-signature'] as string;
    const webhookUrl = `${process.env.BASE_URL || 'https://api.rgfl.app'}/webhooks/sms`;

    if (!validateTwilioWebhook(twilioSignature, webhookUrl, req.body)) {
      console.warn('Invalid Twilio webhook signature - possible spoofing attempt');
      return res.status(403).send('Forbidden: Invalid signature');
    }

    // Twilio webhook payload (form-urlencoded)
    // From = sender phone, Body = message text
    const from = req.body.From;
    const text = req.body.Body;

    if (!from || !text) {
      return res.status(400).json({ error: 'Missing from or text' });
    }

    // Normalize phone number
    const phone = from.replace(/\D/g, '');

    // Find user by phone
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('phone', phone)
      .single();

    // Parse command
    const rawMessage = text.trim().toUpperCase();
    const parts = rawMessage.split(/\s+/);
    const command = parts[0];

    let response = '';
    let parsedData: any = { command, args: parts.slice(1) };

    switch (command) {
      case 'PICK': {
        if (!user) {
          response = 'Phone not registered. Visit rgfl.app to link your phone.';
          break;
        }

        const castawayName = parts.slice(1).join(' ');
        if (!castawayName) {
          response = 'Usage: PICK [castaway name]';
          break;
        }

        // Find castaway
        const { data: castaway } = await supabaseAdmin
          .from('castaways')
          .select('id, name')
          .ilike('name', `%${castawayName}%`)
          .eq('status', 'active')
          .single();

        if (!castaway) {
          response = `Castaway "${castawayName}" not found or eliminated.`;
          break;
        }

        parsedData.castaway = castaway;

        // Get user's leagues
        const { data: memberships } = await supabaseAdmin
          .from('league_members')
          .select('league_id')
          .eq('user_id', user.id);

        if (!memberships || memberships.length === 0) {
          response = 'You are not in any leagues.';
          break;
        }

        // Get current episode
        const { data: episode } = await supabaseAdmin
          .from('episodes')
          .select('id, number, picks_lock_at')
          .gte('picks_lock_at', new Date().toISOString())
          .order('picks_lock_at', { ascending: true })
          .limit(1)
          .single();

        if (!episode) {
          response = 'No episode currently accepting picks.';
          break;
        }

        // Submit picks for all leagues
        let pickCount = 0;
        for (const membership of memberships) {
          // Check user has castaway on roster
          const { data: roster } = await supabaseAdmin
            .from('rosters')
            .select('id')
            .eq('league_id', membership.league_id)
            .eq('user_id', user.id)
            .eq('castaway_id', castaway.id)
            .is('dropped_at', null)
            .single();

          if (roster) {
            await supabaseAdmin
              .from('weekly_picks')
              .upsert({
                league_id: membership.league_id,
                user_id: user.id,
                episode_id: episode.id,
                castaway_id: castaway.id,
                status: 'pending',
                picked_at: new Date().toISOString(),
              }, {
                onConflict: 'league_id,user_id,episode_id',
              });
            pickCount++;
          }
        }

        response = `Picked ${castaway.name} for Episode ${episode.number} in ${pickCount} league(s).`;
        break;
      }

      case 'STATUS': {
        if (!user) {
          response = 'Phone not registered. Visit rgfl.app to link your phone.';
          break;
        }

        // Get current picks
        const { data: picks } = await supabaseAdmin
          .from('weekly_picks')
          .select('castaways(name), leagues(name)')
          .eq('user_id', user.id)
          .order('picked_at', { ascending: false })
          .limit(5);

        if (!picks || picks.length === 0) {
          response = 'No recent picks found.';
        } else {
          response = 'Recent picks:\n' + picks.map((p: any) =>
            `${p.castaways?.name} - ${p.leagues?.name}`
          ).join('\n');
        }
        break;
      }

      case 'TEAM': {
        if (!user) {
          response = 'Phone not registered. Visit rgfl.app to link your phone.';
          break;
        }

        // Get roster
        const { data: rosters } = await supabaseAdmin
          .from('rosters')
          .select('castaways(name, status), leagues(name)')
          .eq('user_id', user.id)
          .is('dropped_at', null);

        if (!rosters || rosters.length === 0) {
          response = 'No castaways on roster.';
        } else {
          response = 'Your team:\n' + rosters.map((r: any) =>
            `${r.castaways?.name} (${r.castaways?.status}) - ${r.leagues?.name}`
          ).join('\n');
        }
        break;
      }

      case 'HELP':
        response = 'Commands:\nPICK [name] - Pick castaway\nSTATUS - View picks\nTEAM - View roster\nHELP - Show this';
        break;

      default:
        response = 'Unknown command. Text HELP for options.';
    }

    // Log command
    await supabaseAdmin.from('sms_commands').insert({
      phone,
      user_id: user?.id || null,
      command,
      raw_message: text,
      parsed_data: parsedData,
      response_sent: response,
    });

    // Respond with TwiML to send SMS reply
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(response)}</Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(twiml);
  } catch (err) {
    console.error('Error processing SMS webhook:', err);
    // Return empty TwiML on error
    res.set('Content-Type', 'text/xml');
    res.send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  }
});

// Helper to escape XML special characters
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export default router;
