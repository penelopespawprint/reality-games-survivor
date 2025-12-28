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

          // SECURITY: Verify payment amount matches league fee
          const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('name, donation_amount, require_donation')
            .eq('id', league_id)
            .single();

          if (!league) {
            console.error(`League ${league_id} not found during payment verification`);
            throw new Error('League not found');
          }

          const paidAmount = (session.amount_total || 0) / 100;
          const expectedAmount = league.donation_amount;

          // Verify payment amount matches (allow 1 cent tolerance for rounding)
          if (!expectedAmount || Math.abs(paidAmount - expectedAmount) > 0.01) {
            console.error(`Payment amount mismatch: paid ${paidAmount}, expected ${expectedAmount}`);
            throw new Error('Payment amount mismatch');
          }

          // Use atomic database function to ensure both membership and payment are recorded together
          // This prevents race conditions where payment succeeds but membership fails
          const { data: result, error } = await supabaseAdmin.rpc('process_league_payment', {
            p_user_id: user_id,
            p_league_id: league_id,
            p_amount: paidAmount,
            p_currency: session.currency || 'usd',
            p_session_id: session.id,
            p_payment_intent_id: session.payment_intent as string,
          });

          if (error) {
            console.error('Failed to process league payment:', error);
            throw error;
          }

          console.log(`User ${user_id} joined league ${league_id} via payment (atomic, verified $${paidAmount})`);

          // Send payment confirmation email
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, display_name')
            .eq('id', user_id)
            .single();

          if (user && league) {
            // Send payment confirmation email
            await EmailService.sendPaymentConfirmed({
              displayName: user.display_name,
              email: user.email,
              leagueName: league.name,
              leagueId: league_id,
              amount: paidAmount,
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
              `$${paidAmount.toFixed(2)} payment confirmed for ${league.name}`
            );
          }
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);

        // Update payment status to failed
        await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_session_id', session.id);

        // SECURITY: Clean up leagues where commissioner never paid
        if (session.metadata?.type === 'league_donation') {
          const { user_id, league_id } = session.metadata;

          // Check if this was the commissioner's payment
          const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('commissioner_id, name, code')
            .eq('id', league_id)
            .single();

          if (league && league.commissioner_id === user_id) {
            // Check if commissioner ever became a member
            const { data: membership } = await supabaseAdmin
              .from('league_members')
              .select('id')
              .eq('league_id', league_id)
              .eq('user_id', user_id)
              .single();

            if (!membership) {
              // Commissioner never paid - check if league has any members
              const { count: memberCount } = await supabaseAdmin
                .from('league_members')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', league_id);

              if (!memberCount || memberCount === 0) {
                // No members - delete the abandoned league
                console.log(`Deleting abandoned league ${league_id} - commissioner never paid`);
                await supabaseAdmin
                  .from('leagues')
                  .delete()
                  .eq('id', league_id);
              }
            }
          }

          const { data: user } = await supabaseAdmin
            .from('users')
            .select('email, display_name')
            .eq('id', user_id)
            .single();

          if (user && league) {
            // Send payment recovery email
            await EmailService.sendPaymentRecovery({
              displayName: user.display_name,
              email: user.email,
              leagueName: league.name,
              leagueCode: league.code,
              amount: (session.amount_total || 0) / 100,
            });
          }
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed: ${paymentIntent.id}, reason: ${paymentIntent.last_payment_error?.message}`);

        // Find and update the payment record
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .update({ status: 'failed' })
          .eq('stripe_payment_intent_id', paymentIntent.id)
          .select('league_id, user_id')
          .single();

        // SECURITY: Clean up leagues where commissioner payment failed
        if (payment) {
          const { data: league } = await supabaseAdmin
            .from('leagues')
            .select('commissioner_id')
            .eq('id', payment.league_id)
            .single();

          if (league && league.commissioner_id === payment.user_id) {
            // Check if commissioner is a member (they shouldn't be)
            const { data: membership } = await supabaseAdmin
              .from('league_members')
              .select('id')
              .eq('league_id', payment.league_id)
              .eq('user_id', payment.user_id)
              .single();

            if (!membership) {
              // Check if league has any members
              const { count: memberCount } = await supabaseAdmin
                .from('league_members')
                .select('*', { count: 'exact', head: true })
                .eq('league_id', payment.league_id);

              if (!memberCount || memberCount === 0) {
                // No members - delete the abandoned league
                console.log(`Deleting abandoned league ${payment.league_id} - commissioner payment failed`);
                await supabaseAdmin
                  .from('leagues')
                  .delete()
                  .eq('id', payment.league_id);
              }
            }
          }
        }
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
      case 'STOP':
      case 'UNSUBSCRIBE':
      case 'CANCEL':
      case 'END':
      case 'QUIT': {
        // FCC/TCPA compliance - must respond immediately to STOP requests
        if (!user) {
          // Even if user not found, acknowledge the unsubscribe request
          response = "You've been unsubscribed from RGFL SMS. Reply START to resubscribe or visit rgfl.app to manage preferences.";
          parsedData.compliance_action = 'unsubscribe_no_user';
        } else {
          // Update user's SMS notification preference
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ notification_sms: false })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update SMS preference:', updateError);
            response = 'Error processing unsubscribe request. Please try again or contact support.';
            parsedData.compliance_action = 'unsubscribe_failed';
            parsedData.error = updateError.message;
          } else {
            response = "You've been unsubscribed from RGFL SMS. Reply START to resubscribe or visit rgfl.app to manage preferences.";
            parsedData.compliance_action = 'unsubscribe_success';

            // Log notification for compliance
            await EmailService.logNotification(
              user.id,
              'sms',
              'SMS Unsubscribe',
              `User unsubscribed via ${command} command`
            );
          }
        }
        break;
      }

      case 'START':
      case 'SUBSCRIBE':
      case 'UNSTOP': {
        // Re-enable SMS notifications
        if (!user) {
          response = 'Phone not registered. Visit rgfl.app to link your phone and enable SMS notifications.';
          parsedData.compliance_action = 'subscribe_no_user';
        } else {
          // Update user's SMS notification preference
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ notification_sms: true })
            .eq('id', user.id);

          if (updateError) {
            console.error('Failed to update SMS preference:', updateError);
            response = 'Error processing subscribe request. Please try again or contact support.';
            parsedData.compliance_action = 'subscribe_failed';
            parsedData.error = updateError.message;
          } else {
            response = "You've been subscribed to RGFL SMS notifications. Text STOP to unsubscribe anytime.";
            parsedData.compliance_action = 'subscribe_success';

            // Log notification for compliance
            await EmailService.logNotification(
              user.id,
              'sms',
              'SMS Subscribe',
              `User subscribed via ${command} command`
            );
          }
        }
        break;
      }

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

        // Find castaways matching the name (handle multiple matches gracefully)
        const { data: matchingCastaways, error: castawayError } = await supabaseAdmin
          .from('castaways')
          .select('id, name')
          .ilike('name', `%${castawayName}%`)
          .eq('status', 'active');

        if (castawayError) {
          console.error('Error searching castaways:', castawayError);
          response = 'Error searching for castaway. Please try again.';
          break;
        }

        if (!matchingCastaways || matchingCastaways.length === 0) {
          response = `Castaway "${castawayName}" not found or eliminated.`;
          break;
        }

        // If multiple matches, ask user to be more specific
        if (matchingCastaways.length > 1) {
          const names = matchingCastaways.map(c => c.name).join(', ');
          response = `Multiple matches found: ${names}. Please be more specific.`;
          parsedData.multiple_matches = matchingCastaways.map(c => c.name);
          break;
        }

        // Exactly one match - proceed with the pick
        const castaway = matchingCastaways[0];

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
        response = 'RGFL SMS Commands:\n\nPICK [name] - Pick castaway\nSTATUS - View picks\nTEAM - View roster\nSTOP - Unsubscribe\nSTART - Resubscribe\nHELP - Show this message';
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
