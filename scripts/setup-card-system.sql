
-- Complete Card Transaction System Setup

-- Card Transactions Table
CREATE TABLE IF NOT EXISTS card_transactions (
    id SERIAL PRIMARY KEY,
    card_id INTEGER REFERENCES cards(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'withdrawal', 'refund', 'fee')),
    amount DECIMAL(10,2) NOT NULL,
    merchant VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'declined')),
    reference_number VARCHAR(50) UNIQUE DEFAULT gen_random_uuid()::text,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_created_at ON card_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_card_transactions_status ON card_transactions(status);

-- Function to generate card number in XXXX-XXXX-XXXX-XXXX format
CREATE OR REPLACE FUNCTION generate_card_number()
RETURNS VARCHAR(19) AS $$
DECLARE
    card_number VARCHAR(19);
    part1 VARCHAR(4);
    part2 VARCHAR(4);
    part3 VARCHAR(4);
    part4 VARCHAR(4);
BEGIN
    -- Generate 4 random 4-digit parts
    part1 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    part2 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    part3 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    part4 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
    
    -- Start with 4 for Visa-like cards
    part1 := '4' || SUBSTRING(part1, 2, 3);
    
    card_number := part1 || '-' || part2 || '-' || part3 || '-' || part4;
    
    -- Check if card number already exists, regenerate if it does
    WHILE EXISTS (SELECT 1 FROM cards WHERE card_number = card_number) LOOP
        part1 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        part2 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        part3 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        part4 := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        part1 := '4' || SUBSTRING(part1, 2, 3);
        card_number := part1 || '-' || part2 || '-' || part3 || '-' || part4;
    END LOOP;
    
    RETURN card_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate CVV
