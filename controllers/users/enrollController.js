// controllers/users/enrollController.js
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

// ------------------------
// Setup email transporter
// ------------------------
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ------------------------
// Request Enrollment Link
// ------------------------
export const requestEnrollment = async (req, res) => {
  try {
    const { email, last_name, ssn } = req.body;

    if (!email || (!last_name && !ssn)) {
      return res.status(400).json({ error: 'Email and last name or SSN required' });
    }

    // Check if application exists
    let query = supabaseAdmin
      .from('applications')
      .select('id, first_name, last_name, email, ssn')
      .eq('email', email)
      .limit(1);

    if (last_name) query = query.eq('last_name', last_name);
    if (ssn) query = query.eq('ssn', ssn);

    const { data: application, error } = await query.single();

    if (error || !application) {
      return res.status(404).json({ error: 'No matching application found' });
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Insert into enrollments table
    await supabaseAdmin.from('enrollments').upsert({
      email: application.email,
      application_id: application.id,
      token,
      is_used: false,
    });

    // Send enrollment email
    const enrollLink = `${process.env.NEXT_PUBLIC_SITE_URL}/complete-enroll?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: application.email,
      subject: 'Complete Your Enrollment',
      html: `<p>Hello ${application.first_name},</p>
             <p>Click <a href="${enrollLink}">here</a> to complete your enrollment.</p>`,
    });

    res.json({ message: 'Enrollment link sent to your email' });
  } catch (err) {
    console.error('Enrollment request error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------
// Complete Enrollment
// ------------------------
export const completeEnrollment = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password)
      return res.status(400).json({ error: 'Token and password required' });

    // Find enrollment by token
    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .select('id, email, application_id, is_used')
      .eq('token', token)
      .single();

    if (error || !enrollment)
      return res.status(404).json({ error: 'Invalid enrollment token' });
    if (enrollment.is_used)
      return res.status(400).json({ error: 'Token already used' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create Supabase Auth user
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: enrollment.email,
      password: hashedPassword,
      email_confirm: true,
    });

    if (userError) throw userError;

    // Mark enrollment as used
    await supabaseAdmin
      .from('enrollments')
      .update({ is_used: true })
      .eq('id', enrollment.id);

    res.json({ message: 'Enrollment completed. You can now sign in.' });
  } catch (err) {
    console.error('Complete enrollment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
