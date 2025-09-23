import { supabaseAdmin } from '../lib/supabaseAdmin.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

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
    const { email, ssnLast4 } = req.body;

    if (!email || !ssnLast4) {
      return res.status(400).json({ error: 'Email and last 4 of SSN required' });
    }

    // Check application
    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select('id, first_name, email, ssn')
      .eq('email', email)
      .like('ssn', `%${ssnLast4}`)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: 'No matching application found' });
    }

    // Create token
    const token = crypto.randomBytes(32).toString('hex');

    // Insert into enrollments table
    await supabaseAdmin.from('enrollments').upsert({
      email: application.email,
      application_id: application.id,
      token,
      is_used: false,
    });

    // Send email
    const enrollLink = `${process.env.NEXT_PUBLIC_SITE_URL}/complete-enroll?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: application.email,
      subject: 'Complete Your Enrollment',
      html: `<p>Hello ${application.first_name},</p>
             <p>Click <a href="${enrollLink}">here</a> to complete your enrollment.</p>`
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
    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    // Find enrollment
    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .select('id, email, application_id, is_used')
      .eq('token', token)
      .single();

    if (error || !enrollment) return res.status(404).json({ error: 'Invalid enrollment token' });
    if (enrollment.is_used) return res.status(400).json({ error: 'Token already used' });

    // Create user in Supabase Auth
    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: enrollment.email,
      password,
      email_confirm: true,
    });
    if (userError) throw userError;

    // Mark enrollment as used
    await supabaseAdmin.from('enrollments').update({ is_used: true }).eq('id', enrollment.id);

    res.json({ message: 'Enrollment completed. You can now sign in.' });
  } catch (err) {
    console.error('Complete enrollment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
