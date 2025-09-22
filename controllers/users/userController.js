import { supabase } from '../../lib/supabaseClient.js';
import bcrypt from 'bcryptjs';

// --- Verify DOB + Last 4 SSN ---
export const verifyIdentity = async (req, res) => {
  try {
    const { dob, ssnLast4 } = req.body;

    if (!dob || !ssnLast4) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: application, error } = await supabase
      .from('applications')
      .select('first_name, middle_name, last_name, email, date_of_birth, ssn')
      .eq('date_of_birth', dob)
      .like('ssn', `%${ssnLast4}`)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: 'No matching user found' });
    }

    const full_name = [application.first_name, application.middle_name, application.last_name]
      .filter(Boolean)
      .join(' ');

    res.status(200).json({
      message: 'Identity verified',
      user: { full_name, email: application.email }
    });

  } catch (err) {
    console.error('Verify Identity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// --- Enroll User ---
export const enrollUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
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

    // Fetch full name from applications
    const { data: application, error: appError } = await supabase
      .from('applications')
      .select('first_name, middle_name, last_name')
      .eq('email', email)
      .single();

    if (appError || !application) {
      return res.status(404).json({ error: 'No application found for this email' });
    }

    const full_name = [application.first_name, application.middle_name, application.last_name]
      .filter(Boolean)
      .join(' ');

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert into Supabase users table
    const { data, error } = await supabase
      .from('users')
      .insert([{ email, password: hashedPassword, full_name, created_at: new Date() }])
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
