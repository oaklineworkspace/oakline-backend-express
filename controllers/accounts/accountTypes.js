// controllers/accounts/accountTypes.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =====================
// Get All Account Types
// =====================
export const getAccountTypes = async (req, res) => {
  try {
    // Call PostgreSQL function to fetch all account types
    const { data, error } = await supabase.rpc('get_account_types');

    if (error) {
      console.error('Error fetching account types:', error);
      return res.status(500).json({ error: 'Failed to fetch account types' });
    }

    // Convert to plain array of strings
    const accountTypes = data.map(item => item.get_account_types);

    res.status(200).json({ accountTypes });
  } catch (err) {
    console.error('Server error fetching account types:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
