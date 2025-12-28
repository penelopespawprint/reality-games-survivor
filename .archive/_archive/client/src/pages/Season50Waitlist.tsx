import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

/**
 * Season 50 Waitlist Landing Page
 * - Viral referral loop (CEREBRO Skill 54: Viral Loops)
 * - Email capture with position tracking
 * - Social proof with leaderboard
 *
 * CEREBRO Skills: 43-55 (Product/Growth), 56-70 (Marketing/Brand)
 */

interface WaitlistEntry {
  id: string;
  email: string;
  position: number;
  referralCode: string;
  referralLink: string;
  seasonNumber: number;
  seasonName: string;
}

interface LeaderboardEntry {
  name: string;
  referralCount: number;
}

// Registration opens January 5, 2025 at midnight UTC
const REGISTRATION_DATE = new Date("2025-01-05T00:00:00Z");

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function useCountdown(targetDate: Date): CountdownTime {
  const calculateTimeLeft = (): CountdownTime => {
    const now = new Date();
    const diff = targetDate.getTime() - now.getTime();

    if (diff <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
    }

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      isExpired: false,
    };
  };

  const [timeLeft, setTimeLeft] = useState<CountdownTime>(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return timeLeft;
}

const Season50Waitlist: React.FC = () => {
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref");
  const countdown = useCountdown(REGISTRATION_DATE);

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entry, setEntry] = useState<WaitlistEntry | null>(null);
  const [error, setError] = useState("");
  const [waitlistCount, setWaitlistCount] = useState<number>(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [copied, setCopied] = useState(false);

  const apiBase = import.meta.env.VITE_API_URL || "";

  // Fetch waitlist count and leaderboard
  useEffect(() => {
    fetch(`${apiBase}/api/waitlist/count`)
      .then((res) => res.json())
      .then((data) => setWaitlistCount(data.count || 0))
      .catch(() => {});

    fetch(`${apiBase}/api/waitlist/leaderboard`)
      .then((res) => res.json())
      .then((data) => setLeaderboard(data.leaderboard || []))
      .catch(() => {});
  }, [apiBase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const response = await fetch(`${apiBase}/api/waitlist/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name: name || undefined,
          source: "web",
          referralCode: referralCode || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 409) {
          // Already on waitlist, fetch their status
          const statusRes = await fetch(
            `${apiBase}/api/waitlist/status/${encodeURIComponent(email)}`
          );
          if (statusRes.ok) {
            const statusData = await statusRes.json();
            setEntry({
              id: statusData.referralCode,
              email: statusData.email,
              position: statusData.position,
              referralCode: statusData.referralCode,
              referralLink: statusData.referralLink,
              seasonNumber: statusData.season?.number || 50,
              seasonName: statusData.season?.name || "Survivor 50",
            });
          }
          return;
        }
        throw new Error(data.error || "Failed to join waitlist");
      }

      setEntry(data.entry);
      setWaitlistCount((prev) => prev + 1);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyReferralLink = () => {
    if (entry?.referralLink) {
      navigator.clipboard.writeText(entry.referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.02); }
        }

        @keyframes confetti {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
        }

        .waitlist-hero {
          animation: fadeInUp 0.8s ease-out;
        }

        .waitlist-form {
          animation: fadeInUp 0.8s ease-out 0.2s;
          animation-fill-mode: both;
        }

        .success-card {
          animation: fadeInUp 0.6s ease-out;
        }

        .success-card::before {
          content: '🎉';
          position: absolute;
          top: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 3rem;
          animation: confetti 0.8s ease-out;
        }

        .position-number {
          animation: pulse 2s ease-in-out infinite;
        }

        .referral-btn {
          transition: all 0.3s ease;
        }

        .referral-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(164, 40, 40, 0.3);
        }

        .leaderboard-item {
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
        }

        .leaderboard-item:nth-child(1) { animation-delay: 0.1s; }
        .leaderboard-item:nth-child(2) { animation-delay: 0.15s; }
        .leaderboard-item:nth-child(3) { animation-delay: 0.2s; }
        .leaderboard-item:nth-child(4) { animation-delay: 0.25s; }
        .leaderboard-item:nth-child(5) { animation-delay: 0.3s; }

        @media (max-width: 768px) {
          .waitlist-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <main
        role="main"
        aria-label="Season 50 Waitlist"
        style={{
          minHeight: "100vh",
          background:
            "linear-gradient(180deg, #F3EED9 0%, #E8DCC8 50%, #D4C4B0 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: `
            radial-gradient(circle at 20% 30%, rgba(164, 40, 40, 0.05) 0%, transparent 50%),
            radial-gradient(circle at 80% 70%, rgba(255, 119, 108, 0.05) 0%, transparent 50%)
          `,
            pointerEvents: "none",
          }}
        />

        {/* Navigation */}
        <nav
          style={{
            position: "relative",
            zIndex: 10,
            padding: "1.5rem 2rem",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <img
            src="/images/logo/rgfl-logo.png"
            alt="RGFL"
            style={{ height: "60px", width: "auto" }}
          />
        </nav>

        {/* Hero */}
        <section
          className="waitlist-hero"
          style={{
            position: "relative",
            zIndex: 5,
            maxWidth: "800px",
            margin: "0 auto",
            padding: "2rem 2rem 1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              display: "inline-block",
              background: "var(--brand-red)",
              color: "white",
              padding: "0.5rem 1.25rem",
              borderRadius: "50px",
              fontSize: "0.85rem",
              fontWeight: 700,
              marginBottom: "1rem",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            🔥 Season 50 • {countdown.isExpired ? "Registration Open!" : "Registration Opens January 5"}
          </div>

          {/* Countdown Timer */}
          {!countdown.isExpired && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              {[
                { value: countdown.days, label: "Days" },
                { value: countdown.hours, label: "Hours" },
                { value: countdown.minutes, label: "Mins" },
                { value: countdown.seconds, label: "Secs" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: "white",
                    borderRadius: "12px",
                    padding: "0.75rem 1rem",
                    minWidth: "70px",
                    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "1.75rem",
                      fontWeight: 900,
                      color: "var(--brand-red)",
                      fontFamily: "Impact, sans-serif",
                      lineHeight: 1,
                    }}
                  >
                    {String(item.value).padStart(2, "0")}
                  </div>
                  <div
                    style={{
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          )}

          <h1
            style={{
              fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
              fontWeight: 900,
              color: "var(--brand-red)",
              marginBottom: "1rem",
              lineHeight: 1.1,
              fontFamily: "Impact, 'Franklin Gothic Bold', sans-serif",
              textTransform: "uppercase",
            }}
          >
            Survivor Fantasy League
          </h1>

          <p
            style={{
              fontSize: "clamp(1.1rem, 2.5vw, 1.3rem)",
              color: "var(--text-dark)",
              maxWidth: "600px",
              margin: "0 auto",
              lineHeight: 1.6,
            }}
          >
            The ultimate fantasy experience for Survivor superfans.
            {referralCode && (
              <span style={{ display: "block", marginTop: "0.5rem" }}>
                <strong style={{ color: "var(--brand-red)" }}>
                  Your friend invited you!
                </strong>{" "}
                Join the waitlist to secure your spot.
              </span>
            )}
          </p>
        </section>

        {/* Main Content */}
        <section
          style={{
            position: "relative",
            zIndex: 5,
            maxWidth: "1000px",
            margin: "0 auto",
            padding: "2rem",
          }}
        >
          <div
            className="waitlist-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "2rem",
              alignItems: "start",
            }}
          >
            {/* Left: Form or Success */}
            <div>
              {!entry ? (
                <div
                  className="waitlist-form"
                  style={{
                    background: "white",
                    padding: "2.5rem",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--text-dark)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    Join the Waitlist
                  </h2>
                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text-muted)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    Be first to know when registration opens.
                  </p>

                  <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: "1rem" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-dark)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Email *
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="survivor.fan@email.com"
                        style={{
                          width: "100%",
                          padding: "0.875rem 1rem",
                          border: "2px solid #e0e0e0",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--brand-red)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "#e0e0e0")
                        }
                      />
                    </div>

                    <div style={{ marginBottom: "1.5rem" }}>
                      <label
                        style={{
                          display: "block",
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: "var(--text-dark)",
                          marginBottom: "0.5rem",
                        }}
                      >
                        Name (optional)
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        style={{
                          width: "100%",
                          padding: "0.875rem 1rem",
                          border: "2px solid #e0e0e0",
                          borderRadius: "8px",
                          fontSize: "1rem",
                          transition: "border-color 0.2s",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--brand-red)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "#e0e0e0")
                        }
                      />
                    </div>

                    {error && (
                      <div
                        role="alert"
                        style={{
                          background: "#fee2e2",
                          color: "#dc2626",
                          padding: "0.75rem",
                          borderRadius: "8px",
                          marginBottom: "1rem",
                          fontSize: "0.9rem",
                        }}
                      >
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="referral-btn"
                      style={{
                        width: "100%",
                        padding: "1rem",
                        background: isSubmitting
                          ? "#ccc"
                          : "var(--brand-red)",
                        border: "none",
                        color: "white",
                        borderRadius: "8px",
                        fontWeight: 700,
                        fontSize: "1rem",
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {isSubmitting ? "Joining..." : "Join Waitlist"}
                    </button>
                  </form>

                  {waitlistCount > 0 && (
                    <p
                      style={{
                        textAlign: "center",
                        fontSize: "0.85rem",
                        color: "var(--text-muted)",
                        marginTop: "1rem",
                      }}
                    >
                      <strong>{waitlistCount}</strong> fans already waiting
                    </p>
                  )}
                </div>
              ) : (
                <div
                  className="success-card"
                  style={{
                    position: "relative",
                    background: "white",
                    padding: "2.5rem",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                    textAlign: "center",
                  }}
                >
                  <h2
                    style={{
                      fontSize: "1.5rem",
                      fontWeight: 800,
                      color: "var(--brand-red)",
                      marginBottom: "0.5rem",
                    }}
                  >
                    You're In!
                  </h2>

                  <div
                    className="position-number"
                    style={{
                      fontSize: "4rem",
                      fontWeight: 900,
                      color: "var(--brand-red)",
                      fontFamily: "Impact, sans-serif",
                      margin: "1rem 0",
                    }}
                  >
                    #{entry.position}
                  </div>

                  <p
                    style={{
                      fontSize: "0.95rem",
                      color: "var(--text-muted)",
                      marginBottom: "1.5rem",
                    }}
                  >
                    You're <strong>#{entry.position}</strong> on the waitlist
                    for {entry.seasonName}
                  </p>

                  <div
                    style={{
                      background: "#f5f5f5",
                      padding: "1.5rem",
                      borderRadius: "12px",
                      marginBottom: "1rem",
                    }}
                  >
                    <p
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-dark)",
                        marginBottom: "0.75rem",
                      }}
                    >
                      🔗 Your Referral Link
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type="text"
                        readOnly
                        value={entry.referralLink}
                        style={{
                          flex: 1,
                          padding: "0.75rem",
                          border: "1px solid #ddd",
                          borderRadius: "6px",
                          fontSize: "0.85rem",
                          background: "white",
                        }}
                      />
                      <button
                        onClick={copyReferralLink}
                        style={{
                          padding: "0.75rem 1rem",
                          background: copied ? "#22c55e" : "var(--brand-red)",
                          border: "none",
                          color: "white",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {copied ? "✓ Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "0.9rem",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    Share your link to move up the waitlist!
                    <br />
                    <strong>Each referral = priority access</strong>
                  </p>

                  {/* Social Share Buttons */}
                  <div
                    style={{
                      display: "flex",
                      gap: "0.75rem",
                      justifyContent: "center",
                      marginTop: "1.5rem",
                    }}
                  >
                    <a
                      href={`https://twitter.com/intent/tweet?text=I%27m%20%23${entry.position}%20on%20the%20waitlist%20for%20Survivor%20Fantasy%20League%20Season%2050!%20Join%20me:%20${encodeURIComponent(entry.referralLink)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: "0.75rem 1.25rem",
                        background: "#1DA1F2",
                        color: "white",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      Share on X
                    </a>
                    <a
                      href={`sms:?body=Join%20me%20on%20Survivor%20Fantasy%20League!%20${encodeURIComponent(entry.referralLink)}`}
                      style={{
                        padding: "0.75rem 1.25rem",
                        background: "#22c55e",
                        color: "white",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: 600,
                        fontSize: "0.85rem",
                      }}
                    >
                      Text a Friend
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Info + Leaderboard */}
            <div>
              {/* Features */}
              <div
                style={{
                  background: "white",
                  padding: "2rem",
                  borderRadius: "16px",
                  boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                  marginBottom: "1.5rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.1rem",
                    fontWeight: 700,
                    color: "var(--text-dark)",
                    marginBottom: "1rem",
                  }}
                >
                  What You'll Get
                </h3>
                <ul
                  style={{
                    listStyle: "none",
                    padding: 0,
                    margin: 0,
                  }}
                >
                  {[
                    "100+ scoring rules for deep strategy",
                    "Snake draft with your league",
                    "Weekly picks during the season",
                    "Real-time leaderboards",
                    "SMS reminders before deadlines",
                    "Compete against superfans worldwide",
                  ].map((item, i) => (
                    <li
                      key={i}
                      style={{
                        padding: "0.5rem 0",
                        fontSize: "0.95rem",
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <span style={{ color: "var(--brand-red)" }}>✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Referral Leaderboard */}
              {leaderboard.length > 0 && (
                <div
                  style={{
                    background: "white",
                    padding: "2rem",
                    borderRadius: "16px",
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.1rem",
                      fontWeight: 700,
                      color: "var(--text-dark)",
                      marginBottom: "1rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    🏆 Top Referrers
                  </h3>
                  <div>
                    {leaderboard.slice(0, 5).map((leader, i) => (
                      <div
                        key={i}
                        className="leaderboard-item"
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.75rem 0",
                          borderBottom:
                            i < leaderboard.length - 1
                              ? "1px solid #eee"
                              : "none",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              width: "24px",
                              height: "24px",
                              background:
                                i === 0
                                  ? "#FFD700"
                                  : i === 1
                                    ? "#C0C0C0"
                                    : i === 2
                                      ? "#CD7F32"
                                      : "#f0f0f0",
                              borderRadius: "50%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: 700,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span
                            style={{
                              fontWeight: 600,
                              color: "var(--text-dark)",
                            }}
                          >
                            {leader.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontWeight: 700,
                            color: "var(--brand-red)",
                          }}
                        >
                          {leader.referralCount}{" "}
                          {leader.referralCount === 1 ? "referral" : "referrals"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          style={{
            position: "relative",
            zIndex: 5,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p
            style={{
              fontSize: "0.85rem",
              color: "var(--text-muted)",
            }}
          >
            © 2025 Reality Games Fantasy League
          </p>
        </footer>
      </main>
    </>
  );
};

export default Season50Waitlist;
