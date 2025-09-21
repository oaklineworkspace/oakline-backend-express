
-- Banking Audit Trail System
CREATE TABLE IF NOT EXISTS banking_audit_trail (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action_type VARCHAR(50) NOT NULL,
  before_state JSONB,
  after_state JSONB,
  amount DECIMAL(15,2),
  account_id UUID REFERENCES accounts(id),
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  hash VARCHAR(64) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  
  -- Immutability constraints
  CONSTRAINT immutable_audit_record CHECK (created_at IS NOT NULL)
);

-- Security Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  severity VARCHAR(20) DEFAULT 'info',
  source VARCHAR(50) DEFAULT 'oakline-bank'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_banking_audit_transaction_id ON banking_audit_trail(transaction_id);
CREATE INDEX IF NOT EXISTS idx_banking_audit_user_id ON banking_audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_banking_audit_timestamp ON banking_audit_trail(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_user_id ON security_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_timestamp ON security_audit_log(timestamp DESC);

-- RLS Policies
ALTER TABLE banking_audit_trail ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage banking audit" ON banking_audit_trail
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage security audit" ON security_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Prevent updates to audit records (immutability)
CREATE OR REPLACE FUNCTION prevent_audit_updates()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_banking_audit_updates
  BEFORE UPDATE ON banking_audit_trail
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_updates();

CREATE TRIGGER prevent_security_audit_updates
  BEFORE UPDATE ON security_audit_log
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_updates();
