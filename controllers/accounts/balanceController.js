// controllers/accounts/balanceController.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// ------------------------
// Update Account Balance
// ------------------------
export const updateBalance = async (req, res) => {
  const { accountId, amount, type } = req.body;

  if (!accountId || !amount || !type) {
    return res.status(400).json({ error: 'Missing required fields: accountId, amount, or type' });
  }

  try {
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', accountId)
      .single();
    if (accountError) throw accountError;

    let newBalance = parseFloat(account.balance);
    if (type === 'credit') {
      newBalance += parseFloat(amount);
    } else if (type === 'debit') {
      if (parseFloat(amount) > newBalance) {
        return res.status(400).json({ error: 'Insufficient balance' });
      }
      newBalance -= parseFloat(amount);
    } else {
      return res.status(400).json({ error: 'Invalid type, must be "credit" or "debit"' });
    }

    const { data, error } = await supabase
      .from('accounts')
      .update({ balance: newBalance })
      .eq('id', accountId)
      .single();

    if (error) throw error;

    res.status(200).json({ message: 'Balance updated successfully', account: data });
  } catch (err) {
    console.error('Error updating balance:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
