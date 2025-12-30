import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.0.0?target=deno"
import { handleCors } from "../_shared/cors.ts"
import { supabaseAdmin, getUser } from "../_shared/supabase.ts"
import { json, error, unauthorized, forbidden, notFound } from "../_shared/response.ts"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY')!, {
  apiVersion: '2023-10-16',
})

serve(async (req) => {
  const corsResponse = handleCors(req)
  if (corsResponse) return corsResponse

  const url = new URL(req.url)
  const path = url.pathname.replace('/leagues', '')
  const method = req.method

  const user = await getUser(req)
  if (!user) {
    return unauthorized('Authentication required')
  }

  try {
    // POST /leagues - Create a new league
    if (method === 'POST' && path === '') {
      const body = await req.json()
      const { name, season_id, password, donation_amount, max_players } = body

      // Validate required fields
      if (!name || !season_id) {
        return error('Name and season_id are required')
      }

      // Validate name length
      if (name.trim().length < 3 || name.length > 50) {
        return error('League name must be between 3 and 50 characters')
      }

      // max_players is always 12 - ignore any provided value

      // Validate password length if provided
      if (password && password.length > 100) {
        return error('Password must be at most 100 characters')
      }

      // Validate donation_amount if provided
      if (donation_amount !== null && donation_amount !== undefined) {
        if (typeof donation_amount !== 'number' || donation_amount < 0 || donation_amount > 10000) {
          return error('Donation amount must be between 0 and 10000')
        }
      }

      // Hash password if provided
      let passwordHash = null
      if (password) {
        const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts')
        passwordHash = await bcrypt.hash(password)
      }

      const { data: league, error: createError } = await supabaseAdmin
        .from('leagues')
        .insert({
          name: name.trim(),
          season_id,
          commissioner_id: user.id,
          password_hash: passwordHash,
          require_donation: !!donation_amount,
          donation_amount: donation_amount || null,
          max_players: 12, // Fixed at 12
        })
        .select()
        .single()

      if (createError) {
        console.error('League creation error:', createError)
        return error(createError.message)
      }

      await supabaseAdmin
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          draft_position: 1,
        })

      return json({ league, invite_code: league.code }, 201)
    }

    // Extract league ID from path like /:id/...
    const leagueIdMatch = path.match(/^\/([^\/]+)/)
    const leagueId = leagueIdMatch?.[1]
    const subPath = leagueId ? path.replace(`/${leagueId}`, '') : ''

    if (!leagueId) {
      return notFound('Route not found')
    }

    // POST /leagues/:id/join - Join a league
    if (method === 'POST' && subPath === '/join') {
      const body = await req.json().catch(() => ({}))
      const { password } = body

      const { data: league, error: leagueError } = await supabaseAdmin
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (leagueError || !league) {
        return notFound('League not found')
      }

      if (league.is_closed) {
        return forbidden('This league is closed to new members')
      }

      const { data: existing } = await supabaseAdmin
        .from('league_members')
        .select('id')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        return error('Already a member of this league')
      }

      // Validate password if required
      if (league.password_hash) {
        if (!password) {
          return forbidden('Password required to join this league')
        }
        // Compare hashed password
        const bcrypt = await import('https://deno.land/x/bcrypt@v0.4.1/mod.ts')
        const passwordValid = await bcrypt.compare(password, league.password_hash)
        if (!passwordValid) {
          return forbidden('Invalid password')
        }
      }

      if (league.require_donation) {
        return json({
          error: 'Payment required',
          checkout_url: `/leagues/${leagueId}/join/checkout`,
        }, 402)
      }

      const { count } = await supabaseAdmin
        .from('league_members')
        .select('*', { count: 'exact', head: true })
        .eq('league_id', leagueId)

      if (count && count >= (league.max_players || 12)) {
        return error('League is full')
      }

      const { data: membership, error: memberError } = await supabaseAdmin
        .from('league_members')
        .insert({
          league_id: leagueId,
          user_id: user.id,
        })
        .select()
        .single()

      if (memberError) {
        return error(memberError.message)
      }

      return json({ membership }, 201)
    }

    // POST /leagues/:id/join/checkout - Create Stripe checkout session
    if (method === 'POST' && subPath === '/join/checkout') {
      const { data: league, error: leagueError } = await supabaseAdmin
        .from('leagues')
        .select('*')
        .eq('id', leagueId)
        .single()

      if (leagueError || !league) {
        return notFound('League not found')
      }

      if (!league.require_donation || !league.donation_amount) {
        return error('This league does not require payment')
      }

      // CRITICAL: Use FRONTEND_URL for redirects (frontend domain), NEVER BASE_URL (points to API)
      // ALWAYS use hardcoded production URL to prevent redirect issues - never trust env vars for payments
      // This prevents any rgfl.app or api.rgfl.app redirects that break payments
      const frontendUrl = 'https://survivor.realitygamesfantasyleague.com'
      
      console.log('Checkout success_url:', `${frontendUrl}/leagues/${leagueId}?joined=true`)

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${league.name} - League Entry`,
              description: league.donation_notes || 'League entry fee',
            },
            unit_amount: Math.round(league.donation_amount * 100),
          },
          quantity: 1,
        }],
        metadata: {
          league_id: leagueId,
          user_id: user.id,
          type: 'league_donation',
        },
        success_url: `${frontendUrl}/leagues/${leagueId}?joined=true`,
        cancel_url: `${frontendUrl}/join/${league.code}?cancelled=true`,
      })

      return json({ checkout_url: session.url, session_id: session.id })
    }

    // GET /leagues/:id/join/status - Check payment status
    if (method === 'GET' && subPath === '/join/status') {
      const { data: membership } = await supabaseAdmin
        .from('league_members')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', user.id)
        .single()

      return json({ paid: !!membership, membership })
    }

    // POST /leagues/:id/leave - Leave a league
    if (method === 'POST' && subPath === '/leave') {
      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('draft_status, commissioner_id')
        .eq('id', leagueId)
        .single()

      if (!league) {
        return notFound('League not found')
      }

      if (league.commissioner_id === user.id) {
        return error('Commissioner cannot leave their own league')
      }

      let refund = null
      if (league.draft_status === 'pending') {
        const { data: payment } = await supabaseAdmin
          .from('payments')
          .select('*')
          .eq('league_id', leagueId)
          .eq('user_id', user.id)
          .eq('status', 'completed')
          .single()

        if (payment?.stripe_payment_intent_id) {
          const stripeRefund = await stripe.refunds.create({
            payment_intent: payment.stripe_payment_intent_id,
          })

          await supabaseAdmin
            .from('payments')
            .update({
              status: 'refunded',
              stripe_refund_id: stripeRefund.id,
              refunded_at: new Date().toISOString(),
            })
            .eq('id', payment.id)

          refund = { amount: payment.amount }
        }
      }

      const { error: deleteError } = await supabaseAdmin
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', user.id)

      if (deleteError) {
        return error(deleteError.message)
      }

      return json({ success: true, refund })
    }

    // GET /leagues/:id/standings - Calculated standings
    if (method === 'GET' && subPath === '/standings') {
      const { data: members, error: membersError } = await supabaseAdmin
        .from('league_members')
        .select(`
          user_id,
          total_points,
          rank,
          users (
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('league_id', leagueId)
        .order('total_points', { ascending: false })

      if (membersError) {
        return error(membersError.message)
      }

      const standings = members?.map((m: any, idx: number) => ({
        user: m.users,
        rank: idx + 1,
        points: m.total_points || 0,
        movement: 0,
      }))

      return json({ standings })
    }

    // GET /leagues/:id/invite-link
    if (method === 'GET' && subPath === '/invite-link') {
      const { data: league, error: leagueError } = await supabaseAdmin
        .from('leagues')
        .select('code, commissioner_id')
        .eq('id', leagueId)
        .single()

      if (leagueError || !league) {
        return notFound('League not found')
      }

      // Check if user is commissioner or admin
      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (league.commissioner_id !== user.id && userProfile?.role !== 'admin') {
        return forbidden('Only commissioner can access invite link')
      }

      const baseUrl = Deno.env.get('BASE_URL') || 'https://survivor.realitygamesfantasyleague.com'

      return json({
        code: league.code,
        url: `${baseUrl}/join/${league.code}`,
      })
    }

    // PATCH /leagues/:id/settings
    if (method === 'PATCH' && subPath === '/settings') {
      const body = await req.json()
      const {
        name,
        description,
        password,
        donation_amount,
        payout_method,
        is_public,
        is_closed,
        max_players,
        donation_notes,
      } = body

      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('commissioner_id, co_commissioners')
        .eq('id', leagueId)
        .single()

      const isCommissioner = league?.commissioner_id === user.id ||
        ((league?.co_commissioners as string[]) || []).includes(user.id)

      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!league || (!isCommissioner && userProfile?.role !== 'admin')) {
        return forbidden('Only commissioner can update settings')
      }

      const updates: Record<string, any> = {}
      if (name !== undefined) updates.name = name
      if (description !== undefined) updates.description = description
      if (password !== undefined) updates.password_hash = password || null
      if (donation_amount !== undefined) {
        updates.donation_amount = donation_amount
        updates.require_donation = !!donation_amount
      }
      if (donation_notes !== undefined) updates.donation_notes = donation_notes
      if (payout_method !== undefined) updates.payout_method = payout_method
      if (is_public !== undefined) updates.is_public = is_public
      if (is_closed !== undefined) updates.is_closed = is_closed
      if (max_players !== undefined) updates.max_players = max_players

      const { data, error: updateError } = await supabaseAdmin
        .from('leagues')
        .update(updates)
        .eq('id', leagueId)
        .select()
        .single()

      if (updateError) {
        return error(updateError.message)
      }

      return json({ league: data })
    }

    // GET /leagues/:id/members
    if (method === 'GET' && subPath === '/members') {
      const { data: members, error: membersError } = await supabaseAdmin
        .from('league_members')
        .select(`
          id,
          user_id,
          draft_position,
          total_points,
          rank,
          joined_at,
          users (
            id,
            display_name,
            email,
            avatar_url
          )
        `)
        .eq('league_id', leagueId)
        .order('draft_position', { ascending: true, nullsFirst: false })

      if (membersError) {
        return error(membersError.message)
      }

      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('commissioner_id, co_commissioners')
        .eq('id', leagueId)
        .single()

      const formattedMembers = members?.map((m: any) => ({
        ...m,
        is_commissioner: m.user_id === league?.commissioner_id,
        is_co_commissioner: ((league?.co_commissioners as string[]) || []).includes(m.user_id),
      }))

      return json({ members: formattedMembers })
    }

    // DELETE /leagues/:id/members/:userId
    const memberMatch = subPath.match(/^\/members\/([^\/]+)$/)
    if (method === 'DELETE' && memberMatch) {
      const targetUserId = memberMatch[1]

      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('commissioner_id, co_commissioners, draft_status')
        .eq('id', leagueId)
        .single()

      const isCommissioner = league?.commissioner_id === user.id ||
        ((league?.co_commissioners as string[]) || []).includes(user.id)

      const { data: userProfile } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!league || (!isCommissioner && userProfile?.role !== 'admin')) {
        return forbidden('Only commissioner can remove members')
      }

      if (targetUserId === league.commissioner_id) {
        return error('Cannot remove the league commissioner')
      }

      if (((league.co_commissioners as string[]) || []).includes(targetUserId)) {
        return error('Remove co-commissioner status first')
      }

      const { error: deleteError } = await supabaseAdmin
        .from('league_members')
        .delete()
        .eq('league_id', leagueId)
        .eq('user_id', targetUserId)

      if (deleteError) {
        return error(deleteError.message)
      }

      if (league.draft_status !== 'completed') {
        await supabaseAdmin
          .from('rosters')
          .delete()
          .eq('league_id', leagueId)
          .eq('user_id', targetUserId)

        await supabaseAdmin
          .from('weekly_picks')
          .delete()
          .eq('league_id', leagueId)
          .eq('user_id', targetUserId)
      }

      let refund = null
      const { data: payment } = await supabaseAdmin
        .from('payments')
        .select('*')
        .eq('league_id', leagueId)
        .eq('user_id', targetUserId)
        .eq('status', 'completed')
        .single()

      if (payment?.stripe_payment_intent_id && league.draft_status === 'pending') {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: payment.stripe_payment_intent_id,
        })

        await supabaseAdmin
          .from('payments')
          .update({
            status: 'refunded',
            stripe_refund_id: stripeRefund.id,
            refunded_at: new Date().toISOString(),
          })
          .eq('id', payment.id)

        refund = { amount: payment.amount }
      }

      return json({ success: true, refund })
    }

    // POST /leagues/:id/transfer
    if (method === 'POST' && subPath === '/transfer') {
      const body = await req.json()
      const { new_commissioner_id } = body

      if (!new_commissioner_id) {
        return error('new_commissioner_id is required')
      }

      const { data: league } = await supabaseAdmin
        .from('leagues')
        .select('commissioner_id')
        .eq('id', leagueId)
        .single()

      if (!league || league.commissioner_id !== user.id) {
        return forbidden('Only the commissioner can transfer ownership')
      }

      const { data: newCommissioner } = await supabaseAdmin
        .from('league_members')
        .select('user_id')
        .eq('league_id', leagueId)
        .eq('user_id', new_commissioner_id)
        .single()

      if (!newCommissioner) {
        return error('New commissioner must be a league member')
      }

      const { data, error: updateError } = await supabaseAdmin
        .from('leagues')
        .update({
          commissioner_id: new_commissioner_id,
          co_commissioners: [],
        })
        .eq('id', leagueId)
        .select()
        .single()

      if (updateError) {
        return error(updateError.message)
      }

      return json({ league: data, message: 'Ownership transferred successfully' })
    }

    return notFound('Route not found')
  } catch (err) {
    console.error('Leagues function error:', err)
    return error('Internal server error', 500)
  }
})
