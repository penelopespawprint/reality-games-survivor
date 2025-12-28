import React from "react";
import { useAuth } from "../context/AuthContext";

const UserProfile: React.FC = () => {
  const { user } = useAuth();

  if (!user) return <div className="rg-page">You are not logged in.</div>;

  return (
    <main role="main" aria-label="User Profile" className="rg-page">
      <section className="rg-hero" aria-labelledby="profile-title" style={{ maxWidth: 640 }}>
        <span className="rg-pill">Profile</span>
        <h1 id="profile-title">Welcome, {user.name}</h1>
        <p>
          Keep your contact info up to date and review your league credentials. Profile editing is coming in a future
          release.
        </p>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem", maxWidth: 640 }}>
        <div className="rg-grid">
          <article className="rg-card">
            <h3>Name</h3>
            <p>{user.name}</p>
          </article>
          <article className="rg-card">
            <h3>Email</h3>
            <p>{user.email}</p>
          </article>
          <article className="rg-card">
            <h3>Role</h3>
            <p>{user.isAdmin ? "League Admin" : "Player"}</p>
          </article>
        </div>
      </section>
    </main>
  );
};

export default UserProfile;
