import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Castaway } from "../shared/types";
import { useAuth } from "@/context/AuthContext";
import BewareAdvantageModal from "@/components/BewareAdvantageModal";
import { LoadingSpinner } from "@/components/ui";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type RankingRow = {
  castawayId: string;
  castaway: Castaway;
  position?: number;
};

// Sortable Item Component
function SortableRankingItem({ row, index, locked, getImagePath }: {
  row: RankingRow;
  index: number;
  locked: boolean;
  getImagePath: (name: string) => string;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.castawayId, disabled: locked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: locked ? 'default' : 'grab',
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className="rg-card"
      {...attributes}
      {...listeners}
    >
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.75rem",
        userSelect: "none"
      }}>
        <span style={{ fontWeight: 700, fontSize: "0.9rem", minWidth: "24px", color: "var(--brand-red)" }}>{index + 1}</span>
        <img
          src={getImagePath(row.castaway.name)}
          alt={row.castaway.name}
          style={{
            width: "36px",
            height: "36px",
            borderRadius: "6px",
            objectFit: "cover",
            pointerEvents: "none"
          }}
          onError={(e) => {
            (e.target as HTMLImageElement).src = "/images/placeholder.png";
          }}
        />
        <span style={{ flex: 1, fontSize: "0.95rem", fontWeight: 600 }}>{row.castaway.name}</span>
        {!locked && (
          <span style={{ fontSize: "1rem", color: "#999" }}>⋮⋮</span>
        )}
      </div>
    </li>
  );
}

