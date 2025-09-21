
-- Example SQL Queries for Debit Card System
-- ==========================================

-- 1. Issue a new debit card for a user
-- Replace user_id and account_id with actual values
SELECT issue_debit_card(
    'user-uuid-here'::UUID,              -- user_id
    'account-uuid-here'::UUID,           -- account_id
    'John Doe',                          -- cardholder_name
    1500.00,                             -- daily_limit (optional, defaults to 1000)
    15000.00                             -- monthly_limit (optional, defaults to 10000)
);

-- 2. Process a card transaction
-- Replace card_id with actual card ID
SELECT process_card_transaction(
    1,                                   -- card_id
    25.50,                              -- amount
    'Starbucks Coffee',                 -- merchant
    'Main Street Location',             -- location
    'purchase'                          -- transaction_type
);

-- 3. Check card details and current spending
SELECT 
    c.id,
    c.card_number,
    c.cardholder_name,
    c.daily_limit,
    c.daily_spent,
    c.monthly_limit,
    c.monthly_spent,
    c.is_locked,
    c.status,
    a.balance as account_balance,
    p.first_name || ' ' || p.last_name as owner_name
FROM cards c
JOIN accounts a ON c.account_id = a.id
JOIN profiles p ON c.user_id = p.id
WHERE c.status = 'active'
ORDER BY c.created_at DESC;

-- 4. View card transactions for a specific card
SELECT 
    ct.id,
    ct.transaction_type,
    ct.amount,
    ct.merchant,
    ct.location,
    ct.status,
    ct.reference_number,
    ct.created_at,
    c.card_number
FROM card_transactions ct
JOIN cards c ON ct.card_id = c.id
WHERE ct.card_id = 1  -- Replace with actual card ID
ORDER BY ct.created_at DESC
LIMIT 10;

-- 5. Lock/Unlock a card
UPDATE cards 
SET is_locked = true, updated_at = NOW() 
WHERE id = 1;  -- Replace with actual card ID

UPDATE cards 
SET is_locked = false, updated_at = NOW() 
WHERE id = 1;  -- Replace with actual card ID

-- 6. Update card limits
UPDATE cards 
SET 
    daily_limit = 2000.00,
    monthly_limit = 20000.00,
    updated_at = NOW()
WHERE id = 1;  -- Replace with actual card ID

-- 7. Reset daily spending (run this daily via cron job)
SELECT reset_daily_spending();

-- 8. Reset monthly spending (run this monthly via cron job)  
SELECT reset_monthly_spending();

-- 9. Get cards for a specific user
SELECT 
    c.*,
    a.account_number,
    a.account_type,
    a.balance
FROM cards c
JOIN accounts a ON c.account_id = a.id
WHERE c.user_id = 'user-uuid-here'::UUID  -- Replace with actual user ID
AND c.status = 'active';

-- 10. Transaction summary by card
SELECT 
    c.id as card_id,
    c.card_number,
    c.cardholder_name,
    COUNT(ct.id) as total_transactions,
    SUM(CASE WHEN ct.status = 'completed' THEN ct.amount ELSE 0 END) as total_spent,
    SUM(CASE WHEN ct.status = 'declined' THEN 1 ELSE 0 END) as declined_count,
    MAX(ct.created_at) as last_transaction
FROM cards c
LEFT JOIN card_transactions ct ON c.id = ct.card_id
WHERE c.status = 'active'
GROUP BY c.id, c.card_number, c.cardholder_name
ORDER BY total_spent DESC;

-- 11. Daily spending report
SELECT 
    DATE(ct.created_at) as transaction_date,
    COUNT(*) as transaction_count,
    SUM(ct.amount) as total_amount,
    AVG(ct.amount) as average_amount
FROM card_transactions ct
WHERE ct.status = 'completed'
AND ct.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(ct.created_at)
ORDER BY transaction_date DESC;

-- 12. Cards approaching their limits
SELECT 
    c.id,
    c.card_number,
    c.cardholder_name,
    c.daily_limit,
    c.daily_spent,
    c.monthly_limit,
    c.monthly_spent,
    ROUND((c.daily_spent / c.daily_limit) * 100, 2) as daily_usage_percent,
    ROUND((c.monthly_spent / c.monthly_limit) * 100, 2) as monthly_usage_percent
FROM cards c
WHERE c.status = 'active'
AND (
    (c.daily_spent / c.daily_limit) > 0.8 OR 
    (c.monthly_spent / c.monthly_limit) > 0.8
)
ORDER BY daily_usage_percent DESC, monthly_usage_percent DESC;

-- 13. Failed/Declined transactions analysis
SELECT 
    ct.card_id,
    c.card_number,
    COUNT(*) as failed_attempts,
    SUM(ct.amount) as attempted_amount,
    MAX(ct.created_at) as last_failed_attempt
FROM card_transactions ct
JOIN cards c ON ct.card_id = c.id
WHERE ct.status IN ('failed', 'declined')
AND ct.created_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY ct.card_id, c.card_number
HAVING COUNT(*) > 3  -- Cards with more than 3 failed attempts
ORDER BY failed_attempts DESC;

-- 14. Audit log for card operations
SELECT 
    al.id,
    al.action,
    al.table_name,
    al.old_data,
    al.new_data,
    al.created_at,
    p.first_name || ' ' || p.last_name as user_name
FROM audit_logs al
LEFT JOIN profiles p ON al.user_id = p.id
WHERE al.action LIKE '%card%'
ORDER BY al.created_at DESC
LIMIT 20;