CREATE OR REPLACE FUNCTION generate_cvv()
RETURNS VARCHAR(3) AS $$
BEGIN
    RETURN LPAD(FLOOR(RANDOM() * 1000)::TEXT, 3, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to generate expiry date (3 years from now)
CREATE OR REPLACE FUNCTION generate_expiry_date()
RETURNS VARCHAR(5) AS $$
DECLARE
    expiry_date DATE;
    month_str VARCHAR(2);
    year_str VARCHAR(2);
BEGIN
    expiry_date := CURRENT_DATE + INTERVAL '3 years';
    month_str := LPAD(EXTRACT(MONTH FROM expiry_date)::TEXT, 2, '0');
    year_str := RIGHT(EXTRACT(YEAR FROM expiry_date)::TEXT, 2);
    RETURN month_str || '/' || year_str;
END;
$$ LANGUAGE plpgsql;

-- Function to reset daily spending counters (call this daily via cron)
CREATE OR REPLACE FUNCTION reset_daily_spending()
RETURNS VOID AS $$
BEGIN
    UPDATE cards SET daily_spent = 0.00;
    INSERT INTO audit_logs (action, table_name, new_data, created_at)
    VALUES ('reset_daily_spending', 'cards', '{"message": "Daily spending counters reset"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to reset monthly spending counters (call this monthly via cron)
CREATE OR REPLACE FUNCTION reset_monthly_spending()
RETURNS VOID AS $$
BEGIN
    UPDATE cards SET monthly_spent = 0.00;
    INSERT INTO audit_logs (action, table_name, new_data, created_at)
    VALUES ('reset_monthly_spending', 'cards', '{"message": "Monthly spending counters reset"}', NOW());
END;
$$ LANGUAGE plpgsql;

-- Main function to process card transactions
CREATE OR REPLACE FUNCTION process_card_transaction(
    p_card_id INTEGER,
    p_amount DECIMAL(10,2),
    p_merchant VARCHAR(255) DEFAULT 'Unknown Merchant',
    p_location VARCHAR(255) DEFAULT 'Unknown Location',
    p_transaction_type VARCHAR(20) DEFAULT 'purchase'
)
RETURNS JSON AS $$
DECLARE
    v_card RECORD;
    v_account RECORD;
    v_transaction_id INTEGER;
    v_new_daily_spent DECIMAL(10,2);
    v_new_monthly_spent DECIMAL(10,2);
    v_new_balance DECIMAL(15,2);
BEGIN
    -- Validate input
    IF p_amount <= 0 THEN
        RETURN json_build_object('success', false, 'error', 'Amount must be greater than 0');
    END IF;

    -- Get card details
    SELECT c.*, a.balance, a.id as account_id
    INTO v_card
    FROM cards c
    JOIN accounts a ON c.account_id = a.id
    WHERE c.id = p_card_id;

    IF NOT FOUND THEN
        RETURN json_build_object('success', false, 'error', 'Card not found');
    END IF;

    -- Check if card is active and not locked
    IF v_card.status != 'active' THEN
        RETURN json_build_object('success', false, 'error', 'Card is not active');
    END IF;

    IF v_card.is_locked THEN
        RETURN json_build_object('success', false, 'error', 'Card is locked');
    END IF;

    -- Calculate new spending amounts
    v_new_daily_spent := v_card.daily_spent + p_amount;
    v_new_monthly_spent := v_card.monthly_spent + p_amount;

    -- Check daily limit
    IF v_new_daily_spent > v_card.daily_limit THEN
        -- Log the declined transaction
        INSERT INTO card_transactions (card_id, transaction_type, amount, merchant, location, status)
        VALUES (p_card_id, p_transaction_type, p_amount, p_merchant, p_location, 'declined');
        
        RETURN json_build_object(
            'success', false, 
            'error', 'Daily limit exceeded',
            'daily_limit', v_card.daily_limit,
            'daily_spent', v_card.daily_spent,
            'attempted_amount', p_amount
        );
    END IF;

    -- Check monthly limit
    IF v_new_monthly_spent > v_card.monthly_limit THEN
        -- Log the declined transaction
        INSERT INTO card_transactions (card_id, transaction_type, amount, merchant, location, status)
        VALUES (p_card_id, p_transaction_type, p_amount, p_merchant, p_location, 'declined');
        
        RETURN json_build_object(
            'success', false, 
            'error', 'Monthly limit exceeded',
            'monthly_limit', v_card.monthly_limit,
            'monthly_spent', v_card.monthly_spent,
            'attempted_amount', p_amount
        );
    END IF;

    -- Check account balance
    IF v_card.balance < p_amount THEN
        -- Log the declined transaction
        INSERT INTO card_transactions (card_id, transaction_type, amount, merchant, location, status)
        VALUES (p_card_id, p_transaction_type, p_amount, p_merchant, p_location, 'declined');
        
        RETURN json_build_object(
            'success', false, 
            'error', 'Insufficient funds',
            'account_balance', v_card.balance,
            'attempted_amount', p_amount
        );
    END IF;

    -- All checks passed, process the transaction
    BEGIN
        -- Calculate new balance
        v_new_balance := v_card.balance - p_amount;

        -- Update account balance
        UPDATE accounts 
        SET balance = v_new_balance, updated_at = NOW()
        WHERE id = v_card.account_id;

        -- Update card spending counters
        UPDATE cards 
        SET daily_spent = v_new_daily_spent, 
            monthly_spent = v_new_monthly_spent,
            updated_at = NOW()
        WHERE id = p_card_id;

        -- Insert card transaction record
        INSERT INTO card_transactions (card_id, transaction_type, amount, merchant, location, status)
        VALUES (p_card_id, p_transaction_type, p_amount, p_merchant, p_location, 'completed')
        RETURNING id INTO v_transaction_id;

        -- Insert general transaction record for account history
        INSERT INTO transactions (user_id, account_id, type, amount, description, status, reference_number)
        VALUES (
            v_card.user_id, 
            v_card.account_id, 
            'debit', 
            p_amount, 
            'Card transaction at ' || p_merchant || ' (' || p_location || ')',
            'completed',
            'CARD-' || v_transaction_id
        );

        -- Return success response
        RETURN json_build_object(
            'success', true,
            'transaction_id', v_transaction_id,
            'new_balance', v_new_balance,
            'daily_spent', v_new_daily_spent,
            'monthly_spent', v_new_monthly_spent,
            'message', 'Transaction processed successfully'
        );

    EXCEPTION WHEN OTHERS THEN
        -- Log the failed transaction
        INSERT INTO card_transactions (card_id, transaction_type, amount, merchant, location, status)
        VALUES (p_card_id, p_transaction_type, p_amount, p_merchant, p_location, 'failed');
        
        RETURN json_build_object('success', false, 'error', 'Transaction processing failed: ' || SQLERRM);
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to issue a new debit card (admin only)
CREATE OR REPLACE FUNCTION issue_debit_card(
    p_user_id UUID,
    p_account_id UUID,
    p_cardholder_name VARCHAR(100),
    p_daily_limit DECIMAL(10,2) DEFAULT 1000.00,
    p_monthly_limit DECIMAL(10,2) DEFAULT 10000.00
)
RETURNS JSON AS $$
DECLARE
    v_card_id INTEGER;
    v_card_number VARCHAR(19);
    v_cvv VARCHAR(3);
    v_expiry_date VARCHAR(5);
    v_account_exists BOOLEAN;
    v_user_exists BOOLEAN;
BEGIN
    -- Validate that account exists and belongs to user
    SELECT EXISTS(
        SELECT 1 FROM accounts a 
        JOIN auth.users u ON a.user_id = u.id 
        WHERE a.id = p_account_id AND u.id = p_user_id
    ) INTO v_account_exists;

    IF NOT v_account_exists THEN
        RETURN json_build_object('success', false, 'error', 'Account not found or does not belong to user');
    END IF;

    -- Generate card details
    v_card_number := generate_card_number();
    v_cvv := generate_cvv();
    v_expiry_date := generate_expiry_date();

    -- Insert new card
    INSERT INTO cards (
        user_id, 
        account_id, 
        card_number, 
        cardholder_name, 
        expiry_date, 
        cvv, 
        daily_limit, 
        monthly_limit,
        daily_spent,
        monthly_spent,
        status,
        is_locked
    )
    VALUES (
        p_user_id, 
        p_account_id, 
        v_card_number, 
        p_cardholder_name, 
        v_expiry_date, 
        v_cvv, 
        p_daily_limit, 
        p_monthly_limit,
        0.00,
        0.00,
        'active',
        false
    )
    RETURNING id INTO v_card_id;

    -- Log the card issuance
    INSERT INTO audit_logs (user_id, action, table_name, new_data)
    VALUES (
        p_user_id,
        'card_issued',
        'cards',
        json_build_object(
            'card_id', v_card_id,
            'account_id', p_account_id,
            'daily_limit', p_daily_limit,
            'monthly_limit', p_monthly_limit
        )
    );

    RETURN json_build_object(
        'success', true,
        'card_id', v_card_id,
        'card_number', v_card_number,
        'cvv', v_cvv,
        'expiry_date', v_expiry_date,
        'message', 'Debit card issued successfully'
    );

EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', 'Failed to issue card: ' || SQLERRM);
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for card_transactions
CREATE POLICY "Users can view their own card transactions" ON card_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM cards c 
            WHERE c.id = card_transactions.card_id 
            AND c.user_id = auth.uid()
        )
    );

CREATE POLICY "System can insert card transactions" ON card_transactions
    FOR INSERT WITH CHECK (true);

-- Update RLS policies for cards to be more restrictive
DROP POLICY IF EXISTS "Users can view their own debit cards" ON cards;
DROP POLICY IF EXISTS "Users can insert their own debit cards" ON cards;
DROP POLICY IF EXISTS "Users can update their own debit cards" ON cards;

CREATE POLICY "Users can view their own cards" ON cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Only functions can insert cards" ON cards
    FOR INSERT WITH CHECK (false); -- Only functions can insert

CREATE POLICY "Users can update their own card settings" ON cards
    FOR UPDATE USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id AND user_id = OLD.user_id); -- Prevent changing ownership

-- Admin policies (you'll need to create an admin role)
-- CREATE ROLE admin_role;
-- CREATE POLICY "Admins can do everything on cards" ON cards
--     FOR ALL USING (pg_has_role('admin_role'));
