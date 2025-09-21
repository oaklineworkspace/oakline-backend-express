// controllers/admin/transactions.js
import { supabase, supabaseAdmin } from '../../lib/supabaseClient.js';

// =====================
// Bulk Transactions (CSV)
// =====================
export const bulkTransactions = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { csvData } = req.body;
    if (!csvData) return res.status(400).json({ error: 'CSV data is required' });

    const lines = csvData.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const requiredHeaders = ['email', 'account_number', 'type', 'amount', 'description'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length) return res.status(400).json({ error: `Missing required headers: ${missingHeaders.join(', ')}` });

    const results = { total: lines.length - 1, successful: 0, failed: 0, errors: [] };

    for (let i = 1; i < lines.length; i++) {
      const rowData = lines[i].split(',').map(cell => cell.trim());
      const row = {};
      headers.forEach((header, index) => row[header] = rowData[index]);

      try {
        if (!row.email || !row.account_number || !row.type || !row.amount) throw new Error('Missing required fields');
        const amount = parseFloat(row.amount);
        if (isNaN(amount) || amount <= 0) throw new Error('Invalid amount');

        const { data: user, error: userError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', row.email.toLowerCase())
          .single();
        if (userError || !user) throw new Error('User not found');

        const { data: account, error: accountError } = await supabase
          .from('accounts')
          .select('*')
          .eq('account_number', row.account_number)
          .eq('user_id', user.id)
          .single();
        if (accountError || !account) throw new Error('Account not found');

        const currentBalance = parseFloat(account.balance);
        let newBalance, transactionAmount;

        switch (row.type.toLowerCase()) {
          case 'deposit':
          case 'interest':
          case 'bonus':
          case 'refund':
            transactionAmount = amount;
            newBalance = currentBalance + amount;
            break;
          case 'withdrawal':
          case 'fee':
            transactionAmount = -amount;
            newBalance = currentBalance - amount;
            break;
          case 'adjustment':
            transactionAmount = amount;
            newBalance = currentBalance + amount;
            break;
          default:
            throw new Error(`Invalid transaction type: ${row.type}`);
        }

        const { error: updateError } = await supabase
          .from('accounts')
          .update({ balance: newBalance.toFixed(2), updated_at: new Date().toISOString() })
          .eq('id', account.id);
        if (updateError) throw updateError;

        const { error: transactionError } = await supabase
          .from('transactions')
          .insert([{
            account_id: account.id,
            user_id: user.id,
            type: row.type.toLowerCase(),
            amount: transactionAmount,
            status: 'completed',
            description: row.description || `Bulk ${row.type}`,
            reference: `BULK_${Date.now()}_${i}`,
            created_at: new Date().toISOString()
          }]);
        if (transactionError) {
          await supabase.from('accounts').update({ balance: currentBalance.toFixed(2), updated_at: new Date().toISOString() }).eq('id', account.id);
          throw transactionError;
        }

        results.successful++;
      } catch (error) {
        results.failed++;
        results.errors.push({ row: i + 1, message: error.message, data: row });
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Bulk transaction error:', error);
    res.status(500).json({ error: 'Internal server error during bulk processing', details: error.message });
  }
};

// =====================
// Get Transactions
// =====================
export const getTransactions = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    const { data: transactions, error } = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) {
      console.error('Error fetching transactions:', error);
      return res.status(200).json({ success: true, transactions: [] });
    }

    res.status(200).json({ success: true, transactions: transactions || [] });
  } catch (error) {
    console.error('Server error:', error);
    res.status(200).json({ success: true, transactions: [] });
  }
};

// =====================
// Manual Transaction
// =====================
export const manualTransaction = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { accountId, userId, type, amount, description } = req.body;
    if (!accountId || !userId || !type || !amount) return res.status(400).json({ error: 'Missing required fields' });

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ error: 'Amount must be greater than 0' });

    const { data: account, error: accountError } = await supabase.from('accounts').select('*').eq('id', accountId).eq('user_id', userId).single();
    if (accountError || !account) return res.status(404).json({ error: 'Account not found' });

    const currentBalance = parseFloat(account.balance);
    let newBalance, transactionAmount;

    switch (type) {
      case 'deposit':
      case 'interest':
      case 'bonus':
      case 'refund':
        transactionAmount = numericAmount;
        newBalance = currentBalance + numericAmount;
        break;
      case 'withdrawal':
      case 'fee':
        transactionAmount = -numericAmount;
        newBalance = currentBalance - numericAmount;
        break;
      case 'adjustment':
        transactionAmount = numericAmount;
        newBalance = currentBalance + numericAmount;
        break;
      default:
        return res.status(400).json({ error: 'Invalid transaction type' });
    }

    if (newBalance < 0 && !['adjustment'].includes(type)) return res.status(400).json({ error: `Transaction would result in negative balance: $${newBalance.toFixed(2)}` });

    const { error: updateError } = await supabase.from('accounts').update({ balance: newBalance.toFixed(2), updated_at: new Date().toISOString() }).eq('id', accountId);
    if (updateError) throw updateError;

    const { data: transaction, error: transactionError } = await supabase.from('transactions').insert([{
      account_id: accountId,
      user_id: userId,
      type: type,
      amount: transactionAmount,
      status: 'completed',
      description: description || `Manual ${type}`,
      reference: `MANUAL_${Date.now()}`,
      created_at: new Date().toISOString()
    }]).select().single();
    if (transactionError) {
      await supabase.from('accounts').update({ balance: currentBalance.toFixed(2), updated_at: new Date().toISOString() }).eq('id', accountId);
      throw transactionError;
    }

    res.status(200).json({ success: true, message: 'Transaction added successfully', transaction, newBalance: newBalance.toFixed(2), previousBalance: currentBalance.toFixed(2) });
  } catch (error) {
    console.error('Manual transaction error:', error);
    res.status(500).json({ error: 'Internal server error during transaction processing', details: error.message });
  }
};

// =====================
// Process Card Transaction
// =====================
export const processCardTransaction = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { cardId, amount, merchant, location, transactionType } = req.body;
    if (!cardId || !amount || amount <= 0) return res.status(400).json({ success: false, error: 'Card ID and valid amount are required' });

    const { data, error } = await supabase.rpc('process_card_transaction', {
      p_card_id: parseInt(cardId),
      p_amount: parseFloat(amount),
      p_merchant: merchant || 'Unknown Merchant',
      p_location: location || 'Unknown Location',
      p_transaction_type: transactionType || 'purchase'
    });

    if (error) {
      console.error('Error processing card transaction:', error);
      return res.status(500).json({ success: false, error: 'Database error: ' + error.message });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Error in process-card-transaction API:', error);
    res.status(500).json({ success: false, error: 'Internal server error: ' + error.message });
  }
};
