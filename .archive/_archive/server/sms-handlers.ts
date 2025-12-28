import prisma from './prisma.js';
import { User, Week, Castaway } from '@prisma/client';

export async function handlePickCommand(
  user: User,
  args: string[],
  week: Week
): Promise<string> {
  // Check if picks are open
  const now = new Date();

  if (week.picksCloseAt && now > week.picksCloseAt) {
    return "Pick deadline has passed. Check your email for the next pick window.";
  }

  if (week.picksOpenAt && now < week.picksOpenAt) {
    return "Pick window not open yet. Check your email for when picks open.";
  }

  // Get user's assigned castaways (exclude eliminated)
  const assigned = await prisma.draftPick.findMany({
    where: {
      userId: user.id,
      castaway: { eliminated: false }
    },
    include: { castaway: true },
    orderBy: { round: 'asc' }  // Ensure 1=first pick, 2=second pick
  });

  if (assigned.length === 0) {
    return "Draft not completed. Please check your email or login at rgfl.app";
  }

  // Match castaway name
  const input = args.join(' ').toLowerCase().trim();

  // Check if user provided a name
  if (!input || input.length === 0) {
    const names = assigned.map((a) => `#${a.castaway.number} ${a.castaway.name}`).join(', ');
    return `Please specify a castaway. Your team: ${names}. Reply: PICK [name or #]`;
  }

  const castaway = findCastaway(input, assigned.map(a => a.castaway));

  if (!castaway) {
    const names = assigned.map((a) => `#${a.castaway.number} ${a.castaway.name}`).join(', ');
    return `Couldn't find "${args.join(' ')}". Your team: ${names}`;
  }

  // Save pick
  const existing = await prisma.pick.findFirst({
    where: { userId: user.id, weekNumber: week.weekNumber }
  });

  await (existing
    ? prisma.pick.update({
        where: { id: existing.id },
        data: { castawayId: castaway.id, submittedAt: now }
      })
    : prisma.pick.create({
        data: {
          userId: user.id,
          castawayId: castaway.id,
          weekNumber: week.weekNumber,
          weekId: week.id,
          submittedAt: now
        }
      }));

  const deadline = week.picksCloseAt
    ? formatDeadline(week.picksCloseAt)
    : "Check rgfl.app";

  return `Your Week ${week.weekNumber} pick: ${castaway.name} (#${castaway.number}) ✓ Deadline: ${deadline}. Reply BOARD for top 5.`;
}

export async function handleLeaderboardCommand(user: User): Promise<string> {
  // Get all users with their total scores in a single query
  const usersWithScores = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      scores: {
        select: {
          points: true
        }
      }
    }
  });

  const userScores = usersWithScores.map(u => ({
    userId: u.id,
    name: u.name,
    points: u.scores.reduce((sum, s) => sum + s.points, 0)
  }));

  const sorted = userScores.sort((a, b) => b.points - a.points);
  const top5 = sorted.slice(0, 5);
  const userRank = sorted.findIndex(s => s.userId === user.id) + 1;

  let response = '🏆 TOP 5 LEADERBOARD:\n';
  top5.forEach((s, i) => {
    const isUser = s.userId === user.id;
    response += `${i + 1}. ${isUser ? 'You' : s.name} - ${s.points}pts\n`;
  });

  if (userRank > 5) {
    const userScore = sorted.find(s => s.userId === user.id);
    response += `You: ${formatRank(userRank)} place (${userScore?.points || 0}pts)\n`;
  }

  response += 'Reply STATUS for your pick.';
  return response;
}

export async function handleStatusCommand(user: User, week: Week): Promise<string> {
  const pick = await prisma.pick.findFirst({
    where: { userId: user.id, weekNumber: week.weekNumber },
    include: { castaway: true }
  });

  const userScores = await prisma.score.groupBy({
    by: ['userId'],
    where: { userId: user.id },
    _sum: { points: true }
  });

  const totalPoints = userScores.length > 0 ? (userScores[0]._sum.points || 0) : 0;

  const allScores = await prisma.score.groupBy({
    by: ['userId'],
    _sum: { points: true }
  });

  const sorted = allScores
    .map(s => s._sum.points || 0)
    .sort((a, b) => b - a);

  const rank = sorted.indexOf(totalPoints) + 1;

  const deadline = week.picksCloseAt
    ? formatDeadline(week.picksCloseAt)
    : "Check rgfl.app";

  if (!pick) {
    return `Week ${week.weekNumber}: No pick yet\nYour score: ${totalPoints}pts (${formatRank(rank)})\nDeadline: ${deadline}\nReply PICK [name or #]`;
  }

  return `Week ${week.weekNumber}: ${pick.castaway.name} (#${pick.castaway.number}) ✓\nYour score: ${totalPoints}pts (${formatRank(rank)})\nDeadline: ${deadline}\nReply BOARD for top 5`;
}

export async function handleTeamCommand(user: User): Promise<string> {
  const assigned = await prisma.draftPick.findMany({
    where: {
      userId: user.id,
      castaway: { eliminated: false }
    },
    include: { castaway: true },
    orderBy: { round: 'asc' }  // Consistent ordering: 1=first pick, 2=second pick
  });

  if (assigned.length === 0) {
    return "Draft not completed. Login at rgfl.app to see your team.";
  }

  let response = 'YOUR TEAM:\n';
  assigned.forEach((a) => {
    response += `#${a.castaway.number} ${a.castaway.name}\n`;
  });
  response += 'Pick: PICK [name or #]';

  return response;
}

export async function handleHelpCommand(): Promise<string> {
  return `RGFL Commands:
PICK [name] - Set your weekly pick
BOARD - View top 5 leaderboard
STATUS - Check your current pick
TEAM - See your castaways
HELP - This message
Visit: rgfl.app`;
}

function findCastaway(input: string, castaways: Castaway[]): Castaway | null {
  // Try exact match (case insensitive)
  let match = castaways.find(c => c.name.toLowerCase() === input);
  if (match) return match;

  // Try global castaway number match (1-18)
  const num = parseInt(input);
  if (!isNaN(num)) {
    match = castaways.find(c => c.number === num);
    if (match) return match;
  }

  // Try first name match
  match = castaways.find(c => c.name.toLowerCase().split(' ')[0] === input);
  if (match) return match;

  // Try starts with
  match = castaways.find(c => c.name.toLowerCase().startsWith(input));
  if (match) return match;

  // Try contains
  match = castaways.find(c => c.name.toLowerCase().includes(input));
  if (match) return match;

  return null;
}

function formatDeadline(date: Date): string {
  // Convert to PT timezone
  const ptString = date.toLocaleString("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: 'short',
    hour: 'numeric',
    hour12: true
  });

  // Extract day and time (format: "Wed, 5 PM" -> "Wed 5pm")
  const parts = ptString.split(', ');
  const day = parts[0];
  const time = parts[1].replace(' ', '').toLowerCase();

  return `${day} ${time} PT`;
}

function formatRank(rank: number): string {
  const lastDigit = rank % 10;
  const lastTwoDigits = rank % 100;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
    return `${rank}th`;
  }

  switch (lastDigit) {
    case 1: return `${rank}st`;
    case 2: return `${rank}nd`;
    case 3: return `${rank}rd`;
    default: return `${rank}th`;
  }
}
