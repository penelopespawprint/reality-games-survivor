import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { Castaway } from "@/shared/types";

type CastawayFormState = Partial<Castaway> & { id?: string };

const defaultForm: CastawayFormState = {
  id: undefined,
  name: "",
  tribe: "",
  occupation: "",
  age: undefined,
  hometown: "",
  imageUrl: ""
};

const CastawayManager = () => {
  const [castaways, setCastaways] = useState<Castaway[]>([]);
  const [form, setForm] = useState<CastawayFormState>(defaultForm);
  const [status, setStatus] = useState<"idle" | "saving" | "error" | "success">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadCastaways = async () => {
    try {
      const res = await api.get("/api/castaways");
      setCastaways(res.data);
    } catch (error) {
      console.error("Failed to load castaways:", error);
    }
  };

  useEffect(() => {
    loadCastaways();
  }, []);

  const resetForm = () => {
    setForm(defaultForm);
    setStatus("idle");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setStatus("error");
      return;
    }
    setStatus("saving");
    try {
      const payload = {
        name: form.name,
        tribe: form.tribe,
        occupation: form.occupation,
        hometown: form.hometown,
        imageUrl: form.imageUrl,
        age: form.age ? Number(form.age) : undefined
      };

      if (form.id) {
        console.log("Updating castaway:", form.id, payload);
        await api.put(`/api/admin/castaway/${form.id}`, payload);
      } else {
        console.log("Creating castaway:", payload);
        await api.post("/api/admin/castaway", payload);
      }

      await loadCastaways();
      resetForm();
      setStatus("success");
      setMessage("Castaway saved successfully!");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error.message || "Failed to save castaway";
      console.error("Failed to save castaway:", errorMsg);
      setMessage(errorMsg);
      setStatus("error");
    }
  };

  const handleEdit = (castaway: Castaway) => {
    setForm({
      id: castaway.id,
      name: castaway.name,
      tribe: castaway.tribe,
      occupation: castaway.occupation,
      hometown: castaway.hometown,
      imageUrl: castaway.imageUrl,
      age: castaway.age
    });
    setStatus("idle");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this castaway?")) return;
    try {
      const response = await api.delete(`/api/admin/castaway/${id}`);
      console.log("Delete response:", response);
      await loadCastaways();
      if (form.id === id) {
        resetForm();
      }
      setStatus("success");
      setMessage("Castaway deleted successfully!");
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error.message || "Failed to delete castaway";
      console.error("Failed to delete castaway:", errorMsg);
      setMessage(errorMsg);
      setStatus("error");
    }
  };

  const handleEliminate = async (castaway: Castaway) => {
    if (!window.confirm(`Mark ${castaway.name} as ${castaway.eliminated ? "active" : "eliminated"}?`)) return;
    try {
      const newEliminated = !castaway.eliminated;
      console.log(`Toggling ${castaway.name} elimination to:`, newEliminated);
      const response = await api.put(`/api/admin/castaway/${castaway.id}`, {
        eliminated: newEliminated
      });
      console.log("Eliminate response:", response);
      await loadCastaways();
      setStatus("success");
      setMessage(`${castaway.name} ${newEliminated ? "eliminated" : "restored"}!`);
      setTimeout(() => setStatus("idle"), 2000);
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || error.message || "Failed to toggle elimination";
      console.error("Failed to toggle elimination:", errorMsg);
      setMessage(errorMsg);
      setStatus("error");
    }
  };

  return (
    <main role="main" aria-label="Castaway Management" className="rg-page">
      <section className="rg-hero" aria-labelledby="castaway-mgmt-title">
        <span className="rg-pill">Castaway Management</span>
        <h1 id="castaway-mgmt-title">Manage Survivor Castaways</h1>
        <p>
          Create, edit, and manage all castaways for this season
        </p>
      </section>

      <section className="rg-section">
        <h2>{form.id ? "Edit Castaway" : "Add New Castaway"}</h2>
        <form onSubmit={handleSubmit} style={{ maxWidth: "600px", display: "grid", gap: "1rem", background: "white", padding: "2rem", borderRadius: "12px", border: "2px solid var(--border-light)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor="castaway-name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Name *</label>
              <input
                id="castaway-name"
                placeholder="Name"
                value={form.name ?? ""}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label htmlFor="castaway-tribe" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Tribe</label>
              <input
                id="castaway-tribe"
                placeholder="Tribe"
                value={form.tribe ?? ""}
                onChange={(e) => setForm({ ...form, tribe: e.target.value })}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            <div>
              <label htmlFor="castaway-occupation" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Occupation</label>
              <input
                id="castaway-occupation"
                placeholder="Occupation"
                value={form.occupation ?? ""}
                onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              />
            </div>
            <div>
              <label htmlFor="castaway-age" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Age</label>
              <input
                id="castaway-age"
                placeholder="Age"
                type="number"
                value={form.age ?? ""}
                onChange={(e) => setForm({ ...form, age: e.target.value ? Number(e.target.value) : undefined })}
                min={18}
              />
            </div>
          </div>

          <div>
            <label htmlFor="castaway-hometown" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Hometown</label>
            <input
              id="castaway-hometown"
              placeholder="From → Lives in"
              value={form.hometown ?? ""}
              onChange={(e) => setForm({ ...form, hometown: e.target.value })}
            />
          </div>

          <div>
            <label htmlFor="castaway-img" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Image URL</label>
            <input
              id="castaway-img"
              placeholder="https://..."
              value={form.imageUrl ?? ""}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            />
          </div>

          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
            <button type="submit" disabled={status === "saving"} style={{ background: "var(--brand-red)" }}>
              {status === "saving" ? "Saving..." : form.id ? "Update Castaway" : "Create Castaway"}
            </button>
            {form.id && (
              <button type="button" onClick={resetForm} style={{ background: "#6b7280" }}>
                Cancel
              </button>
            )}
          </div>
          {message && (
            <p style={{
              color: status === "success" ? "#22c55e" : "#ef4444",
              fontWeight: 600,
              padding: "0.75rem",
              background: status === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              borderRadius: "6px"
            }}>
              {message}
            </p>
          )}
        </form>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <h2>All Castaways ({castaways.length})</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1.5rem", marginTop: "1.5rem" }}>
          {castaways.map((c) => (
            <div
              key={c.id}
              style={{
                background: "#D4AF88",
                borderRadius: "12px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                border: c.eliminated ? "3px solid #6b7280" : "3px solid #8B4513",
                opacity: c.eliminated ? 0.6 : 1
              }}
            >
              <div>
                <strong style={{ fontSize: "1.1rem", display: "block", marginBottom: "0.25rem" }}>{c.name}</strong>
                {c.eliminated && (
                  <span style={{ background: "#ef4444", color: "white", padding: "0.25rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 600 }}>
                    ELIMINATED
                  </span>
                )}
                <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#4a3520" }}>
                  {c.tribe || "No tribe"} • {c.age ? `${c.age} yrs` : "Age unknown"}
                </p>
                <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.85rem", color: "#4a3520", fontStyle: "italic" }}>
                  {c.occupation || "No occupation"}
                </p>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "auto" }}>
                <button
                  type="button"
                  onClick={() => handleEdit(c)}
                  style={{ background: "var(--brand-red)", fontSize: "0.85rem", padding: "0.5rem" }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleEliminate(c)}
                  style={{ background: c.eliminated ? "#10b981" : "#6b7280", fontSize: "0.85rem", padding: "0.5rem" }}
                >
                  {c.eliminated ? "Restore" : "Eliminate"}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id)}
                  style={{ background: "#ef4444", fontSize: "0.85rem", padding: "0.5rem" }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
};

export default CastawayManager;
