// controllers/accounts/transferController.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Utility: Generate random transaction reference
const generateReference = () =>
  'TX' + Math.floor(1000000000 + Math.random() * 9000000000);

// ------------------------
// Transfer Funds
// ------------------------
export const transferFunds = async (req, res) => {
  const { fromAccountId, toAccountNumber, amount, transferType } = req.body;

  if (!fromAccountId || !toAccountNumber || !amount || parseFloat(amount) <= 0) {
    return res.status(400).json({ error: 'Missing or invalid fields.' });
  }

  try {
    // Get sender account
    const { data: fromAccData, error: fromAccError } = await supabase
      .from('accounts')
      .select('*')
      .eq('id', fromAccountId)
      .single();
    if (fromAccError) throw fromAccError;

    if (parseFloat(amount) > fromAccData.balance) {
      return res.status(400).json({ error: 'Insufficient balance.' });
    }

    // Find recipient account
    const { data: recipient, error: recipientError } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_number', toAccountNumber)
      .single();
    if (recipientError) throw recipientError;
    if (!recipient) return res.status(404).json({ error: 'Recipient account not found.' });

    // Handle transfer types (fees)
    let fee = transferType === 'international' ? 15 : 0;
    const totalAmount = parseFloat(amount) + fee;
    if (totalAmount > fromAccData.balance) {
      return res.status(400).json({ error: 'Insufficient balance including fees.' });
    }

    // Update balances
    await supabase.from('accounts').update({ balance: fromAccData.balance - totalAmount }).eq('id', fromAccountId);
    await supabase.from('accounts').update({ balance: recipient.balance + parseFloat(amount) }).eq('id', recipient.id);

    // Record transactions
    const reference = generateReference();
    await supabase.from('transactions').insert([
      {
        account_id: fromAccountId,
        type: transferType === 'international' ? 'International Transfer Out' : 'Transfer Out',
        amount: parseFloat(amount),
        status: 'completed',
        reference
      },
      {
        account_id: recipient.id,
        type: transferType === 'international' ? 'International Transfer In' : 'Transfer In',
        amount: parseFloat(amount),
        status: 'completed',
        reference
      }
    ]);

    res.status(200).json({ message: `Transfer successful. Reference: ${reference}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};

// ------------------------
// Get Transaction History
// ------------------------
export const getTransactionHistory = async (req, res) => {
  const { accountId } = req.params;
  if (!accountId) return res.status(400).json({ error: 'Account ID required.' });

  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.status(200).json({ transactions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
