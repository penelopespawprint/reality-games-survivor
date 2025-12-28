import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { routes } from "@/shared/routes";
import { useAuth } from "@/context/AuthContext";
import { useLeague } from "@/context/LeagueContext";
import LeagueSwitcher from "@/components/LeagueSwitcher";
import { SectionLoader } from "@/components/TorchLoader";
import api from "@/lib/api";

interface Castaway {
  id: string;
  name: string;
  eliminated: boolean;
  eliminatedWeek: number | null;
}

interface Week {
  weekNumber: number;
  isActive: boolean;
}

interface Standing {
  userId: string;
  name: string;
  totalPoints: number;
  rank: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const { selectedLeague } = useLeague();
  const [activeWeek, setActiveWeek] = useState<Week | null>(null);
  const [userCastaways, setUserCastaways] = useState<Castaway[]>([]);
  const [standings, setStandings] = useState<Standing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!selectedLeague) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        // Get active week
        const weeksRes = await api.get("/api/weeks");
        const activeWeekData = weeksRes.data.find((w: Week) => w.isActive);
        setActiveWeek(activeWeekData || null);

        // Get user's castaways for this league
        const castawaysRes = await api.get(`/api/leagues/${selectedLeague.id}/my-castaways`);
        setUserCastaways(castawaysRes.data.castaways || []);

        // Get league standings
        const standingsRes = await api.get(`/api/leagues/${selectedLeague.id}/standings`);
        setStandings(standingsRes.data.standings || []);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedLeague]);

  const getHeroMessage = () => {
    if (loading || !activeWeek) {
      return {
        pill: "Loading...",
        title: "Welcome to the Reality Games Fantasy League",
        buttonText: "View Dashboard"
      };
    }

    const activeCastaways = userCastaways.filter(c => !c.eliminated);
    const allEliminated = userCastaways.length > 0 && activeCastaways.length === 0;
    const weekNum = activeWeek.weekNumber;

    // Get user's standing
    const userStanding = standings.find(s => s.userId === user?.id);
    const rank = userStanding?.rank || 0;
    const totalPlayers = standings.length;
    const points = userStanding?.totalPoints || 0;
    const leader = standings[0];
    const pointsBehind = leader ? leader.totalPoints - points : 0;

    // All castaways eliminated
    if (allEliminated) {
      const rankMessage = rank <= 3 ?
        `Despite losing both castaways, you're still in ${rank === 1 ? '1st' : rank === 2 ? '2nd' : '3rd'} place! 🏆` :
        rank <= totalPlayers / 2 ?
        `You finished in the top half despite both castaways being eliminated.` :
        `Both castaways eliminated. Focus on next season's strategy!`;

      return {
        pill: `Week ${weekNum} - Out of Contention`,
        title: rankMessage,
        buttonText: "View Final Standings"
      };
    }

    // One castaway eliminated
    if (userCastaways.length === 2 && activeCastaways.length === 1) {
      const rankMessage = rank === 1 ?
        `You're leading with ${points} points! ${activeCastaways[0].name} is your ticket to victory! 👑` :
        rank <= 3 ?
        `${activeCastaways[0].name} is your last hope. You're ${pointsBehind} points behind the leader!` :
        `Down to ${activeCastaways[0].name}. Time for a comeback!`;

      return {
        pill: `Week ${weekNum} - Last Castaway Standing`,
        title: rankMessage,
        buttonText: `Make Your Week ${weekNum} Pick`
      };
    }

    // Both still active - personalized by rank
    let personalizedTitle = "";

    if (rank === 1) {
      personalizedTitle = `You're in 1st place with ${points} points! Defend your lead! 👑`;
    } else if (rank === 2) {
      personalizedTitle = `You're in 2nd place, just ${pointsBehind} points behind! Make your move! 🥈`;
    } else if (rank === 3) {
      personalizedTitle = `You're in 3rd place! Chase down the leaders with a strong pick! 🥉`;
    } else if (rank <= totalPlayers / 3) {
      personalizedTitle = `You're in ${rank}${getRankSuffix(rank)} place. Time to climb the leaderboard!`;
    } else if (rank <= (totalPlayers * 2) / 3) {
      personalizedTitle = `Currently ${rank}${getRankSuffix(rank)} place. A strong pick could change everything!`;
    } else {
      personalizedTitle = `You're in ${rank}${getRankSuffix(rank)} place. It's not over - make a comeback!`;
    }

    const weekPills: Record<number, string> = {
      1: "Week 1 - The Game Begins",
      2: "Week 2 - Early Strategy",
      3: "Week 3 - Building Momentum",
      4: "Week 4 - Midseason Push",
      5: "Week 5 - Halfway Point",
      6: "Week 6 - Strategic Moves",
      7: "Week 7 - Endgame Approaching",
      8: "Week 8 - Final Eight",
      9: "Week 9 - Nearing the End",
      10: "Week 10 - Final Picks",
      11: "Week 11 - Finale Approaching",
      12: "Week 12 - Final Tribal",
      13: "Week 13 - Season Finale",
    };

    return {
      pill: weekPills[weekNum] || `Week ${weekNum}`,
      title: personalizedTitle,
      buttonText: `Make Your Week ${weekNum} Pick`
    };
  };

  const getRankSuffix = (rank: number): string => {
    if (rank % 100 >= 11 && rank % 100 <= 13) return 'th';
    switch (rank % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const heroMessage = getHeroMessage();
  const allEliminated = userCastaways.length > 0 && userCastaways.every(c => c.eliminated);

  return (
    <main className="rg-page" role="main" aria-label="Dashboard">

      <section className="rg-hero text-center" aria-labelledby="hero-title">
        <span className="rg-pill">{heroMessage.pill}</span>
        <h1 id="hero-title">{heroMessage.title}</h1>
        {loading && (
          <SectionLoader />
        )}
        {!loading && userCastaways.length > 0 && (
          <p style={{ color: "#666", marginTop: "0.5rem", fontSize: "0.95rem" }}>
            Your Castaways: {userCastaways.map(c =>
              c.eliminated
                ? <span key={c.id} style={{ textDecoration: "line-through", opacity: 0.5 }}>{c.name}</span>
                : <strong key={c.id}>{c.name}</strong>
            ).reduce((prev, curr) => [prev, " • ", curr] as any)}
          </p>
        )}
        <div className="flex flex-center gap-2 mt-2">
          <Link to={allEliminated ? routes.leaderboard : routes.weeklyPicks} aria-label={heroMessage.buttonText}>
            <button style={{
              fontSize: "1.25rem",
              padding: "1rem 2.5rem",
              fontWeight: "700"
            }} aria-label={heroMessage.buttonText}>{heroMessage.buttonText}</button>
          </Link>
        </div>
      </section>

      <section className="rg-section">
        <LeagueSwitcher />
      </section>

      <section className="rg-section">
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <img
            src="/images/cast-photo.jpg"
            alt="Survivor Cast"
            style={{
              maxWidth: "100%",
              height: "auto",
              borderRadius: "12px",
              boxShadow: "0 8px 24px rgba(0, 0, 0, 0.15)"
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        </div>

        <h2 id="tasks-heading">Weekly Tasks</h2>
        <div className="rg-grid" style={{
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1.5rem"
        }} role="list" aria-labelledby="tasks-heading">
          <article className="rg-card" role="listitem">
            <h3>🎯 Weekly Pick</h3>
            <p>Select your active castaway by Wednesday 5p PT.</p>
            <Link to={routes.weeklyPicks} aria-label="Make your weekly pick">Make Your Pick →</Link>
          </article>
          <article className="rg-card" role="listitem">
            <h3>🏆 Leaderboard</h3>
            <p>Track your ranking and see how you stack up against others.</p>
            <Link to={routes.leaderboard} aria-label="View league standings">View Standings →</Link>
          </article>
          <article className="rg-card" role="listitem">
            <h3>📬 Tree Mail</h3>
            <p>Check for league updates and important announcements.</p>
            <Link to={routes.contact} aria-label="Contact us for league updates">Contact Us →</Link>
          </article>
          <article className="rg-card" role="listitem">
            <h3>👤 Complete Profile</h3>
            <p>Add your details and personalize your league experience.</p>
            <Link to={routes.profile} aria-label="Edit your profile">Edit Profile →</Link>
          </article>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
