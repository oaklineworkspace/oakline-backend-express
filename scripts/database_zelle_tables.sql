
-- Zelle Transactions Table
DROP TABLE IF EXISTS zelle_transactions CASCADE;
CREATE TABLE zelle_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  recipient_contact TEXT NOT NULL, -- Email or phone number
  recipient_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- If recipient is also a bank customer
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  memo TEXT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('send', 'request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled', 'expired')),
  reference_number TEXT UNIQUE,
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Zelle Contacts Table
DROP TABLE IF EXISTS zelle_contacts CASCADE;
CREATE TABLE zelle_contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT zelle_contacts_contact_info_check CHECK (email IS NOT NULL OR phone IS NOT NULL),
  UNIQUE(user_id, email),
  UNIQUE(user_id, phone)
);

-- Zelle Settings Table
DROP TABLE IF EXISTS zelle_settings CASCADE;
CREATE TABLE zelle_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  daily_limit DECIMAL(12,2) DEFAULT 2500.00,
  monthly_limit DECIMAL(12,2) DEFAULT 20000.00,
  notifications_enabled BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  auto_accept_from_contacts BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_sender_id ON zelle_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_recipient_contact ON zelle_transactions(recipient_contact);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_status ON zelle_transactions(status);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_reference_number ON zelle_transactions(reference_number);
CREATE INDEX IF NOT EXISTS idx_zelle_transactions_created_at ON zelle_transactions(created_at);

CREATE INDEX IF NOT EXISTS idx_zelle_contacts_user_id ON zelle_contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_zelle_contacts_email ON zelle_contacts(email);
CREATE INDEX IF NOT EXISTS idx_zelle_contacts_phone ON zelle_contacts(phone);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_zelle_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers
CREATE TRIGGER update_zelle_transactions_updated_at 
  BEFORE UPDATE ON zelle_transactions 
  FOR EACH ROW EXECUTE FUNCTION update_zelle_updated_at_column();

CREATE TRIGGER update_zelle_contacts_updated_at 
  BEFORE UPDATE ON zelle_contacts 
  FOR EACH ROW EXECUTE FUNCTION update_zelle_updated_at_column();

CREATE TRIGGER update_zelle_settings_updated_at 
  BEFORE UPDATE ON zelle_settings 
  FOR EACH ROW EXECUTE FUNCTION update_zelle_updated_at_column();

-- Helper functions for spending limits
CREATE OR REPLACE FUNCTION get_zelle_daily_spending(user_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  daily_spent DECIMAL := 0;
  start_of_day TIMESTAMPTZ;
BEGIN
  start_of_day := DATE_TRUNC('day', NOW());
  
  SELECT COALESCE(SUM(amount), 0)
  INTO daily_spent
  FROM zelle_transactions
  WHERE sender_id = user_id_param
    AND transaction_type = 'send'
    AND status IN ('completed', 'pending')
    AND created_at >= start_of_day;
    
  RETURN daily_spent;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_zelle_monthly_spending(user_id_param UUID)
RETURNS DECIMAL AS $$
DECLARE
  monthly_spent DECIMAL := 0;
  start_of_month TIMESTAMPTZ;
BEGIN
  start_of_month := DATE_TRUNC('month', NOW());
  
  SELECT COALESCE(SUM(amount), 0)
  INTO monthly_spent
  FROM zelle_transactions
  WHERE sender_id = user_id_param
    AND transaction_type = 'send'
    AND status IN ('completed', 'pending')
    AND created_at >= start_of_month;
    
  RETURN monthly_spent;
END;
$$ LANGUAGE plpgsql;

-- Main Zelle transaction processing function
CREATE OR REPLACE FUNCTION process_zelle_transaction(
  sender_id_param UUID,
  account_id_param UUID,
  recipient_contact_param TEXT,
  amount_param DECIMAL,
  memo_param TEXT DEFAULT '',
  transaction_type_param TEXT DEFAULT 'send'
)
RETURNS JSON AS $$
DECLARE
  transaction_id UUID;
  reference_num TEXT;
  account_balance DECIMAL;
  daily_spent DECIMAL;
  monthly_spent DECIMAL;
  result JSON;
BEGIN
  -- Generate reference number
  reference_num := 'Z' || EXTRACT(EPOCH FROM NOW())::BIGINT || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 5));
  
  -- Check daily and monthly limits
  IF transaction_type_param = 'send' THEN
    daily_spent := get_zelle_daily_spending(sender_id_param);
    monthly_spent := get_zelle_monthly_spending(sender_id_param);

    IF daily_spent + amount_param > 2500 THEN
      RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Daily limit exceeded',
        'daily_remaining', 2500 - daily_spent
      );
    END IF;
    
    IF monthly_spent + amount_param > 20000 THEN
      RETURN JSON_BUILD_OBJECT(
        'success', false,
        'error', 'Monthly limit exceeded',
        'monthly_remaining', 20000 - monthly_spent
      );
    END IF;

    -- Check account balance
    SELECT balance INTO account_balance
    FROM accounts
    WHERE id = account_id_param AND user_id = sender_id_param;
    
    IF account_balance IS NULL THEN
      RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Account not found');
    END IF;
    
    IF account_balance < amount_param THEN
      RETURN JSON_BUILD_OBJECT('success', false, 'error', 'Insufficient funds');
    END IF;
  END IF;

  -- Insert Zelle transaction
  INSERT INTO zelle_transactions (
    sender_id, sender_account_id, recipient_contact,
    amount, memo, transaction_type, status,
    reference_number, processed_at
  ) VALUES (
    sender_id_param,
    account_id_param,
    recipient_contact_param,
    amount_param,
    memo_param,
    transaction_type_param,
    CASE WHEN transaction_type_param = 'send' THEN 'completed' ELSE 'pending' END,
    reference_num,
    CASE WHEN transaction_type_param = 'send' THEN NOW() ELSE NULL END
  ) RETURNING id INTO transaction_id;

  -- Debit account if send
  IF transaction_type_param = 'send' THEN
    INSERT INTO transactions (
      user_id, account_id, amount, type, description,
      status, category, reference_number
    ) VALUES (
      sender_id_param,
      account_id_param,
      -amount_param,
      'zelle_send',
      'Zelle to ' || recipient_contact_param || ' - ' || COALESCE(memo_param, 'Transfer'),
      'completed',
      'transfer',
      reference_num
    );

    UPDATE accounts
    SET balance = balance - amount_param,
        updated_at = NOW()
    WHERE id = account_id_param;
  END IF;

  result := JSON_BUILD_OBJECT(
    'success', true,
    'transaction_id', transaction_id,
    'reference_number', reference_num,
    'status', CASE WHEN transaction_type_param = 'send' THEN 'completed' ELSE 'pending' END,
    'amount', amount_param,
    'recipient', recipient_contact_param
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;
