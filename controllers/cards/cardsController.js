import { createClient } from '@supabase/supabase-js';
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// =====================
// Fetch all user cards
// =====================
export const getUserCards = async (userId) => {
  const { data: cards, error } = await supabase
    .from('cards')
    .select(`
      *,
      accounts!inner(
        id,
        account_number,
        account_type,
        balance
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Mask sensitive info
  return cards.map(card => ({
    ...card,
    card_number: `****-****-****-${card.card_number.slice(-4)}`,
    cvv: undefined,
    pin_hash: undefined
  }));
};

// =====================
// Update card (lock, unlock, limits, deactivate)
// =====================
export const updateCard = async (userId, cardId, action, dailyLimit, monthlyLimit) => {
  const { data: card, error: cardError } = await supabase
    .from('cards')
    .select('*')
    .eq('id', cardId)
    .eq('user_id', userId)
    .single();

  if (cardError || !card) throw new Error('Card not found');

  let updateData = {};
  switch(action) {
    case 'lock': updateData.is_locked = true; break;
    case 'unlock': updateData.is_locked = false; break;
    case 'deactivate': updateData.status = 'inactive'; break;
    case 'update_limits':
      if(dailyLimit !== undefined) updateData.daily_limit = dailyLimit;
      if(monthlyLimit !== undefined) updateData.monthly_limit = monthlyLimit;
      break;
    default: throw new Error('Invalid action');
  }

  const { data: updatedCard, error: updateError } = await supabase
    .from('cards')
    .update(updateData)
    .eq('id', cardId)
    .eq('user_id', userId)
    .select()
    .single();

  if (updateError) throw updateError;

  return {
    ...updatedCard,
    card_number: `****-****-****-${updatedCard.card_number.slice(-4)}`,
    cvv: undefined,
    pin_hash: undefined
  };
};

// =====================
// Create a new card
// =====================
export const createCard = async (userId, accountId, cardType = 'debit') => {
  const cardNumber = '4' + Math.floor(100000000000000 + Math.random() * 900000000000000);
  const { data, error } = await supabase
    .from('cards')
    .insert([{ user_id: userId, account_id: accountId, card_type: cardType, card_number: cardNumber }])
    .select()
    .single();

  if (error) throw error;
  return data;
};
