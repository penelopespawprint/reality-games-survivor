-- Add PL (Post-Launch) and P0 severity levels to incidents table
-- PL = Post-launch blockers (critical launch issues)
-- P0 = Critical (system down)

-- Drop the existing constraint and add new one with all severity levels
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_severity_check;

ALTER TABLE incidents ADD CONSTRAINT incidents_severity_check 
  CHECK (severity IN ('PL', 'P0', 'P1', 'P2', 'P3', 'P4'));

-- Also add 'needs_verified' and 'verified' to status options
ALTER TABLE incidents DROP CONSTRAINT IF EXISTS incidents_status_check;

ALTER TABLE incidents ADD CONSTRAINT incidents_status_check 
  CHECK (status IN ('investigating', 'identified', 'monitoring', 'needs_verified', 'verified', 'resolved'));
