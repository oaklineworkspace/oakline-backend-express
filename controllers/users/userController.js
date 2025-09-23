// controllers/users/userController.js
import { supabaseAdmin } from '../../lib/supabaseClient.js';
import bcrypt from 'bcryptjs';

// ------------------------
// Verify user identity (DOB + last 4 SSN)
// ------------------------
export const verifyIdentity = async (req, res) => {
  try {
    const { dob, ssnLast4 } = req.body;

    if (!dob || !ssnLast4) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server misconfiguration: Supabase admin client not available' });
    }

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, middle_name, last_name')
      .eq('dob', dob)
      .eq('ssn_last4', ssnLast4)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return res.status(404).json({ error: 'No matching user found' });
      }
      throw error;
    }

    res.status(200).json({ user });
  } catch (err) {
    console.error('Verify Identity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------
// Enroll user after verification
// ------------------------
export const enrollUser = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Server misconfiguration: Supabase admin client not available' });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (checkError && checkError.code !== 'PGRST116') throw checkError;
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          full_name,
          created_at: new Date()
        }
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'User enrolled successfully',
      user: { id: data.id, email: data.email, full_name: data.full_name }
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
