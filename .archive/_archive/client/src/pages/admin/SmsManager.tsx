import React, { useState, useEffect } from "react";
import api from "@/lib/api";

interface SmsTemplate {
  id: string;
  name: string;
  message: string;
}

interface SmsLog {
  id: string;
  phone: string;
  outboundText?: string;
  inboundText?: string;
  direction: string;
  success: boolean;
  createdAt: string;
  user?: { name: string; email: string };
}

const SMS_TEMPLATES: SmsTemplate[] = [
  {
    id: "week-open",
    name: "Week Open Announcement",
    message: "🔥 Week {week} picks are now open! Make your selection by {deadline}. Reply PICK <name> to submit via SMS."
  },
  {
    id: "reminder-48h",
    name: "48 Hour Reminder",
    message: "⏰ 48 hours left to make your Week {week} pick! Choose wisely. Deadline: {deadline}"
  },
  {
    id: "reminder-24h",
    name: "24 Hour Reminder",
    message: "🚨 24 hours remaining! Week {week} picks close {deadline}. Don't get left behind!"
  },
  {
    id: "reminder-2h",
    name: "Final Warning (2h)",
    message: "⚠️ FINAL CALL! Week {week} picks close in 2 hours at {deadline}. Submit now or lose your vote!"
  },
  {
    id: "results-posted",
    name: "Results Posted",
    message: "📊 Week {week} results are in! Check the leaderboard to see how you did. Reply BOARD for top 5."
  },
  {
    id: "elimination",
    name: "Castaway Eliminated",
    message: "🔦 The tribe has spoken. {castaway} has been eliminated. Week {week} results updated."
  }
];

