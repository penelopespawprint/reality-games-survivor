import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  username?: string | null;
  displayName?: string | null;
  city?: string | null;
  state?: string | null;
  favoriteCastaway?: string | null;
  about?: string | null;
  isAdmin: boolean;
  createdAt: string;
}

const UserManager = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editState, setEditState] = useState("");
  const [editFavoriteCastaway, setEditFavoriteCastaway] = useState("");
  const [editAbout, setEditAbout] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/users");
      setUsers(res.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError("Unable to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleAdmin = async (userId: string, currentAdmin: boolean) => {
    if (!window.confirm(`${currentAdmin ? "Remove" : "Grant"} admin privileges for this user?`)) {
      return;
    }

    try {
      await api.put(`/api/users/${userId}/admin`, { isAdmin: !currentAdmin });
      await loadUsers();
    } catch (err) {
      console.error("Failed to toggle admin:", err);
      setError("Failed to update user role.");
    }
  };

  const startEdit = (user: AdminUserRow) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditUsername(user.username || "");
    setEditDisplayName(user.displayName || "");
    setEditCity(user.city || "");
    setEditState(user.state || "");
    setEditFavoriteCastaway(user.favoriteCastaway || "");
    setEditAbout(user.about || "");
    setEditPhone((user as any).phone || "");
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!editingUser) return;

    try {
      await api.put(`/api/admin/users/${editingUser.id}`, {
        name: editName,
        email: editEmail,
        username: editUsername || null,
        displayName: editDisplayName || null,
        city: editCity || null,
        state: editState || null,
        favoriteCastaway: editFavoriteCastaway || null,
        about: editAbout || null,
        phone: editPhone || null
      });
      setMessage({ type: "success", text: "User updated successfully!" });
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to update user"
      });
    }
  };

  const deleteUser = async (userId: string, userName: string, isAdmin: boolean) => {
    if (isAdmin) {
      setMessage({ type: "error", text: "Cannot delete admin users" });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${userName}? This action cannot be undone and will remove all their data including picks, scores, and rankings.`)) {
      return;
    }

    try {
      await api.delete(`/api/admin/users/${userId}`);
      setMessage({ type: "success", text: `User ${userName} deleted successfully!` });
      await loadUsers();
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to delete user"
      });
    }
  };

  const resetPassword = async (userId: string, userName: string) => {
    if (!window.confirm(`Reset password for ${userName}? A temporary password will be generated.`)) {
      return;
    }

    try {
      const res = await api.post(`/api/admin/users/${userId}/reset-password`);
      alert(`Password reset! Temporary password: ${res.data.tempPassword}\n\nPlease share this with the user securely.`);
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.response?.data?.error || "Failed to reset password"
      });
    }
  };

  return (
    <main role="main" aria-label="User Management" className="rg-page">
      <section className="rg-hero" aria-labelledby="user-mgmt-title">
        <span className="rg-pill">User Management</span>
        <h1 id="user-mgmt-title">See every Survivor fan in the league.</h1>
        <p>
          Manage player accounts, confirm admin access, and keep contact info tidy before big announcements or draft day.
        </p>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        {error && <p className="error">{error}</p>}
        {message && (
          <div className={message.type === "error" ? "error" : "rg-section"} style={{
            background: message.type === "success" ? "#d4edda" : undefined,
            color: message.type === "success" ? "#155724" : undefined,
            marginBottom: "1rem"
          }}>
            {message.text}
          </div>
        )}

        {editingUser && (
          <div className="rg-card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0 }}>Edit User: {editingUser.name}</h3>
            <div style={{ display: "grid", gap: "1rem", gridTemplateColumns: "1fr 1fr" }}>
              <div>
                <label htmlFor="edit-name">Name *</label>
                <input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="edit-email">Email *</label>
                <input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="edit-username">Username</label>
                <input
                  id="edit-username"
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="edit-displayName">Display Name</label>
                <input
                  id="edit-displayName"
                  type="text"
                  value={editDisplayName}
                  onChange={(e) => setEditDisplayName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="edit-city">City</label>
                <input
                  id="edit-city"
                  type="text"
                  value={editCity}
                  onChange={(e) => setEditCity(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="edit-state">State</label>
                <input
                  id="edit-state"
                  type="text"
                  value={editState}
                  onChange={(e) => setEditState(e.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label htmlFor="edit-phone">Phone Number (10 digits)</label>
                <input
                  id="edit-phone"
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="1234567890"
                />
              </div>
              <div>
                <label htmlFor="edit-favoriteCastaway">Favorite Castaway</label>
                <input
                  id="edit-favoriteCastaway"
                  type="text"
                  value={editFavoriteCastaway}
                  onChange={(e) => setEditFavoriteCastaway(e.target.value)}
                  placeholder="Optional"
                  maxLength={35}
                />
              </div>
              <div style={{ gridColumn: "1 / -1" }}>
                <label htmlFor="edit-about">About (Bio)</label>
                <textarea
                  id="edit-about"
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  placeholder="Optional bio (250 chars max)"
                  maxLength={250}
                  rows={3}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
              <div style={{ gridColumn: "1 / -1", display: "flex", gap: "1rem" }}>
                <button onClick={saveEdit}>Save Changes</button>
                <button onClick={() => setEditingUser(null)} style={{ background: "#6b7280" }}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Location</th>
                  <th>Favorite</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <div>{u.name}</div>
                      {u.displayName && (
                        <div style={{ fontSize: "0.85rem", color: "#666" }}>
                          ({u.displayName})
                        </div>
                      )}
                    </td>
                    <td>{u.username || <span style={{ color: "#999" }}>—</span>}</td>
                    <td>{u.email}</td>
                    <td>
                      {u.city || u.state ? (
                        <>
                          {u.city && u.city}
                          {u.city && u.state && ", "}
                          {u.state && u.state}
                        </>
                      ) : (
                        <span style={{ color: "#999" }}>—</span>
                      )}
                    </td>
                    <td>{u.favoriteCastaway || <span style={{ color: "#999" }}>—</span>}</td>
                    <td>
                      <span style={{
                        padding: "0.25rem 0.5rem",
                        borderRadius: "4px",
                        backgroundColor: u.isAdmin ? "var(--brand-red)" : "#6b7280",
                        color: "white",
                        fontSize: "0.875rem"
                      }}>
                        {u.isAdmin ? "Admin" : "Player"}
                      </span>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td>
                      <select
                        defaultValue=""
                        onChange={(e) => {
                          const action = e.target.value;
                          if (action === "edit") startEdit(u);
                          else if (action === "reset") resetPassword(u.id, u.name);
                          else if (action === "admin") toggleAdmin(u.id, u.isAdmin);
                          else if (action === "delete") deleteUser(u.id, u.name, u.isAdmin);
                          e.target.value = ""; // Reset to default
                        }}
                        style={{ fontSize: "0.875rem", padding: "0.5rem 0.75rem" }}
                      >
                        <option value="">Select</option>
                        <option value="edit">Edit</option>
                        <option value="reset">Reset Password</option>
                        <option value="admin">{u.isAdmin ? "Remove Admin" : "Make Admin"}</option>
                        <option value="delete" disabled={u.isAdmin}>Delete</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length > 0 && users.some(u => u.about) && (
              <div style={{ marginTop: "2rem" }}>
                <h3>Player Bios</h3>
                <div className="rg-grid" style={{ marginTop: "1rem" }}>
                  {users.filter(u => u.about).map((u) => (
                    <div key={u.id} className="rg-card" style={{ padding: "1rem" }}>
                      <h4 style={{ margin: 0 }}>{u.name}</h4>
                      <p style={{ fontSize: "0.85rem", color: "#666", margin: "0.5rem 0" }}>
                        {u.about}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
};

export default UserManager;
