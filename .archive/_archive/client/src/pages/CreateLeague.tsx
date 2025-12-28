import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import { useLeague } from '@/context/LeagueContext';

const CreateLeague: React.FC = () => {
  const navigate = useNavigate();
  const { refreshLeagues } = useLeague();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    maxPlayers: 12,
    isPasswordProtected: false,
    password: '',
    // Paid league / charity fields
    entryFee: 0,
    charityEnabled: false,
    charityPercentage: 100,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdLeague, setCreatedLeague] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/api/leagues/create', formData);
      setCreatedLeague(response.data.league);
      await refreshLeagues();
    } catch (err: any) {
      console.error('Failed to create league:', err);
      setError(err.response?.data?.error || 'Failed to create league');
    } finally {
      setLoading(false);
    }
  };

  if (createdLeague) {
    return (
      <div className="rg-page">
        <section className="rg-hero">
          <span className="rg-pill">Success!</span>
          <h1>League Created! 🎉</h1>
          <p>Your custom league is ready. Share the code with friends to invite them!</p>
        </section>

        <section className="rg-section">
          <div className="rg-card" style={{
            maxWidth: '600px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textAlign: 'center',
            padding: '2rem',
          }}>
            <h2 style={{ color: 'white', marginBottom: '1rem' }}>{createdLeague.name}</h2>
            {createdLeague.description && (
              <p style={{ opacity: 0.9, marginBottom: '1.5rem' }}>{createdLeague.description}</p>
            )}

            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
            }}>
              <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                League Code
              </div>
              <div style={{
                fontSize: '2rem',
                fontWeight: 700,
                letterSpacing: '2px',
                fontFamily: 'monospace',
              }}>
                {createdLeague.code}
              </div>
              <div style={{ fontSize: '0.85rem', opacity: 0.8, marginTop: '0.5rem' }}>
                Share this code with friends to invite them
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.5rem',
              textAlign: 'left',
            }}>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Max Players</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{createdLeague.maxPlayers}</div>
              </div>
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '1rem',
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>Current Players</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{createdLeague.currentPlayers}</div>
              </div>
            </div>

            {createdLeague.isPasswordProtected && (
              <div style={{
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                  Password Protected
                </div>
                <div style={{ fontSize: '0.9rem' }}>
                  Members will need the password you set to join
                </div>
              </div>
            )}

            {createdLeague.entryFee > 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.15)',
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, marginBottom: '0.5rem' }}>
                  Entry Fee
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
                  ${Number(createdLeague.entryFee).toFixed(2)}
                </div>
                {createdLeague.charityEnabled && (
                  <div style={{ fontSize: '0.85rem', marginTop: '0.5rem', color: '#86efac' }}>
                    {createdLeague.charityPercentage || 100}% goes to winner's charity!
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => navigate('/my-leagues')}
                style={{
                  background: 'white',
                  color: '#667eea',
                  border: 'none',
                }}
              >
                View My Leagues
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(createdLeague.code);
                  alert('League code copied to clipboard!');
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: '2px solid white',
                }}
              >
                Copy Code
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <main className="rg-page" role="main" aria-label="Create League">
      <section className="rg-hero" aria-labelledby="create-title">
        <span className="rg-pill">Create League</span>
        <h1 id="create-title">Create Your Custom League</h1>
        <p>Set up a private league and compete with friends and family!</p>
      </section>

      <section className="rg-section">
        <form
          onSubmit={handleSubmit}
          className="rg-card"
          style={{ maxWidth: '600px', margin: '0 auto' }}
          aria-label="Create new league"
        >
          {error && (
            <div className="error" role="alert" style={{ marginBottom: '1.5rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              League Name *
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Smith Family League"
              required
              minLength={3}
              maxLength={50}
              style={{ width: '100%' }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="description" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Tell members what this league is about..."
              maxLength={200}
              rows={3}
              style={{ width: '100%', resize: 'vertical' }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              {formData.description.length} / 200 characters
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label htmlFor="maxPlayers" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
              Maximum Players *
            </label>
            <input
              id="maxPlayers"
              type="number"
              value={formData.maxPlayers}
              onChange={(e) => setFormData({ ...formData, maxPlayers: parseInt(e.target.value) })}
              min={8}
              max={12}
              required
              style={{ width: '100%' }}
            />
            <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
              Custom leagues support 8-12 players
            </div>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.isPasswordProtected}
                onChange={(e) => setFormData({
                  ...formData,
                  isPasswordProtected: e.target.checked,
                  password: e.target.checked ? formData.password : '',
                })}
              />
              <span style={{ fontWeight: 600 }}>🔒 Password Protect This League</span>
            </label>
          </div>

          {formData.isPasswordProtected && (
            <div style={{ marginBottom: '1.5rem', paddingLeft: '1.5rem' }}>
              <label htmlFor="password" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                League Password *
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Enter password"
                required={formData.isPasswordProtected}
                minLength={6}
                style={{ width: '100%' }}
              />
              <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                Minimum 6 characters. Share this with members to let them join.
              </div>
            </div>
          )}

          {/* Paid League / Charity Section */}
          <div style={{
            background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
            border: '2px solid #86efac',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ marginTop: 0, fontSize: '1.1rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              Play for a Cause
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#166534', marginBottom: '1rem' }}>
              Create a paid league where the pot goes to the winner's favorite charity!
            </p>

            <div style={{ marginBottom: '1rem' }}>
              <label htmlFor="entryFee" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#166534' }}>
                Entry Fee (USD)
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: '#166534' }}>$</span>
                <input
                  id="entryFee"
                  type="number"
                  value={formData.entryFee}
                  onChange={(e) => {
                    const fee = Math.max(0, Math.min(50, parseFloat(e.target.value) || 0));
                    setFormData({ ...formData, entryFee: fee });
                  }}
                  min={0}
                  max={50}
                  step={5}
                  style={{ width: '100px' }}
                />
              </div>
              <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.25rem' }}>
                $0 for free leagues, $5-$50 for paid leagues
              </div>
            </div>

            {formData.entryFee > 0 && (
              <>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.charityEnabled}
                      onChange={(e) => setFormData({ ...formData, charityEnabled: e.target.checked })}
                    />
                    <span style={{ fontWeight: 600, color: '#166534' }}>Enable Charity Pot</span>
                  </label>
                  <div style={{ fontSize: '0.85rem', color: '#166534', marginLeft: '1.5rem', marginTop: '0.25rem' }}>
                    Winner's charity receives the pot at season end
                  </div>
                </div>

                {formData.charityEnabled && (
                  <div style={{ marginTop: '1rem', paddingLeft: '1.5rem' }}>
                    <label htmlFor="charityPercentage" style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, color: '#166534' }}>
                      Percentage to Charity
                    </label>
                    <select
                      id="charityPercentage"
                      value={formData.charityPercentage}
                      onChange={(e) => setFormData({ ...formData, charityPercentage: parseInt(e.target.value) })}
                      style={{ width: '150px' }}
                    >
                      <option value={100}>100%</option>
                      <option value={75}>75%</option>
                      <option value={50}>50%</option>
                    </select>
                    <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.5rem' }}>
                      Pot estimate: ${(formData.entryFee * formData.maxPlayers * (formData.charityPercentage / 100)).toFixed(0)} to charity
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div style={{
            background: '#f9fafb',
            border: '2px solid #e5e5e5',
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
          }}>
            <h3 style={{ marginTop: 0, fontSize: '1rem' }}>What happens next?</h3>
            <ul style={{ paddingLeft: '1.5rem', margin: 0, lineHeight: 1.8 }}>
              <li>Your league will be created immediately</li>
              <li>You'll receive a unique league code</li>
              <li>Share the code with friends to invite them</li>
              <li>Draft picks will be assigned based on preseason rankings</li>
              <li>Start competing for weekly points!</li>
            </ul>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{ flex: 1 }}
              aria-busy={loading}
              aria-label={loading ? 'Creating league' : 'Create league'}
            >
              {loading ? 'Creating...' : 'Create League'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/my-leagues')}
              className="button-secondary"
              style={{ flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export default CreateLeague;
