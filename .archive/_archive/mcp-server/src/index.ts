#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListResourcesRequestSchema, ReadResourceRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const server = new Server({
  name: "rgfl",
  version: "2.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  },
});

// Register resource handlers
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "rgfl://castaways",
        name: "All Castaways",
        mimeType: "application/json",
        description: "Complete list of all castaways with details and status",
      },
      {
        uri: "rgfl://users",
        name: "All Users",
        mimeType: "application/json",
        description: "All league users with profiles and preferences",
      },
      {
        uri: "rgfl://standings",
        name: "League Standings",
        mimeType: "application/json",
        description: "Current leaderboard with rankings and points",
      },
      {
        uri: "rgfl://picks",
        name: "Weekly Picks Summary",
        mimeType: "application/json",
        description: "Overview of all picks by week",
      },
      {
        uri: "rgfl://weeks",
        name: "Weekly Schedule",
        mimeType: "application/json",
        description: "All weeks with dates and status",
      },
      {
        uri: "rgfl://analytics/participation",
        name: "Participation Analytics",
        mimeType: "application/json",
        description: "User participation trends and engagement",
      },
      {
        uri: "rgfl://analytics/power-rankings",
        name: "Power Rankings",
        mimeType: "application/json",
        description: "Advanced power rankings with weighted scoring",
      },
    ],
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request: any) => {
  const uri = request.params?.uri || "";

  if (uri === "rgfl://castaways") {
    const castaways = await prisma.castaway.findMany({
      select: {
        id: true,
        name: true,
        number: true,
        tribe: true,
        occupation: true,
        age: true,
        hometown: true,
        eliminated: true,
        eliminatedWeek: true,
        imageUrl: true,
      },
      orderBy: { number: "asc" },
    });
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(castaways, null, 2),
      }],
    };
  }

  if (uri === "rgfl://users") {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        displayName: true,
        city: true,
        state: true,
        isAdmin: true,
        favoriteCastaway: true,
        smsEnabled: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(users, null, 2),
      }],
    };
  }

  if (uri === "rgfl://standings") {
    const standings = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        displayName: true,
        scores: { select: { points: true } },
      },
    });
    const withTotals = standings.map((user: any) => ({
      ...user,
      totalPoints: user.scores.reduce((sum: number, s: any) => sum + s.points, 0),
      weeksPlayed: user.scores.length,
    }));
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          withTotals.sort((a: any, b: any) => b.totalPoints - a.totalPoints),
          null, 2
        ),
      }],
    };
  }

  if (uri === "rgfl://picks") {
    const picks = await prisma.pick.groupBy({
      by: ["weekNumber"],
      _count: { id: true },
    });
    const detailed = await Promise.all(
      picks.map(async (p: any) => ({
        weekNumber: p.weekNumber,
        totalPicks: p._count.id,
        submittedPicks: await prisma.pick.count({
          where: { weekNumber: p.weekNumber, submittedAt: { not: null } },
        }),
      }))
    );
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          detailed.sort((a: any, b: any) => b.weekNumber - a.weekNumber),
          null, 2
        ),
      }],
    };
  }

  if (uri === "rgfl://weeks") {
    const weeks = await prisma.week.findMany({
      select: {
        id: true,
        weekNumber: true,
        isActive: true,
        picksOpenAt: true,
        picksCloseAt: true,
        _count: { select: { picks: true, scores: true } },
      },
      orderBy: { weekNumber: "desc" },
    });
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(weeks, null, 2),
      }],
    };
  }

  if (uri === "rgfl://analytics/participation") {
    const weeks = await prisma.week.findMany({ orderBy: { weekNumber: "asc" } });
    const participation = await Promise.all(
      weeks.map(async (week: any) => {
        const picks = await prisma.pick.findMany({
          where: { weekNumber: week.weekNumber },
          select: { userId: true },
        });
        return {
          weekNumber: week.weekNumber,
          totalUsers: await prisma.user.count(),
          usersWithPicks: new Set(picks.map(p => p.userId)).size,
          averagePointsPerUser: await prisma.score.findMany({
            where: { weekId: week.id },
            select: { points: true },
          }).then((scores: any) =>
            scores.length > 0
              ? scores.reduce((sum: number, s: any) => sum + s.points, 0) / scores.length
              : 0
          ),
        };
      })
    );
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(participation, null, 2),
      }],
    };
  }

  if (uri === "rgfl://analytics/power-rankings") {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        scores: { select: { points: true } },
      },
    });
    const powerRankings = users.map((user: any) => {
      const totalPoints = user.scores.reduce((sum: number, s: any) => sum + s.points, 0);
      const avgPoints = user.scores.length > 0 ? totalPoints / user.scores.length : 0;
      const participation = user.scores.length;
      const powerScore = totalPoints * 0.4 + avgPoints * 0.2 + avgPoints * 0.2 + participation * 0.1 + avgPoints * 0.1;
      return {
        name: user.name,
        totalPoints,
        averagePoints: Math.round(avgPoints * 100) / 100,
        weeksParticipated: participation,
        powerScore: Math.round(powerScore * 100) / 100,
      };
    });
    return {
      contents: [{
        uri,
        mimeType: "application/json",
        text: JSON.stringify(
          powerRankings.sort((a: any, b: any) => b.powerScore - a.powerScore),
          null, 2
        ),
      }],
    };
  }

  throw new Error(`Unknown resource: ${uri}`);
});

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ===== WEEK MANAGEMENT =====
      {
        name: "create_or_update_week",
        description: "Create a new week or update an existing one",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number", description: "Week number (1-based)" },
            isActive: { type: "boolean", description: "Mark week as active" },
            picksOpenAt: { type: "string", description: "ISO timestamp" },
            picksCloseAt: { type: "string", description: "ISO timestamp" },
          },
          required: ["weekNumber"],
        },
      },
      {
        name: "get_week_details",
        description: "Get detailed information about a specific week",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number" },
          },
          required: ["weekNumber"],
        },
      },
      {
        name: "delete_week",
        description: "Delete a week (be careful!)",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number" },
          },
          required: ["weekNumber"],
        },
      },
      // ===== SCORING =====
      {
        name: "publish_weekly_scores",
        description: "Publish castaway scores for a week and calculate user points",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number" },
            scores: { type: "object", additionalProperties: { type: "number" } },
          },
          required: ["weekNumber", "scores"],
        },
      },
      // ===== CASTAWAY MANAGEMENT =====
      {
        name: "create_castaway",
        description: "Create a new castaway",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            number: { type: "number" },
            tribe: { type: "string" },
            occupation: { type: "string" },
            age: { type: "number" },
            hometown: { type: "string" },
            imageUrl: { type: "string" },
          },
          required: ["name", "number", "tribe"],
        },
      },
      {
        name: "update_castaway",
        description: "Update castaway information",
        inputSchema: {
          type: "object",
          properties: {
            castawayId: { type: "string" },
            name: { type: "string" },
            tribe: { type: "string" },
            occupation: { type: "string" },
            age: { type: "number" },
            hometown: { type: "string" },
            imageUrl: { type: "string" },
          },
          required: ["castawayId"],
        },
      },
      {
        name: "eliminate_castaway",
        description: "Mark a castaway as eliminated in a specific week",
        inputSchema: {
          type: "object",
          properties: {
            castawayId: { type: "string" },
            eliminatedWeek: { type: "number" },
          },
          required: ["castawayId", "eliminatedWeek"],
        },
      },
      {
        name: "restore_castaway",
        description: "Restore an eliminated castaway back to active",
        inputSchema: {
          type: "object",
          properties: {
            castawayId: { type: "string" },
          },
          required: ["castawayId"],
        },
      },
      {
        name: "delete_castaway",
        description: "Permanently delete a castaway",
        inputSchema: {
          type: "object",
          properties: {
            castawayId: { type: "string" },
          },
          required: ["castawayId"],
        },
      },
      {
        name: "get_castaway_results",
        description: "Get weekly results for a castaway across all weeks",
        inputSchema: {
          type: "object",
          properties: {
            castawayId: { type: "string" },
          },
          required: ["castawayId"],
        },
      },
      // ===== USER MANAGEMENT =====
      {
        name: "create_user",
        description: "Create a new user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
            name: { type: "string" },
            username: { type: "string" },
            isAdmin: { type: "boolean" },
          },
          required: ["email", "name"],
        },
      },
      {
        name: "update_user",
        description: "Update user profile information",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string", description: "Email to identify user" },
            name: { type: "string" },
            username: { type: "string" },
            displayName: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            about: { type: "string" },
            isAdmin: { type: "boolean" },
          },
          required: ["email"],
        },
      },
      {
        name: "delete_user",
        description: "Permanently delete a user from the system",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          required: ["email"],
        },
      },
      {
        name: "get_user_details",
        description: "Get detailed information about a specific user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          required: ["email"],
        },
      },
      {
        name: "toggle_admin_status",
        description: "Grant or revoke admin privileges from a user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
            isAdmin: { type: "boolean" },
          },
          required: ["email", "isAdmin"],
        },
      },
      {
        name: "reset_user_password",
        description: "Generate password reset token for a user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          required: ["email"],
        },
      },
      // ===== PICK MANAGEMENT =====
      {
        name: "view_all_picks",
        description: "View all picks for a specific week or user",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number", description: "Optional: filter by week" },
            userId: { type: "string", description: "Optional: filter by user" },
          },
        },
      },
      {
        name: "delete_pick",
        description: "Delete a specific pick",
        inputSchema: {
          type: "object",
          properties: {
            pickId: { type: "string" },
          },
          required: ["pickId"],
        },
      },
      {
        name: "auto_pick_users",
        description: "Automatically assign picks to users who haven't picked",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number" },
          },
          required: ["weekNumber"],
        },
      },
      // ===== RANKING MANAGEMENT =====
      {
        name: "view_rankings",
        description: "View all preseason rankings submitted",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string", description: "Optional: filter by user" },
          },
        },
      },
      {
        name: "submit_ranking",
        description: "Submit a preseason ranking for a user",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            castawayIds: {
              type: "array",
              items: { type: "string" },
              description: "Ordered array of castaway IDs from best to worst"
            },
          },
          required: ["userId", "castawayIds"],
        },
      },
      // ===== LEAGUE MANAGEMENT =====
      {
        name: "get_league_config",
        description: "Get current league configuration",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "update_league_config",
        description: "Update league configuration",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            picksPerUser: { type: "number" },
            code: { type: "string" },
          },
        },
      },
      // ===== DRAFT MANAGEMENT =====
      {
        name: "get_draft_status",
        description: "Get current draft status and pick order",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "view_draft_picks",
        description: "View all draft picks assigned so far",
        inputSchema: {
          type: "object",
          properties: {
            userId: { type: "string", description: "Optional: filter by user" },
          },
        },
      },
      // ===== ANALYTICS =====
      {
        name: "get_system_stats",
        description: "Get system-wide statistics and overview",
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "get_user_stats",
        description: "Get detailed statistics for a specific user",
        inputSchema: {
          type: "object",
          properties: {
            email: { type: "string" },
          },
          required: ["email"],
        },
      },
      {
        name: "get_castaway_popularity",
        description: "See how many times each castaway was picked",
        inputSchema: {
          type: "object",
          properties: {
            weekNumber: { type: "number", description: "Optional: filter by week" },
          },
        },
      },
      {
        name: "get_head_to_head",
        description: "Compare two users head-to-head",
        inputSchema: {
          type: "object",
          properties: {
            user1Email: { type: "string" },
            user2Email: { type: "string" },
          },
          required: ["user1Email", "user2Email"],
        },
      },
    ],
  };
});

