import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import {
  LoadingSpinner,
  SkeletonCard,
  ErrorBoundary,
  UnauthorizedError,
} from "@/components/ui";

interface ProfileStats {
  leagueCount: number;
  officialLeagueCount: number;
  customLeagueCount: number;
  totalPoints: number;
  bestLeaguePoints: number;
  bestLeagueName: string | null;
  weeksPlayed: number;
}

const Profile: React.FC = () => {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [city, setCity] = useState(user?.city || "");
  const [state, setState] = useState(user?.state || "");
  const [favoriteCastaway, setFavoriteCastaway] = useState(user?.favoriteCastaway || "");
  const [favoriteCharity, setFavoriteCharity] = useState(user?.favoriteCharity || "");
  const [charityUrl, setCharityUrl] = useState(user?.charityUrl || "");
  const [about, setAbout] = useState(user?.about || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(user?.profilePicture || null);
  const [profileStats, setProfileStats] = useState<ProfileStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Fetch profile stats on mount
  React.useEffect(() => {
    let isMounted = true;

    const fetchStats = async () => {
      try {
        const response = await api.get("/api/users/profile-stats");
        if (!isMounted) return;
        setProfileStats(response.data);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load profile stats:", error);
      } finally {
        if (!isMounted) return;
        setStatsLoading(false);
      }
    };
    fetchStats();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setMessage({ type: "error", text: "Please upload a valid image file (JPG, PNG, GIF, or WebP)" });
      e.target.value = '';
      return;
    }

    // Validate file size
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Image must be less than 5MB" });
      e.target.value = '';
      return;
    }

    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post("/api/users/profile-picture", formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        timeout: 30000 // 30 second timeout for uploads
      });

      if (!response.data?.profilePicture) {
        throw new Error("Invalid response from server");
      }

      setProfileImage(response.data.profilePicture);
      if (user) {
        setUser({ ...user, ...response.data });
      }
      setMessage({ type: "success", text: "Profile picture updated successfully!" });
      e.target.value = ''; // Clear input
    } catch (error: any) {
      console.error("Image upload error:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.error || error.message || "Failed to upload image. Please try again."
      });
      e.target.value = ''; // Clear input on error
    } finally {
      setUploading(false);
    }
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .toUpperCase()
      .slice(0, 2) || "??";
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (favoriteCastaway.length > 35) {
      setMessage({ type: "error", text: "Favorite castaway must be 35 characters or less" });
      return;
    }
    if (about.length > 250) {
      setMessage({ type: "error", text: "About must be 250 characters or less" });
      return;
    }

    setLoading(true);

    try {
      const response = await api.put("/api/users/profile", {
        name,
        username,
        displayName,
        city,
        state,
        favoriteCastaway,
        favoriteCharity,
        charityUrl,
        about,
        email
      });
      setUser(response.data.user);
      setMessage({ type: "success", text: "Profile updated successfully!" });
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to update profile"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match" });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Password must be at least 6 characters" });
      return;
    }

    setLoading(true);

    try {
      await api.put("/api/users/password", {
        currentPassword,
        newPassword
      });
      setMessage({ type: "success", text: "Password changed successfully!" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      setMessage({
        type: "error",
        text: error.response?.data?.error || "Failed to change password"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="rg-page">
        <section className="rg-section">
          <UnauthorizedError />
        </section>
      </div>
    );
  }

  return (
    <main
      role="main"
      aria-label="Profile settings"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F3EED9 0%, #E8DCC8 100%)",
        padding: "3rem 2rem"
      }}
    >
      <div style={{
        maxWidth: "1200px",
        margin: "0 auto"
      }}>
        {/* Outer Card */}
        <div style={{
          background: "white",
          borderRadius: "1.5rem",
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.08)",
          padding: "3rem"
        }}>
          {/* Top Pill */}
          <div style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
            color: "white",
            padding: "0.5rem 1.25rem",
            borderRadius: "9999px",
            fontSize: "0.875rem",
            fontWeight: 600,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: "1rem"
          }}>
            Profile
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: "2.5rem",
            fontWeight: 700,
            color: "#1a1a1a",
            marginTop: 0,
            marginBottom: "0.75rem",
            lineHeight: 1.2
          }}>
            Edit Your Profile
          </h1>

          {/* Subcopy */}
          <p style={{
            fontSize: "1.125rem",
            color: "#666",
            maxWidth: "65ch",
            marginBottom: "3rem",
            lineHeight: 1.6
          }}>
            Update your account information and password. Your profile helps other players get to know you in the league.
          </p>

          {/* Message */}
          {message && (
            <div
              role="alert"
              aria-live="polite"
              style={{
                padding: "1rem 1.5rem",
                borderRadius: "0.75rem",
                marginBottom: "2rem",
                background: message.type === "success" ? "#d4edda" : "#f8d7da",
                color: message.type === "success" ? "#155724" : "#721c24",
                border: `1px solid ${message.type === "success" ? "#c3e6cb" : "#f5c6cb"}`
              }}
            >
              {message.text}
            </div>
          )}

          {/* Profile Picture Section */}
          <div style={{
            background: "#f9f9f9",
            borderRadius: "1rem",
            border: "2px solid #e5e5e5",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: "0.5rem",
              color: "#1a1a1a"
            }}>
              Profile Picture
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Upload a profile picture to personalize your account.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "2rem", flexWrap: "wrap" }}>
              <div
                style={{
                  width: "120px",
                  height: "120px",
                  borderRadius: "50%",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "2.5rem",
                  fontWeight: 600,
                  background: profileImage ? `url(${profileImage})` : "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  color: "#fff",
                  border: "4px solid #e5e5e5",
                  flexShrink: 0
                }}
              >
                {!profileImage && getInitials(user?.name || "")}
              </div>
              <div>
                <input
                  type="file"
                  id="profilePicture"
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
                <button
                  type="button"
                  onClick={() => document.getElementById('profilePicture')?.click()}
                  disabled={uploading}
                  style={{
                    background: "var(--brand-red)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: uploading ? "not-allowed" : "pointer",
                    opacity: uploading ? 0.6 : 1,
                    transition: "all 0.2s"
                  }}
                >
                  {uploading ? "Uploading..." : "Choose Image"}
                </button>
                <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.75rem 0 0 0" }}>
                  JPG, PNG or GIF. Max size 5MB.
                </p>
              </div>
            </div>
          </div>

          {/* League Activity */}
          <div style={{
            background: "#f9f9f9",
            borderRadius: "1rem",
            border: "2px solid #e5e5e5",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: "0.5rem",
              color: "#1a1a1a"
            }}>
              League Activity
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Your performance across all leagues.
            </p>
            {statsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                <LoadingSpinner size="md" label="Loading stats" />
              </div>
            ) : profileStats ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.25rem" }}>
                <div style={{ textAlign: "center", padding: "1.25rem", background: "#fff", borderRadius: "0.75rem", border: "2px solid #10B981" }}>
                  <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "#065F46" }}>{profileStats.leagueCount}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>Total Leagues</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                    {profileStats.officialLeagueCount} Official • {profileStats.customLeagueCount} Custom
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: "1.25rem", background: "#fff", borderRadius: "0.75rem", border: "2px solid #3B82F6" }}>
                  <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "#1E3A8A" }}>{profileStats.totalPoints}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>Total Points</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>Across all leagues</div>
                </div>
                <div style={{ textAlign: "center", padding: "1.25rem", background: "#fff", borderRadius: "0.75rem", border: "2px solid #F59E0B" }}>
                  <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "#92400E" }}>{profileStats.bestLeaguePoints}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>Best League</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>
                    {profileStats.bestLeagueName || "No data yet"}
                  </div>
                </div>
                <div style={{ textAlign: "center", padding: "1.25rem", background: "#fff", borderRadius: "0.75rem", border: "2px solid #A42828" }}>
                  <div style={{ fontSize: "2.25rem", fontWeight: 700, color: "#A42828" }}>{profileStats.weeksPlayed}</div>
                  <div style={{ fontSize: "0.875rem", color: "#666", marginTop: "0.5rem" }}>Weeks Played</div>
                  <div style={{ fontSize: "0.75rem", color: "#888", marginTop: "0.25rem" }}>Total participation</div>
                </div>
              </div>
            ) : (
              <p style={{ color: "#999" }}>Unable to load league statistics.</p>
            )}
          </div>

          {/* Account Information */}
          <div style={{
            background: "#f9f9f9",
            borderRadius: "1rem",
            border: "2px solid #e5e5e5",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: "0.5rem",
              color: "#1a1a1a"
            }}>
              Account Information
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Manage your personal details and contact information.
            </p>
            <form onSubmit={handleUpdateProfile} aria-label="Update profile information">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                <div>
                  <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Email (used for login)
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem",
                      transition: "border-color 0.2s"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Display Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="username" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Username (shown on rankings)
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="displayName" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Alternate Name (optional)
                  </label>
                  <input
                    type="text"
                    id="displayName"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Nickname"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="city" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Your city"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="state" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    State
                  </label>
                  <input
                    type="text"
                    id="state"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    placeholder="Your state"
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <label htmlFor="favoriteCastaway" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                  Favorite Castaway (max 35 characters)
                  <span style={{ float: "right", fontSize: "0.85rem", color: favoriteCastaway.length > 35 ? "crimson" : "#666" }}>
                    {favoriteCastaway.length}/35
                  </span>
                </label>
                <input
                  type="text"
                  id="favoriteCastaway"
                  value={favoriteCastaway}
                  onChange={(e) => setFavoriteCastaway(e.target.value)}
                  placeholder="Your favorite Survivor player"
                  maxLength={35}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${favoriteCastaway.length > 35 ? "#dc3545" : "#e5e5e5"}`,
                    fontSize: "1rem"
                  }}
                />
              </div>

              {/* I Am Playing For (Charity) */}
              <div style={{
                marginTop: "1.25rem",
                background: "linear-gradient(135deg, #fff5f5 0%, #fff0e0 100%)",
                border: "2px solid #ff6b35",
                borderRadius: "0.75rem",
                padding: "1.25rem"
              }}>
                <label htmlFor="favoriteCharity" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#d4542a" }}>
                  I am playing for...
                  <span style={{ float: "right", fontSize: "0.85rem", color: favoriteCharity.length > 100 ? "crimson" : "#666" }}>
                    {favoriteCharity.length}/100
                  </span>
                </label>
                <p style={{ fontSize: "0.875rem", color: "#666", marginBottom: "0.75rem" }}>
                  Share the charity or cause you're playing for. When you win a paid league, your charity gets the pot!
                </p>
                <input
                  type="text"
                  id="favoriteCharity"
                  value={favoriteCharity}
                  onChange={(e) => setFavoriteCharity(e.target.value)}
                  placeholder="e.g., St. Jude Children's Research Hospital"
                  maxLength={100}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${favoriteCharity.length > 100 ? "#dc3545" : "#e5e5e5"}`,
                    fontSize: "1rem",
                    marginBottom: "0.75rem"
                  }}
                />
                <label htmlFor="charityUrl" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 500, color: "#555", fontSize: "0.9rem" }}>
                  Charity Website (optional)
                </label>
                <input
                  type="url"
                  id="charityUrl"
                  value={charityUrl}
                  onChange={(e) => setCharityUrl(e.target.value)}
                  placeholder="https://www.stjude.org"
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: "2px solid #e5e5e5",
                    fontSize: "1rem"
                  }}
                />
              </div>

              <div style={{ marginTop: "1.25rem" }}>
                <label htmlFor="about" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                  About You (max 250 characters)
                  <span style={{ float: "right", fontSize: "0.85rem", color: about.length > 250 ? "crimson" : "#666" }}>
                    {about.length}/250
                  </span>
                </label>
                <textarea
                  id="about"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  placeholder="Tell us about yourself and your Survivor fandom..."
                  rows={4}
                  maxLength={250}
                  style={{
                    width: "100%",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    border: `2px solid ${about.length > 250 ? "#dc3545" : "#e5e5e5"}`,
                    fontSize: "1rem",
                    resize: "vertical",
                    fontFamily: "inherit"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading || favoriteCastaway.length > 35 || about.length > 250}
                style={{
                  marginTop: "1.5rem",
                  background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.875rem 2rem",
                  fontSize: "1.0625rem",
                  fontWeight: 600,
                  cursor: (loading || favoriteCastaway.length > 35 || about.length > 250) ? "not-allowed" : "pointer",
                  opacity: (loading || favoriteCastaway.length > 35 || about.length > 250) ? 0.6 : 1,
                  transition: "all 0.2s"
                }}
              >
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </form>
          </div>

          {/* SMS Settings */}
          <div style={{
            background: "#f9f9f9",
            borderRadius: "1rem",
            border: "2px solid #e5e5e5",
            padding: "2rem",
            marginBottom: "2rem"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: "0.5rem",
              color: "#1a1a1a"
            }}>
              SMS Notifications
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Get weekly picks and leaderboard updates via text message.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
              {user?.phone ? (
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{
                    padding: "0.5rem 1rem",
                    background: "#e8f5e9",
                    borderRadius: "0.5rem",
                    fontWeight: 600,
                    color: "#2e7d32"
                  }}>
                    ✓ SMS Enabled
                  </span>
                  <button
                    onClick={() => navigate("/profile/sms")}
                    style={{
                      background: "white",
                      color: "var(--brand-red)",
                      border: "2px solid var(--brand-red)",
                      borderRadius: "0.5rem",
                      padding: "0.75rem 1.5rem",
                      fontSize: "1rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                  >
                    Manage SMS Settings
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => navigate("/profile/sms")}
                  style={{
                    background: "linear-gradient(135deg, #4CAF50 0%, #45a049 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "0.5rem",
                    padding: "0.75rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  📱 Set Up SMS Notifications
                </button>
              )}
            </div>
          </div>

          {/* Change Password */}
          <div style={{
            background: "#f9f9f9",
            borderRadius: "1rem",
            border: "2px solid #e5e5e5",
            padding: "2rem"
          }}>
            <h2 style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginTop: 0,
              marginBottom: "0.5rem",
              color: "#1a1a1a"
            }}>
              Change Password
            </h2>
            <p style={{ color: "#666", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              Update your password to keep your account secure. Passwords must be at least 6 characters.
            </p>
            <form onSubmit={handleChangePassword} aria-label="Change password">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.25rem" }}>
                <div>
                  <label htmlFor="currentPassword" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label htmlFor="confirmPassword" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600, color: "#333" }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    style={{
                      width: "100%",
                      padding: "0.75rem 1rem",
                      borderRadius: "0.5rem",
                      border: "2px solid #e5e5e5",
                      fontSize: "1rem"
                    }}
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: "1.5rem",
                  background: "linear-gradient(135deg, #ff6b35 0%, #d4542a 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "0.5rem",
                  padding: "0.875rem 2rem",
                  fontSize: "1.0625rem",
                  fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.6 : 1,
                  transition: "all 0.2s"
                }}
              >
                {loading ? "Changing..." : "Change Password"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Profile;
