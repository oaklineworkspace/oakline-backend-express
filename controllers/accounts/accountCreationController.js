// controllers/accounts/accountCreationController.js
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Utility: Generate a random account number
const generateAccountNumber = () => {
  return Math.floor(1000000000 + Math.random() * 9000000000).toString();
};

// ------------------------
// Create New Account
// ------------------------
export const createAccount = async (req, res) => {
  const { userId, accountType, initialDeposit = 0 } = req.body;

  if (!userId || !accountType) {
    return res.status(400).json({ error: 'Missing required fields: userId or accountType' });
  }

  try {
    const accountNumber = generateAccountNumber();

    const { data, error } = await supabase
      .from('accounts')
      .insert([
        {
          id: uuidv4(),
          user_id: userId,
          account_type: accountType,
          account_number: accountNumber,
          balance: initialDeposit
        }
      ])
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Account created successfully', account: data });
  } catch (err) {
    console.error('Error creating account:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