const PreseasonRank: React.FC = () => {
  const { user, setUser } = useAuth();
  const [rows, setRows] = useState<RankingRow[]>([]);
  const [locked, setLocked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [viewMode, setViewMode] = useState<'drag' | 'text'>('drag');
  const [textRankings, setTextRankings] = useState('');

  useEffect(() => {
    // Check if user has seen the welcome modal
    if (user && !user.hasSeenWelcome) {
      setShowWelcomeModal(true);
    }
  }, [user]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    let isMounted = true;

    async function load() {
      try {
        setLoading(true);
        const res = await api.get("/api/rankings/me");
        if (!isMounted) return;

        setLocked(res.data.locked ?? false);
        const order = res.data.order as RankingRow[];
        setRows(order);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load rankings:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setRows((items) => {
        const oldIndex = items.findIndex(item => item.castawayId === active.id);
        const newIndex = items.findIndex(item => item.castawayId === over.id);

        if (oldIndex === -1 || newIndex === -1) {
          return items;
        }

        return arrayMove(items, oldIndex, newIndex);
      });
      setMessage(null);
    }
  };

  const handleCloseWelcome = async () => {
    setShowWelcomeModal(false);
    // Mark the modal as seen on the backend
    try {
      await api.post("/api/users/mark-welcome-seen");
      // Update user context
      if (user && setUser) {
        setUser({ ...user, hasSeenWelcome: true });
      }
    } catch (error) {
      console.error("Failed to mark welcome as seen:", error);
    }
  };

  const applyTextRankings = () => {
    const names = textRankings.split('\n').map(line => line.trim()).filter(line => line);

    if (names.length !== rows.length) {
      setMessage(`Please enter exactly ${rows.length} castaway names (one per line)`);
      return;
    }

    const newOrder: RankingRow[] = [];
    const unmatchedNames: string[] = [];

    // Helper to normalize names for matching (remove quotes and extra spaces)
    const normalizeName = (name: string) => {
      return name.toLowerCase().replace(/["']/g, '').replace(/\s+/g, ' ').trim();
    };

    for (const name of names) {
      const normalizedInput = normalizeName(name);
      const found = rows.find(row =>
        normalizeName(row.castaway.name) === normalizedInput
      );
      if (found) {
        newOrder.push(found);
      } else {
        unmatchedNames.push(name);
      }
    }

    if (unmatchedNames.length > 0) {
      setMessage(`Could not find: ${unmatchedNames.join(', ')}`);
      return;
    }

    setRows(newOrder);
    setViewMode('drag');
    setMessage('Rankings updated! Click "Save Rankings" to save.');
  };

  const switchToTextMode = () => {
    const text = rows.map(row => row.castaway.name).join('\n');
    setTextRankings(text);
    setViewMode('text');
  };

  const save = async () => {
    if (locked) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/api/rankings/me", {
        order: rows.map((row) => row.castawayId)
      });
      setMessage("Rankings saved! Once the draft runs, they will be locked.");

      // Close the welcome modal if it's still showing
      if (showWelcomeModal) {
        handleCloseWelcome();
      }
    } catch (error: any) {
      console.error("Failed to save rankings:", error);
      setMessage(error?.response?.data?.error ?? "Unable to save rankings");
    } finally {
      setSaving(false);
    }
  };

  const getImagePath = (name: string) => {
    // Handle special naming cases
    let imageName = name;

    if (name.includes("MC")) {
      imageName = 'Michelle MC Chukwujekwu';
    } else if (name.includes("Annie")) {
      imageName = 'Kimberly Annie Davis';
    }

    // Images are webp files in client/public/images (served at /images/)
    return `/images/${imageName}.webp`;
  };

  if (loading) {
    return (
      <div className="rg-page">
        <LoadingSpinner size="lg" label="Loading rankings..." />
      </div>
    );
  }

  return (
    <main role="main" aria-label="Preseason Rankings" className="rg-page" style={{
      opacity: 0.6,
      pointerEvents: 'none',
      userSelect: 'none'
    }}>
      {showWelcomeModal && <BewareAdvantageModal onClose={handleCloseWelcome} />}

      <section className="rg-hero">
        <span className="rg-pill">Preseason Rankings - Locked</span>
        <h1>Rankings are now locked.</h1>
        <p>
          The draft has been completed and your castaways have been assigned based on your rankings. You can view your rankings below, but editing is no longer available.
        </p>
        {!locked && (
          <div style={{
            background: "rgba(164, 40, 40, 0.1)",
            border: "2px solid var(--brand-red)",
            borderRadius: "12px",
            padding: "1.5rem",
            marginTop: "1.5rem"
          }}>
            <h3 style={{ margin: "0 0 0.75rem 0", color: "var(--brand-red)", fontSize: "1.1rem" }}>⏰ Important Deadlines</h3>
            <ul style={{ margin: 0, paddingLeft: "1.5rem", lineHeight: "1.8" }}>
              <li><strong>Rankings Deadline:</strong> Wed, October 8 at Noon PT</li>
              <li><strong>Draft:</strong> Wednesday, 12:00 PM PT</li>
              <li><strong>Your Castaways Loaded:</strong> Wednesday, 12:00 PM PT</li>
              <li><strong>Weekly Pick Deadline:</strong> Wednesday, 5:00 PM PT</li>
            </ul>
          </div>
        )}
        {locked && <p style={{ color: "crimson" }}>Rankings are locked. Await draft results.</p>}
        {!locked && <p style={{ color: "#666", fontSize: "0.95rem", marginTop: "0.5rem" }}>💡 Tip: Click and drag castaways to reorder your rankings</p>}
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        {!locked && (
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", alignItems: "center" }}>
            <button
              onClick={() => setViewMode('drag')}
              className={viewMode === 'drag' ? '' : 'button-secondary'}
              style={{ fontSize: "0.9rem" }}
            >
              Drag & Drop
            </button>
            <button
              onClick={switchToTextMode}
              className={viewMode === 'text' ? '' : 'button-secondary'}
              style={{ fontSize: "0.9rem" }}
            >
              Text Entry
            </button>
            <span style={{ fontSize: "0.85rem", color: "#666", marginLeft: "auto" }}>
              {rows.length} castaways to rank
            </span>
          </div>
        )}

        {viewMode === 'drag' ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={rows.map(row => row.castawayId)}
              strategy={verticalListSortingStrategy}
            >
              <ol style={{
                paddingLeft: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "0.5rem",
                listStyle: "none",
                margin: 0
              }}>
                {rows.map((row, index) => (
                  <SortableRankingItem
                    key={row.castawayId}
                    row={row}
                    index={index}
                    locked={locked}
                    getImagePath={getImagePath}
                  />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        ) : (
          <div>
            <p style={{ marginBottom: "1rem", fontSize: "0.95rem" }}>
              Enter castaway names in order of your ranking (1-{rows.length}), one per line.
              Names must match exactly.
            </p>
            <textarea
              value={textRankings}
              onChange={(e) => setTextRankings(e.target.value)}
              style={{
                width: "100%",
                minHeight: "400px",
                fontFamily: "monospace",
                fontSize: "0.9rem",
                padding: "1rem",
                borderRadius: "8px",
                border: "2px solid #ddd",
                resize: "vertical"
              }}
              placeholder="Enter castaway names, one per line..."
            />
            <button
              onClick={applyTextRankings}
              style={{ marginTop: "1rem" }}
            >
              Apply Rankings
            </button>
          </div>
        )}

        <div style={{ marginTop: "1.5rem" }}>
          <button onClick={save} disabled={locked || saving}>
            {saving ? "Saving..." : "Save Rankings"}
          </button>
          {message && <p style={{ marginTop: 12 }}>{message}</p>}
        </div>
      </section>
    </main>
  );
};

export default PreseasonRank;
