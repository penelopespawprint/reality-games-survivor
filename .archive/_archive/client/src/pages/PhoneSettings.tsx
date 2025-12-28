import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export default function PhoneSettings() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (user?.phone) {
      setPhone(formatPhoneForDisplay(user.phone));
    }
  }, [user]);

  const formatPhoneForDisplay = (phone: string) => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 11 && digits.startsWith("1")) {
      const area = digits.substring(1, 4);
      const prefix = digits.substring(4, 7);
      const line = digits.substring(7, 11);
      return `(${area}) ${prefix}-${line}`;
    }
    return phone;
  };

  const formatPhoneForSubmit = (phone: string) => {
    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Format as +1XXXXXXXXXX
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    if (digits.length === 11 && digits.startsWith("1")) {
      return `+${digits}`;
    }
    return phone;
  };

  const handleAddPhone = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const formatted = formatPhoneForSubmit(phone);
      const res = await fetch("/api/users/me/phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: formatted })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to add phone number");
      }

      setSuccess("Phone number added! You'll receive a welcome SMS shortly.");
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhone = async () => {
    if (!confirm("Remove your phone number? You'll no longer receive SMS notifications.")) {
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/users/me/phone", {
        method: "DELETE",
        credentials: "include"
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to remove phone number");
      }

      setSuccess("Phone number removed successfully");
      setPhone("");
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSMS = async () => {
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch("/api/users/me/sms-toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ enabled: !user?.smsEnabled })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update SMS settings");
      }

      setSuccess(data.message);
      await refreshUser();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const digits = value.replace(/\D/g, "");

    // Auto-format as user types
    if (digits.length <= 3) {
      setPhone(digits);
    } else if (digits.length <= 6) {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3)}`);
    } else if (digits.length <= 10) {
      setPhone(`(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`);
    }
  };

  return (
    <main role="main" aria-label="SMS Settings" className="container mx-auto px-4 py-8 max-w-2xl">
      <button
        onClick={() => navigate("/profile")}
        className="mb-6 text-blue-600 hover:text-blue-800 flex items-center gap-2"
      >
        ← Back to Profile
      </button>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold mb-6">SMS Settings</h1>

        {error && (
          <div role="alert" className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}

        {success && (
          <div role="status" aria-live="polite" className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded">
            {success}
          </div>
        )}

        <div className="space-y-6">
          {/* Phone Number Section */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Phone Number</h2>

            {user?.phone ? (
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-lg">{formatPhoneForDisplay(user.phone)}</p>
                      <p className="text-sm text-gray-600 mt-1">
                        {user.smsEnabled ? "✓ SMS enabled" : "✗ SMS disabled"}
                      </p>
                    </div>
                    <button
                      onClick={handleRemovePhone}
                      disabled={loading}
                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div>
                  <button
                    onClick={handleToggleSMS}
                    disabled={loading}
                    className={`px-6 py-2 rounded font-medium ${
                      user.smsEnabled
                        ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        : "bg-blue-600 text-white hover:bg-blue-700"
                    } disabled:opacity-50`}
                  >
                    {user.smsEnabled ? "Disable SMS" : "Enable SMS"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Phone Number (US only)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={handlePhoneChange}
                    placeholder="(555) 123-4567"
                    maxLength={14}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  onClick={handleAddPhone}
                  disabled={loading || phone.replace(/\D/g, "").length !== 10}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? "Adding..." : "Add Phone Number"}
                </button>
              </div>
            )}
          </div>

          {/* SMS Commands Help */}
          <div className="border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">SMS Commands</h2>
            <div className="bg-blue-50 border border-blue-200 rounded p-4 space-y-2 text-sm">
              <p className="font-medium">Text these commands to (918) 213-3311:</p>
              <ul className="space-y-1 ml-4">
                <li><code className="bg-white px-2 py-1 rounded">PICK [name]</code> - Set your weekly pick</li>
                <li><code className="bg-white px-2 py-1 rounded">BOARD</code> or <code className="bg-white px-2 py-1 rounded">LEADERBOARD</code> - See top 5</li>
                <li><code className="bg-white px-2 py-1 rounded">STATUS</code> - Check your current pick & rank</li>
                <li><code className="bg-white px-2 py-1 rounded">TEAM</code> - See your drafted castaways</li>
                <li><code className="bg-white px-2 py-1 rounded">HELP</code> - List all commands</li>
                <li><code className="bg-white px-2 py-1 rounded">STOP</code> - Opt out of SMS</li>
              </ul>
            </div>
          </div>

          {/* Reminders Info */}
          <div className="bg-amber-50 border border-amber-200 rounded p-4 text-sm">
            <p className="font-medium mb-2">📅 Automatic Reminders</p>
            <p>
              If you haven't made your pick by Wednesday at noon PT, you'll receive a reminder SMS.
            </p>
          </div>

          {/* Privacy Note */}
          <div className="text-xs text-gray-500">
            <p>
              Standard SMS rates may apply. Your phone number will only be used for RGFL game notifications.
              We will never share your number with third parties.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
