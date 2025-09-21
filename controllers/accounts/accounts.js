// controllers/accounts/accounts.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =====================
// Get all accounts for a user
// =====================
export const getUserAccounts = async (req, res) => {
  const userId = req.user?.id; // Assuming verifyToken middleware adds `req.user`

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: accounts, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.status(200).json({ accounts });
  } catch (err) {
    console.error('Error fetching user accounts:', err);
    res.status(500).json({ error: err.message || 'Server error' });
  }
};
