import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "@/lib/api";
import { Castaway } from "@/shared/types";
import { routes } from "@/shared/routes";

const CastawayProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [castaway, setCastaway] = useState<Castaway | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (!id) {
      setErr("Missing castaway ID");
      setLoading(false);
      return;
    }

    let isMounted = true;

    api.get(`/api/castaways/${id}`)
      .then(res => {
        if (!isMounted) return;
        setCastaway(res.data);
      })
      .catch(() => {
        if (!isMounted) return;
        setErr("Could not fetch castaway.");
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) return <div className="rg-page">Loading castaway...</div>;
  if (err) return <div className="rg-page" style={{ color: "crimson" }}>{err}</div>;
  if (!castaway) return <div className="rg-page">Castaway not found.</div>;

  return (
    <main role="main" aria-label="Castaway Profile" className="rg-page">
      <section className="rg-section" style={{ maxWidth: 600 }}>
        <Link to={routes.dashboard} style={{ marginBottom: "1rem", display: "inline-flex" }}>
          &larr; Back to dashboard
        </Link>
        <h2>{castaway.name}</h2>
        <p style={{ color: "var(--text-muted)" }}>{castaway.tribe ? `${castaway.tribe} tribe` : ""}</p>
        <div className="rg-grid" style={{ marginTop: "1.5rem" }}>
          <div className="rg-card">
            <strong>Age</strong>
            <p>{castaway.age ?? "–"}</p>
          </div>
          <div className="rg-card">
            <strong>Occupation</strong>
            <p>{castaway.occupation ?? "–"}</p>
          </div>
          <div className="rg-card">
            <strong>Hometown</strong>
            <p>{castaway.hometown ?? "–"}</p>
          </div>
        </div>
        <div style={{ marginTop: "2rem" }}>
          <Link to={routes.weeklyPicks}>
            <button>Set Weekly Pick</button>
          </Link>
        </div>
      </section>
    </main>
  );
};

export default CastawayProfile;