const SmsManager: React.FC = () => {
  const [message, setMessage] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [recipientFilter, setRecipientFilter] = useState<"all" | "no-picks" | "custom">("all");
  const [customRecipients, setCustomRecipients] = useState<string[]>([]);
  const [previewMessage, setPreviewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [recentLogs, setRecentLogs] = useState<SmsLog[]>([]);
  const [activeWeek, setActiveWeek] = useState<any>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [estimatedRecipients, setEstimatedRecipients] = useState(0);
  const [reminderStatus, setReminderStatus] = useState<any>(null);

  useEffect(() => {
    loadUsers();
    loadRecentLogs();
    loadActiveWeek();
    loadReminderStatus();
  }, []);

  const loadReminderStatus = async () => {
    try {
      const res = await api.get("/api/sms/reminder-status");
      setReminderStatus(res.data);
    } catch (error) {
      console.error("Failed to load reminder status:", error);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await api.get("/api/users");
      setUsers(res.data.filter((u: any) => u.phone && u.smsEnabled));
    } catch (error) {
      console.error("Failed to load users:", error);
    }
  };

  const loadRecentLogs = async () => {
    try {
      const res = await api.get("/api/sms/logs");
      setRecentLogs(res.data.slice(0, 20));
    } catch (error) {
      console.error("Failed to load SMS logs:", error);
    }
  };

  const loadActiveWeek = async () => {
    try {
      const res = await api.get("/api/weeks/active");
      setActiveWeek(res.data);
    } catch (error) {
      console.error("Failed to load active week:", error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = SMS_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setMessage(template.message);
      updatePreview(template.message);
    }
  };

  const updatePreview = (text: string) => {
    let preview = text;

    // Replace variables with example values
    if (activeWeek) {
      preview = preview.replace(/{week}/g, activeWeek.weekNumber.toString());

      if (activeWeek.picksCloseAt) {
        const deadline = new Date(activeWeek.picksCloseAt).toLocaleString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          timeZone: "America/Los_Angeles"
        });
        preview = preview.replace(/{deadline}/g, deadline);
      }
    }

    preview = preview.replace(/{name}/g, "[Player Name]");
    preview = preview.replace(/{castaway}/g, "[Castaway Name]");

    setPreviewMessage(preview);
  };

  const handleMessageChange = (text: string) => {
    setMessage(text);
    updatePreview(text);
  };

  const calculateRecipients = async () => {
    try {
      const res = await api.post("/api/sms/blast/estimate", {
        recipientFilter,
        customRecipients: recipientFilter === "custom" ? customRecipients : undefined
      });
      setEstimatedRecipients(res.data.count);
      return res.data.count;
    } catch (error) {
      console.error("Failed to estimate recipients:", error);
      return 0;
    }
  };

  const handleSendClick = async () => {
    if (!message.trim()) {
      setStatusMessage("❌ Please enter a message");
      return;
    }

    const count = await calculateRecipients();
    if (count === 0) {
      setStatusMessage("❌ No recipients match the selected filter");
      return;
    }

    setEstimatedRecipients(count);
    setShowConfirmModal(true);
  };

  const handleConfirmSend = async () => {
    setLoading(true);
    setStatusMessage("");
    setShowConfirmModal(false);

    try {
      const res = await api.post("/api/sms/blast", {
        message,
        recipientFilter,
        customRecipients: recipientFilter === "custom" ? customRecipients : undefined
      });

      setStatusMessage(`✅ SMS blast sent to ${res.data.sentCount} recipients`);
      setMessage("");
      setPreviewMessage("");
      setSelectedTemplate("");
      loadRecentLogs();
    } catch (error: any) {
      console.error("Failed to send SMS blast:", error);
      setStatusMessage(`❌ ${error?.response?.data?.error || "Failed to send SMS blast"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomRecipientToggle = (userId: string) => {
    setCustomRecipients(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <main role="main" aria-label="SMS Manager" className="rg-page">
      <section className="rg-hero" aria-labelledby="sms-mgr-title">
        <span className="rg-pill">SMS Automation</span>
        <h1 id="sms-mgr-title">SMS Blast Manager</h1>
        <p>Send bulk messages, manage templates, and view delivery logs</p>
      </section>

      {/* Automated Reminders Status */}
      <section className="rg-section">
        <h2>⏰ Automated Reminders</h2>
        <div style={{
          background: reminderStatus?.enabled ? "#d1fae5" : "#fee2e2",
          border: `2px solid ${reminderStatus?.enabled ? "#10b981" : "#ef4444"}`,
          borderRadius: "8px",
          padding: "1.5rem",
          marginBottom: "1.5rem"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
                {reminderStatus?.enabled ? "✅ Reminders Active" : "❌ Reminders Disabled"}
              </h3>
              <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.9rem", color: "#666" }}>
                {reminderStatus?.enabled
                  ? "Automated reminders will be sent at 48h, 24h, and 2h before pick deadline"
                  : "Set SMS_REMINDER_ENABLED=true in environment to enable"}
              </p>
            </div>
          </div>

          {activeWeek && activeWeek.picksCloseAt && reminderStatus?.enabled && (
            <div style={{ marginTop: "1rem", padding: "1rem", background: "rgba(255,255,255,0.8)", borderRadius: "6px" }}>
              <h4 style={{ margin: "0 0 0.75rem 0", fontSize: "0.95rem" }}>Upcoming Reminders for Week {activeWeek.weekNumber}:</h4>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {(() => {
                  const deadline = new Date(activeWeek.picksCloseAt);
                  const now = new Date();
                  const reminder48h = new Date(deadline.getTime() - 48 * 60 * 60 * 1000);
                  const reminder24h = new Date(deadline.getTime() - 24 * 60 * 60 * 1000);
                  const reminder2h = new Date(deadline.getTime() - 2 * 60 * 60 * 1000);

                  return (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>{now > reminder48h ? "✅" : "⏰"}</span>
                        <span style={{ fontSize: "0.85rem" }}>
                          48h reminder: {reminder48h.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {now > reminder48h && " (sent)"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>{now > reminder24h ? "✅" : "⏰"}</span>
                        <span style={{ fontSize: "0.85rem" }}>
                          24h reminder: {reminder24h.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {now > reminder24h && " (sent)"}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontSize: "1.2rem" }}>{now > reminder2h ? "✅" : "⏰"}</span>
                        <span style={{ fontSize: "0.85rem" }}>
                          2h reminder: {reminder2h.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          {now > reminder2h && " (sent)"}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Compose Message */}
      <section className="rg-section">
        <h2>Compose Message</h2>

        {statusMessage && (
          <div style={{
            padding: "1rem",
            marginBottom: "1rem",
            background: statusMessage.startsWith("✅") ? "#d1fae5" : "#fee2e2",
            border: `2px solid ${statusMessage.startsWith("✅") ? "#10b981" : "#ef4444"}`,
            borderRadius: "8px"
          }}>
            {statusMessage}
          </div>
        )}

        {/* Template Selector */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Template (Optional)
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => handleTemplateSelect(e.target.value)}
            style={{ padding: "0.75rem", width: "100%", borderRadius: "8px", border: "2px solid #e5e7eb" }}
          >
            <option value="">Custom Message</option>
            {SMS_TEMPLATES.map(template => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
            Variables: {"{week}"}, {"{deadline}"}, {"{name}"}, {"{castaway}"}
          </p>
        </div>

        {/* Message Input */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Message Text
          </label>
          <textarea
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Enter your message here..."
            rows={4}
            style={{
              width: "100%",
              padding: "0.75rem",
              borderRadius: "8px",
              border: "2px solid #e5e7eb",
              fontFamily: "inherit",
              resize: "vertical"
            }}
          />
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "0.5rem" }}>
            Character count: {message.length} (SMS = 160 chars per segment)
          </p>
        </div>

        {/* Preview */}
        {previewMessage && (
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
              Preview
            </label>
            <div style={{
              padding: "1rem",
              background: "#f3f4f6",
              border: "2px solid #d1d5db",
              borderRadius: "8px",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap"
            }}>
              {previewMessage}
            </div>
          </div>
        )}

        {/* Recipient Filter */}
        <div style={{ marginBottom: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "600" }}>
            Recipients
          </label>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="radio"
                name="recipients"
                value="all"
                checked={recipientFilter === "all"}
                onChange={(e) => setRecipientFilter(e.target.value as any)}
              />
              All SMS-enabled users ({users.length})
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="radio"
                name="recipients"
                value="no-picks"
                checked={recipientFilter === "no-picks"}
                onChange={(e) => setRecipientFilter(e.target.value as any)}
              />
              Users without picks this week
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <input
                type="radio"
                name="recipients"
                value="custom"
                checked={recipientFilter === "custom"}
                onChange={(e) => setRecipientFilter(e.target.value as any)}
              />
              Custom selection
            </label>
          </div>

          {recipientFilter === "custom" && (
            <div style={{
              border: "2px solid #e5e7eb",
              borderRadius: "8px",
              padding: "1rem",
              maxHeight: "300px",
              overflowY: "auto"
            }}>
              {users.map(user => (
                <label key={user.id} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.5rem",
                  borderBottom: "1px solid #f3f4f6"
                }}>
                  <input
                    type="checkbox"
                    checked={customRecipients.includes(user.id)}
                    onChange={() => handleCustomRecipientToggle(user.id)}
                  />
                  {user.name} ({user.phone})
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendClick}
          disabled={loading || !message.trim()}
          style={{
            padding: "1rem 2rem",
            fontSize: "1.1rem",
            fontWeight: "700",
            opacity: loading || !message.trim() ? 0.5 : 1
          }}
        >
          {loading ? "Sending..." : "Send SMS Blast"}
        </button>
      </section>

      {/* Recent Logs */}
      <section className="rg-section">
        <h2>Recent SMS Activity</h2>
        <div style={{ overflowX: "auto" }}>
          <table className="rg-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Direction</th>
                <th>Recipient</th>
                <th>Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => (
                <tr key={log.id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      background: log.direction === "outbound" ? "#dbeafe" : "#fef3c7",
                      color: log.direction === "outbound" ? "#1e40af" : "#92400e"
                    }}>
                      {log.direction === "outbound" ? "Outbound" : "Inbound"}
                    </span>
                  </td>
                  <td>{log.user?.name || log.phone}</td>
                  <td style={{ maxWidth: "400px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.direction === "outbound" ? log.outboundText : log.inboundText}
                  </td>
                  <td>
                    <span style={{
                      padding: "0.25rem 0.75rem",
                      borderRadius: "4px",
                      fontSize: "0.85rem",
                      fontWeight: "600",
                      background: log.success ? "#d1fae5" : "#fee2e2",
                      color: log.success ? "#065f46" : "#991b1b"
                    }}>
                      {log.success ? "✅ Success" : "❌ Failed"}
                    </span>
                  </td>
                </tr>
              ))}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", color: "#999" }}>
                    No SMS logs yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-modal-title"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999
          }}
        >
          <div style={{
            background: "#fff",
            padding: "2rem",
            borderRadius: "12px",
            maxWidth: "500px",
            width: "90%"
          }}>
            <h2 id="confirm-modal-title" style={{ marginTop: 0 }}>Confirm SMS Blast</h2>
            <p>You are about to send this message to <strong>{estimatedRecipients} recipients</strong>:</p>
            <div style={{
              background: "#f3f4f6",
              padding: "1rem",
              borderRadius: "8px",
              marginBottom: "1.5rem",
              fontFamily: "monospace",
              whiteSpace: "pre-wrap"
            }}>
              {previewMessage}
            </div>
            <p style={{ fontSize: "0.9rem", color: "#666" }}>
              Estimated cost: ${(estimatedRecipients * 0.05).toFixed(2)} (based on $0.05/SMS)
            </p>
            <div style={{ display: "flex", gap: "1rem", marginTop: "1.5rem" }}>
              <button
                onClick={handleConfirmSend}
                style={{ flex: 1, background: "var(--brand-red)" }}
              >
                Confirm & Send
              </button>
              <button
                onClick={() => setShowConfirmModal(false)}
                style={{ flex: 1, background: "#6b7280" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default SmsManager;
