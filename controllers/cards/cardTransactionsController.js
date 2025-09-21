import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =====================
// Fetch card transactions
// =====================
export const getCardTransactions = async (userId, cardId) => {
  // Ensure the card belongs to the user
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('id, account_id')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single();
  if (cardError || !card) throw new Error('Card not found');

  const { data: transactions, error } = await supabase
    .from('card_transactions')
    .select('*')
    .eq('card_id', cardId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return transactions;
};

// =====================
// Process a new card transaction
// =====================
export const processCardTransaction = async (userId, cardId, amount, merchant, location, transactionType='purchase') => {
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select(`
      *,
      accounts!inner(
        id,
        balance
      )
    `)
    .eq('id', cardId)
    .eq('user_id', userId)
    .single();
  if (cardError || !card) throw new Error('Card not found');

  if (card.status !== 'active') throw new Error('Card is not active');
  if (card.is_locked) throw new Error('Card is locked');
  if (amount > card.daily_limit) throw new Error('Exceeds daily limit');
  if (card.accounts.balance < amount) throw new Error('Insufficient funds');

  // Insert card transaction
  const { data: newTransaction, error: transactionError } = await supabase
    .from('card_transactions')
    .insert([{
      card_id: cardId,
      transaction_type: transactionType,
      amount,
      merchant: merchant || 'Unknown Merchant',
      location: location || 'Unknown Location'
    }])
    .select()
    .single();
  if (transactionError) throw transactionError;

  // Update account balance
  const { error: balanceError } = await supabase
    .from('accounts')
    .update({ balance: card.accounts.balance - amount })
    .eq('id', card.account_id);
  if (balanceError) throw balanceError;

  // Insert account transaction record
  await supabase
    .from('transactions')
    .insert([{
      user_id: userId,
      account_id: card.account_id,
      type: 'debit',
      amount,
      description: `Card transaction at ${merchant || 'Unknown Merchant'}`,
      status: 'completed'
    }]);

  return { transaction: newTransaction, new_balance: card.accounts.balance - amount };
};
