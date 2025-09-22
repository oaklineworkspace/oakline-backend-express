// controllers/userController.js
import { supabase } from '../../lib/supabaseClient.js';
import bcrypt from 'bcryptjs';

export const enrollUser = async (req, res) => {
  try {
    const { email, password, full_name } = req.body;

    if (!email || !password || !full_name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into Supabase
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password: hashedPassword,
          full_name,
          created_at: new Date(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({
      message: 'User enrolled successfully',
      user: { id: data.id, email: data.email, full_name: data.full_name },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
