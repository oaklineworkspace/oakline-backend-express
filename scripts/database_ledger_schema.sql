
-- Double Entry Ledger System
CREATE TABLE IF NOT EXISTS ledger_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance_after DECIMAL(15,2) NOT NULL,
  description TEXT NOT NULL,
  entry_type VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  
  -- Immutability constraints
  CONSTRAINT check_debit_or_credit CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR 
    (credit_amount > 0 AND debit_amount = 0)
  ),
  CONSTRAINT check_amounts_positive CHECK (
    debit_amount >= 0 AND credit_amount >= 0
  )
);

-- Transaction Audit Log
CREATE TABLE IF NOT EXISTS transaction_audit_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id VARCHAR(100) NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(50) NOT NULL,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id ON ledger_entries(transaction_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_account_id ON ledger_entries(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_entries_created_at ON ledger_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_transaction_id ON transaction_audit_log(transaction_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON transaction_audit_log(user_id);

-- Enable RLS
ALTER TABLE ledger_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_audit_log ENABLE ROW LEVEL SECURITY;

-- Prevent updates to ledger entries (immutability)
CREATE OR REPLACE FUNCTION prevent_ledger_updates()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Ledger entries are immutable and cannot be updated';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ledger_entry_updates
  BEFORE UPDATE ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION prevent_ledger_updates();

-- RLS Policies
CREATE POLICY "Service role can manage ledger entries" ON ledger_entries
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role can manage audit log" ON transaction_audit_log
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Stored Procedure for Double Entry Transaction
CREATE OR REPLACE FUNCTION process_double_entry_transaction(
  p_transaction_id VARCHAR(100),
  p_user_id UUID,
  p_from_account_id UUID,
  p_to_account_id UUID,
  p_amount DECIMAL(15,2),
  p_description TEXT,
  p_transaction_type VARCHAR(50),
  p_reference VARCHAR(100)
) RETURNS JSON AS $$
DECLARE
  v_from_balance DECIMAL(15,2);
  v_to_balance DECIMAL(15,2);
  v_result JSON;
BEGIN
  -- Check for duplicate transaction
  IF EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = p_transaction_id) THEN
    RAISE EXCEPTION 'Transaction already exists: %', p_transaction_id;
  END IF;

  -- Get current balances
  SELECT balance INTO v_from_balance FROM accounts WHERE id = p_from_account_id;
  SELECT balance INTO v_to_balance FROM accounts WHERE id = p_to_account_id;

  -- Validate sufficient funds
  IF v_from_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient funds';
  END IF;

  -- Create debit entry (from account)
  INSERT INTO ledger_entries (
    transaction_id, account_id, debit_amount, credit_amount, 
    balance_after, description, entry_type, created_by
  ) VALUES (
    p_transaction_id, p_from_account_id, p_amount, 0,
    v_from_balance - p_amount, p_description, p_transaction_type, p_user_id
  );

  -- Create credit entry (to account)
  INSERT INTO ledger_entries (
    transaction_id, account_id, debit_amount, credit_amount,
    balance_after, description, entry_type, created_by
  ) VALUES (
    p_transaction_id, p_to_account_id, 0, p_amount,
    v_to_balance + p_amount, p_description, p_transaction_type, p_user_id
  );

  -- Update account balances
  UPDATE accounts SET balance = v_from_balance - p_amount WHERE id = p_from_account_id;
  UPDATE accounts SET balance = v_to_balance + p_amount WHERE id = p_to_account_id;

  -- Log to audit trail
  INSERT INTO transaction_audit_log (transaction_id, user_id, action, details) VALUES (
    p_transaction_id, p_user_id, 'TRANSACTION_COMPLETED', 
    json_build_object(
      'amount', p_amount,
      'from_account', p_from_account_id,
      'to_account', p_to_account_id,
      'reference', p_reference
    )
  );

  v_result := json_build_object(
    'transaction_id', p_transaction_id,
    'status', 'completed',
    'from_balance', v_from_balance - p_amount,
    'to_balance', v_to_balance + p_amount
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