// Register tool handler
server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  try {
    // ===== WEEK MANAGEMENT =====
    if (name === "create_or_update_week") {
      const week = await prisma.week.findFirst({
        where: { weekNumber: args.weekNumber },
      });
      const result = week
        ? await prisma.week.update({
            where: { id: week.id },
            data: {
              isActive: args.isActive,
              picksOpenAt: args.picksOpenAt ? new Date(args.picksOpenAt) : undefined,
              picksCloseAt: args.picksCloseAt ? new Date(args.picksCloseAt) : undefined,
            },
          })
        : await prisma.week.create({
            data: {
              weekNumber: args.weekNumber,
              isActive: args.isActive ?? false,
              picksOpenAt: args.picksOpenAt ? new Date(args.picksOpenAt) : new Date(),
              picksCloseAt: args.picksCloseAt ? new Date(args.picksCloseAt) : new Date(),
            },
          });
      return {
        content: [{
          type: "text",
          text: `Week ${result.weekNumber} ${result.isActive ? "activated" : "updated"}`,
        }],
      };
    }

    if (name === "get_week_details") {
      const week = await prisma.week.findFirst({
        where: { weekNumber: args.weekNumber },
        include: {
          picks: { select: { userId: true, castawayId: true, submittedAt: true } },
          scores: { select: { userId: true, points: true } },
        },
      });
      if (!week) {
        return {
          content: [{ type: "text", text: `Week ${args.weekNumber} not found` }],
          isError: true,
        };
      }
      const stats = {
        weekNumber: week.weekNumber,
        isActive: week.isActive,
        picksOpen: week.picksOpenAt,
        picksClose: week.picksCloseAt,
        totalPicks: week.picks.length,
        submittedPicks: week.picks.filter((p: any) => p.submittedAt).length,
        scoredUsers: week.scores.length,
        averageScore: week.scores.length > 0
          ? Math.round((week.scores.reduce((sum: number, s: any) => sum + s.points, 0) / week.scores.length) * 100) / 100
          : 0,
      };
      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    }

    if (name === "delete_week") {
      const week = await prisma.week.findFirst({
        where: { weekNumber: args.weekNumber },
      });
      if (!week) {
        return {
          content: [{ type: "text", text: `Week ${args.weekNumber} not found` }],
          isError: true,
        };
      }
      await prisma.week.delete({ where: { id: week.id } });
      return {
        content: [{ type: "text", text: `Week ${args.weekNumber} deleted` }],
      };
    }

    // ===== SCORING =====
    if (name === "publish_weekly_scores") {
      const week = await prisma.week.findFirst({
        where: { weekNumber: args.weekNumber },
      });
      if (!week) {
        return {
          content: [{ type: "text", text: `Week ${args.weekNumber} not found` }],
          isError: true,
        };
      }

      // Look up castaway IDs by name
      const castawayLookup = new Map<string, string>();
      const allCastaways = await prisma.castaway.findMany({
        select: { id: true, name: true },
      });
      for (const castaway of allCastaways) {
        castawayLookup.set(castaway.name, castaway.id);
      }

      // Process each score entry
      const results = [];
      for (const [castawayName, points] of Object.entries(args.scores)) {
        const castawayId = castawayLookup.get(castawayName as string);
        if (!castawayId) {
          return {
            content: [{ type: "text", text: `Castaway not found: ${castawayName}` }],
            isError: true,
          };
        }

        await prisma.weeklyResult.upsert({
          where: {
            weekNumber_castawayId: {
              weekNumber: args.weekNumber,
              castawayId,
            },
          },
          update: { points: points as number },
          create: {
            weekNumber: args.weekNumber,
            castawayId,
            points: points as number,
          },
        });
        results.push(`${castawayName}: ${points}`);
      }

      return {
        content: [{ type: "text", text: `Scores published for week ${args.weekNumber}:\n${results.join('\n')}` }],
      };
    }

    // ===== CASTAWAY MANAGEMENT =====
    if (name === "create_castaway") {
      const castaway = await prisma.castaway.create({
        data: {
          name: args.name,
          number: args.number,
          tribe: args.tribe,
          occupation: args.occupation,
          age: args.age,
          hometown: args.hometown,
          imageUrl: args.imageUrl,
        },
      });
      return {
        content: [{ type: "text", text: `Created castaway: ${castaway.name} (#${castaway.number})` }],
      };
    }

    if (name === "update_castaway") {
      const castaway = await prisma.castaway.update({
        where: { id: args.castawayId },
        data: {
          name: args.name,
          tribe: args.tribe,
          occupation: args.occupation,
          age: args.age,
          hometown: args.hometown,
          imageUrl: args.imageUrl,
        },
      });
      return {
        content: [{ type: "text", text: `Updated castaway: ${castaway.name}` }],
      };
    }

    if (name === "eliminate_castaway") {
      const castaway = await prisma.castaway.update({
        where: { id: args.castawayId },
        data: {
          eliminated: true,
          eliminatedWeek: args.eliminatedWeek,
        },
      });
      return {
        content: [{ type: "text", text: `${castaway.name} eliminated in week ${args.eliminatedWeek}` }],
      };
    }

    if (name === "restore_castaway") {
      const castaway = await prisma.castaway.update({
        where: { id: args.castawayId },
        data: {
          eliminated: false,
          eliminatedWeek: null,
        },
      });
      return {
        content: [{ type: "text", text: `${castaway.name} restored to active status` }],
      };
    }

    if (name === "delete_castaway") {
      const castaway = await prisma.castaway.delete({
        where: { id: args.castawayId },
      });
      return {
        content: [{ type: "text", text: `Deleted castaway: ${castaway.name}` }],
      };
    }

    if (name === "get_castaway_results") {
      const castaway = await prisma.castaway.findUnique({
        where: { id: args.castawayId },
        include: { weeklyResults: { orderBy: { weekNumber: "asc" } } },
      });
      if (!castaway) {
        return {
          content: [{ type: "text", text: `Castaway not found` }],
          isError: true,
        };
      }
      const totalPoints = castaway.weeklyResults.reduce((sum: number, r: any) => sum + r.points, 0);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            name: castaway.name,
            eliminated: castaway.eliminated,
            eliminatedWeek: castaway.eliminatedWeek,
            totalPoints,
            weeklies: castaway.weeklyResults,
          }, null, 2),
        }],
      };
    }

    // ===== USER MANAGEMENT =====
    if (name === "create_user") {
      const user = await prisma.user.create({
        data: {
          email: args.email,
          name: args.name,
          username: args.username || args.email.split("@")[0],
          isAdmin: args.isAdmin ?? false,
        },
      });
      return {
        content: [{ type: "text", text: `Created user: ${user.email} (${user.name})` }],
      };
    }

    if (name === "update_user") {
      const user = await prisma.user.update({
        where: { email: args.email },
        data: {
          name: args.name,
          username: args.username,
          displayName: args.displayName,
          city: args.city,
          state: args.state,
          about: args.about,
          isAdmin: args.isAdmin !== undefined ? args.isAdmin : undefined,
        },
      });
      return {
        content: [{ type: "text", text: `Updated user: ${user.email}` }],
      };
    }

    if (name === "delete_user") {
      const user = await prisma.user.delete({
        where: { email: args.email },
      });
      return {
        content: [{ type: "text", text: `Deleted user: ${user.email}` }],
      };
    }

    if (name === "get_user_details") {
      const user = await prisma.user.findUnique({
        where: { email: args.email },
        include: {
          scores: { select: { points: true } },
          picks: { select: { weekNumber: true, castawayId: true } },
        },
      });
      if (!user) {
        return {
          content: [{ type: "text", text: `User not found` }],
          isError: true,
        };
      }
      const totalPoints = user.scores.reduce((sum: number, s: any) => sum + s.points, 0);
      const averagePoints = user.scores.length > 0 ? totalPoints / user.scores.length : 0;
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            totalPoints: Math.round(totalPoints * 100) / 100,
            averagePoints: Math.round(averagePoints * 100) / 100,
            weeksParticipated: user.scores.length,
            picksSubmitted: user.picks.length,
          }, null, 2),
        }],
      };
    }

    if (name === "toggle_admin_status") {
      const user = await prisma.user.update({
        where: { email: args.email },
        data: { isAdmin: args.isAdmin },
      });
      return {
        content: [{
          type: "text",
          text: `${user.email} is now ${args.isAdmin ? "an admin" : "not an admin"}`,
        }],
      };
    }

    if (name === "reset_user_password") {
      const user = await prisma.user.update({
        where: { email: args.email },
        data: {
          resetToken: Math.random().toString(36).substring(2, 15),
          resetTokenExpiry: new Date(Date.now() + 3600000),
        },
      });
      return {
        content: [{
          type: "text",
          text: `Password reset token generated for ${user.email}. Expires in 1 hour.`,
        }],
      };
    }

    // ===== PICK MANAGEMENT =====
    if (name === "view_all_picks") {
      const picks = await prisma.pick.findMany({
        where: {
          weekNumber: args.weekNumber,
          userId: args.userId,
        },
        include: { castaway: { select: { name: true } }, user: { select: { email: true } } },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(picks, null, 2),
        }],
      };
    }

    if (name === "delete_pick") {
      const pick = await prisma.pick.delete({
        where: { id: args.pickId },
      });
      return {
        content: [{ type: "text", text: `Deleted pick for week ${pick.weekNumber}` }],
      };
    }

    if (name === "auto_pick_users") {
      const week = await prisma.week.findFirst({
        where: { weekNumber: args.weekNumber },
      });
      if (!week) {
        return {
          content: [{ type: "text", text: `Week not found` }],
          isError: true,
        };
      }
      const usersWithoutPicks = await prisma.user.findMany({
        where: {
          picks: {
            none: { weekNumber: args.weekNumber },
          },
        },
      });
      let autoPickedCount = 0;
      for (const user of usersWithoutPicks) {
        const castaways = await prisma.castaway.findMany({
          where: { eliminated: false },
        });
        if (castaways.length > 0) {
          const randomCastaway = castaways[Math.floor(Math.random() * castaways.length)];
          await prisma.pick.create({
            data: {
              userId: user.id,
              weekNumber: args.weekNumber,
              castawayId: randomCastaway.id,
              isAutoSelected: true,
            },
          });
          autoPickedCount++;
        }
      }
      return {
        content: [{ type: "text", text: `Auto-picked for ${autoPickedCount} users` }],
      };
    }

    // ===== RANKING MANAGEMENT =====
    if (name === "view_rankings") {
      const rankings = await prisma.ranking.findMany({
        where: args.userId ? { userId: args.userId } : {},
        include: {
          user: { select: { email: true, name: true } },
          entries: { include: { castaway: { select: { name: true } } } },
        },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(rankings, null, 2),
        }],
      };
    }

    if (name === "submit_ranking") {
      const ranking = await prisma.ranking.upsert({
        where: { userId: args.userId },
        update: {},
        create: { userId: args.userId, submittedAt: new Date() },
      });
      await Promise.all(
        args.castawayIds.map((castawayId: string, index: number) =>
          prisma.rankingEntry.upsert({
            where: {
              rankingId_castawayId: {
                rankingId: ranking.id,
                castawayId,
              },
            },
            update: { position: index + 1 },
            create: {
              rankingId: ranking.id,
              castawayId,
              position: index + 1,
            },
          })
        )
      );
      return {
        content: [{ type: "text", text: `Ranking submitted for user with ${args.castawayIds.length} castaways` }],
      };
    }

    // ===== LEAGUE MANAGEMENT =====
    if (name === "get_league_config") {
      const league = await prisma.league.findFirst();
      if (!league) {
        return {
          content: [{ type: "text", text: `No league found` }],
          isError: true,
        };
      }
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            name: league.name,
            code: league.code,
            picksPerUser: league.picksPerUser,
            isAdminOnly: league.isAdminOnly,
            draftStatus: league.draftStatus,
          }, null, 2),
        }],
      };
    }

    if (name === "update_league_config") {
      const league = await prisma.league.findFirst();
      if (!league) {
        return {
          content: [{ type: "text", text: `No league found` }],
          isError: true,
        };
      }
      const updated = await prisma.league.update({
        where: { id: league.id },
        data: {
          name: args.name || league.name,
          picksPerUser: args.picksPerUser || league.picksPerUser,
          code: args.code || league.code,
        },
      });
      return {
        content: [{ type: "text", text: `Updated league config: ${updated.name}` }],
      };
    }

    // ===== DRAFT MANAGEMENT =====
    if (name === "get_draft_status") {
      const league = await prisma.league.findFirst();
      if (!league) {
        return {
          content: [{ type: "text", text: `No league found` }],
          isError: true,
        };
      }
      const draftPicks = await prisma.draftPick.findMany();
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            status: league.draftStatus,
            draftRunAt: league.draftRunAt,
            totalPicksMade: draftPicks.length,
          }, null, 2),
        }],
      };
    }

    if (name === "view_draft_picks") {
      const picks = await prisma.draftPick.findMany({
        where: args.userId ? { userId: args.userId } : {},
        include: { castaway: { select: { name: true } }, user: { select: { email: true } } },
        orderBy: { round: "asc" },
      });
      return {
        content: [{
          type: "text",
          text: JSON.stringify(picks, null, 2),
        }],
      };
    }

    // ===== ANALYTICS =====
    if (name === "get_system_stats") {
      const stats = {
        users: await prisma.user.count(),
        castaways: await prisma.castaway.count(),
        totalPicks: await prisma.pick.count(),
        totalScores: await prisma.score.count(),
        weeks: await prisma.week.count(),
        eliminatedCastaways: await prisma.castaway.count({ where: { eliminated: true } }),
        admins: await prisma.user.count({ where: { isAdmin: true } }),
      };
      return {
        content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
      };
    }

    if (name === "get_user_stats") {
      const user = await prisma.user.findUnique({
        where: { email: args.email },
        include: {
          scores: { select: { points: true } },
          picks: { select: { weekNumber: true, castawayId: true } },
          draftPicks: { include: { castaway: { select: { name: true } } } },
        },
      });
      if (!user) {
        return {
          content: [{ type: "text", text: `User not found` }],
          isError: true,
        };
      }
      const totalPoints = user.scores.reduce((sum: number, s: any) => sum + s.points, 0);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            email: user.email,
            name: user.name,
            totalPoints: Math.round(totalPoints * 100) / 100,
            averagePoints: user.scores.length > 0 ? Math.round((totalPoints / user.scores.length) * 100) / 100 : 0,
            weeksParticipated: user.scores.length,
            picksSubmitted: user.picks.length,
            draftedCastaways: user.draftPicks,
          }, null, 2),
        }],
      };
    }

    if (name === "get_castaway_popularity") {
      const picks = await prisma.pick.groupBy({
        by: ["castawayId"],
        where: args.weekNumber ? { weekNumber: args.weekNumber } : {},
        _count: { id: true },
      });
      const castawayPopularity = await Promise.all(
        picks.map(async (p: any) => {
          const castaway = await prisma.castaway.findUnique({
            where: { id: p.castawayId },
            select: { name: true, number: true },
          });
          return {
            castawayName: castaway?.name,
            castawayNumber: castaway?.number,
            pickCount: p._count.id,
          };
        })
      );
      return {
        content: [{
          type: "text",
          text: JSON.stringify(
            castawayPopularity.sort((a, b) => b.pickCount - a.pickCount),
            null,
            2
          ),
        }],
      };
    }

    if (name === "get_head_to_head") {
      const user1 = await prisma.user.findUnique({
        where: { email: args.user1Email },
        include: { scores: { select: { points: true } } },
      });
      const user2 = await prisma.user.findUnique({
        where: { email: args.user2Email },
        include: { scores: { select: { points: true } } },
      });
      if (!user1 || !user2) {
        return {
          content: [{ type: "text", text: `One or both users not found` }],
          isError: true,
        };
      }
      const user1Total = user1.scores.reduce((sum: number, s: any) => sum + s.points, 0);
      const user2Total = user2.scores.reduce((sum: number, s: any) => sum + s.points, 0);
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            user1: { name: user1.name, totalPoints: user1Total },
            user2: { name: user2.name, totalPoints: user2Total },
            difference: Math.abs(user1Total - user2Total),
            leader: user1Total > user2Total ? user1.name : user2Total > user1Total ? user2.name : "Tied",
          }, null, 2),
        }],
      };
    }

    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  } catch (error: any) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("RGFL MCP Server v2.0 running on stdio");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
