// controllers/admin/cardApplications.js
import { supabaseAdmin as supabase } from '../../lib/supabaseClient.js';
import bcrypt from 'bcryptjs';

/**
 * Approve or reject a card application
 */
export const approveOrRejectCardApplication = async (req, res) => {
  try {
    const { applicationId, action } = req.body;

    if (!applicationId || !action) {
      return res.status(400).json({ error: 'Application ID and action are required' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be approve or reject' });
    }

    const { data: application, error: appError } = await supabase
      .from('card_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (appError || !application) return res.status(404).json({ error: 'Card application not found' });
    if (application.status !== 'pending') return res.status(400).json({ error: 'Application already processed' });

    if (action === 'reject') {
      const { error: updateError } = await supabase
        .from('card_applications')
        .update({ status: 'rejected', rejected_at: new Date().toISOString() })
        .eq('id', applicationId);

      if (updateError) return res.status(500).json({ error: 'Failed to reject application' });

      return res.status(200).json({ success: true, message: 'Card application rejected successfully' });
    }

    // APPROVE
    const generateCardNumber = () => '4' + Math.random().toString().slice(2, 15).padEnd(15, '0');
    const generateCVV = () => Math.floor(100 + Math.random() * 900).toString();
    const generateExpiryDate = () => {
      const now = new Date();
      const expiryYear = now.getFullYear() + 3;
      const expiryMonth = String(now.getMonth() + 1).padStart(2, '0');
      return `${expiryMonth}/${expiryYear.toString().slice(-2)}`;
    };
    const generatePIN = () => Math.floor(1000 + Math.random() * 9000).toString();

    const pin = generatePIN();
    const pinHash = await bcrypt.hash(pin, 10);

    const cardData = {
      user_id: application.user_id,
      account_id: application.account_id,
      application_id: applicationId,
      card_number: generateCardNumber(),
      cardholder_name: application.cardholder_name,
      expiry_date: generateExpiryDate(),
      cvv: generateCVV(),
      card_type: application.card_type || 'debit',
      status: 'active',
      daily_limit: 2000.0,
      monthly_limit: 10000.0,
      is_locked: false,
      pin_hash: pinHash
    };

    const { data: newCard, error: cardError } = await supabase
      .from('cards')
      .insert([cardData])
      .select()
      .single();

    if (cardError) return res.status(500).json({ error: 'Failed to create card' });

    const { error: updateError } = await supabase
      .from('card_applications')
      .update({ status: 'approved', approved_at: new Date().toISOString() })
      .eq('id', applicationId);

    if (updateError) console.error('Card created but application status update failed:', updateError);

    res.status(200).json({
      success: true,
      message: 'Card application approved and card created successfully',
      card: { id: newCard.id, card_number: `****-****-****-${newCard.card_number.slice(-4)}`, pin }
    });
  } catch (error) {
    console.error('approveOrRejectCardApplication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Assign a card directly (admin action)
 */
export const assignCard = async (req, res) => {
  try {
    const { userId, accountId, cardType, cardholderName } = req.body;
    if (!userId || !accountId || !cardholderName) return res.status(400).json({ error: 'Missing required fields' });

    const { data: existingCard } = await supabase
      .from('cards')
      .select('id')
      .eq('user_id', userId)
      .eq('account_id', accountId)
      .eq('status', 'active')
      .single();

    if (existingCard) return res.status(400).json({ error: 'User already has an active card for this account' });

    const generateCardNumber = () => {
      const prefix = '4532';
      let cardNumber = prefix;
      for (let i = 0; i < 12; i++) cardNumber += Math.floor(Math.random() * 10);
      return cardNumber.match(/.{1,4}/g).join(' ');
    };
    const generateExpiryDate = () => {
      const now = new Date();
      return `${String(now.getMonth() + 1).padStart(2, '0')}/${(now.getFullYear() + 3).toString().slice(-2)}`;
    };
    const generateCVV = () => Math.floor(100 + Math.random() * 900).toString();

    const { data: accountData, error: accountError } = await supabase
      .from('accounts')
      .select('account_number, account_type')
      .eq('id', accountId)
      .single();

    if (accountError || !accountData) return res.status(404).json({ error: 'Account not found' });

    const cardNumber = generateCardNumber();
    const expiryDate = generateExpiryDate();
    const cvv = generateCVV();

    const { data: cardData, error: cardError } = await supabase
      .from('cards')
      .insert({
        user_id: userId,
        account_id: accountId,
        card_number: cardNumber,
        cardholder_name: cardholderName.toUpperCase(),
        expiry_date: expiryDate,
        cvv,
        card_type: cardType || 'debit',
        status: 'active',
        daily_limit: 2000.0,
        monthly_limit: 10000.0,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (cardError) return res.status(500).json({ error: 'Failed to assign card' });

    res.status(200).json({
      success: true,
      message: 'Card assigned successfully',
      card: cardData,
      cardDetails: { cardNumber, expiryDate, cvv }
    });
  } catch (error) {
    console.error('assignCard error:', error);
    res.status(500).json({ error: error.message || 'Failed to assign card' });
  }
};

/**
 * Get all card applications
 */
export const getCardApplications = async (req, res) => {
  try {
    if (!supabase) return res.status(500).json({ error: 'Supabase admin client not available' });

    const { data: applications, error } = await supabase
      .from('card_applications')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        ),
        accounts:account_id (
          id,
          account_number,
          account_type,
          balance
        )
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: 'Failed to fetch card applications', message: error.message });

    res.status(200).json({ success: true, applications: applications || [] });
  } catch (error) {
    console.error('getCardApplications error:', error);
    res.status(500).json({ error: 'Internal server error', message: error.message });
  }
};
