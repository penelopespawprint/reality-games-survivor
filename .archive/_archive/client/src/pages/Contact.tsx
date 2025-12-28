import React, { useState } from "react";

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: ""
  });
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");

    // Simulate sending - in production this would call an API
    setTimeout(() => {
      setStatus("success");
      setFormData({ name: "", email: "", subject: "", message: "" });
      setTimeout(() => setStatus("idle"), 3000);
    }, 1000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <main className="rg-page" role="main" aria-label="Contact Us">
      <section className="rg-hero" aria-labelledby="contact-title">
        <span className="rg-pill">Contact</span>
        <h1 id="contact-title">Have a question? Just ask.</h1>
        <p>
          Questions about rankings, draft day, or weekly scoring? Drop us a note and our game masters will get back to you faster than Jeff can extinguish a torch.
        </p>
      </section>

      <section className="rg-section" style={{ marginTop: "3rem" }}>
        <form onSubmit={handleSubmit} className="rg-card" style={{ padding: "2rem" }} aria-label="Contact form">
          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="name" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="email" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="subject" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Subject</label>
            <select
              id="subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              style={{ width: "100%" }}
            >
              <option value="">Select a topic...</option>
              <option value="rankings">Pre-Season Rankings</option>
              <option value="draft">Draft Questions</option>
              <option value="scoring">Weekly Scoring</option>
              <option value="technical">Technical Issue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label htmlFor="message" style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Message</label>
            <textarea
              id="message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              style={{ width: "100%", resize: "vertical" }}
            />
          </div>

          <button type="submit" disabled={status === "sending"} style={{ width: "100%" }} aria-busy={status === "sending"}>
            {status === "sending" ? "Sending..." : "Send Message"}
          </button>

          {status === "success" && (
            <p role="status" aria-live="polite" style={{ color: "#22c55e", marginTop: "1rem", fontWeight: 600, textAlign: "center" }}>
              ✓ Message sent! We&apos;ll get back to you within 24 hours.
            </p>
          )}
        </form>

        <p style={{ textAlign: "center", marginTop: "2rem", color: "#666" }}>
          Average response time: under 24 hours during the season
        </p>
      </section>
    </main>
  );
};

export default Contact;
