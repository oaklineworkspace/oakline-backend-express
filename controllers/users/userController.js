// controllers/users/userController.js
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import bcrypt from 'bcryptjs';

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

    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select('id, first_name, email, ssn')
      .eq('email', email)
      .like('ssn', `%${ssnLast4}`)
      .single();

    if (error || !application) {
      return res.status(404).json({ error: 'No matching application found' });
    }

    const token = crypto.randomBytes(32).toString('hex');

    await supabaseAdmin.from('enrollments').upsert({
      email: application.email,
      application_id: application.id,
      token,
      is_used: false,
    });

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
// Complete Enrollment (set password)
// ------------------------
export const completeEnrollment = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) return res.status(400).json({ error: 'Token and password required' });

    const { data: enrollment, error } = await supabaseAdmin
      .from('enrollments')
      .select('id, email, application_id, is_used')
      .eq('token', token)
      .single();

    if (error || !enrollment) return res.status(404).json({ error: 'Invalid enrollment token' });
    if (enrollment.is_used) return res.status(400).json({ error: 'Token already used' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: user, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: enrollment.email,
      password: hashedPassword,
      email_confirm: true,
    });

    if (userError) throw userError;

    await supabaseAdmin.from('enrollments').update({ is_used: true }).eq('id', enrollment.id);

    res.json({ message: 'Enrollment completed. You can now sign in.' });
  } catch (err) {
    console.error('Complete enrollment error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------
// Verify user identity
// ------------------------
export const verifyIdentity = async (req, res) => {
  try {
    const { dob, ssnLast4 } = req.body;

    if (!dob || !ssnLast4) return res.status(400).json({ error: 'DOB and last 4 of SSN required' });

    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select('id, first_name, last_name, email')
      .eq('date_of_birth', dob)
      .like('ssn', `%${ssnLast4}`)
      .single();

    if (error || !application) return res.status(404).json({ error: 'No matching application found' });

    res.json({ application });
  } catch (err) {
    console.error('Verify identity error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// ------------------------
// Enroll user after verification (manual password)
// ------------------------
export const enrollUser = async (req, res) => {
  try {
    const { applicationId, password } = req.body;

    if (!applicationId || !password) return res.status(400).json({ error: 'Application ID and password required' });

    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, email, first_name, last_name')
      .eq('id', applicationId)
      .single();

    if (appError || !application) return res.status(404).json({ error: 'Application not found' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password: hashedPassword,
      email_confirm: true,
      user_metadata: {
        first_name: application.first_name,
        last_name: application.last_name,
      },
    });

    if (authError) throw authError;

    await supabaseAdmin
      .from('applications')
      .update({ user_id: authUser.id, application_status: 'approved' })
      .eq('id', applicationId);

    res.status(201).json({
      message: 'Enrollment successful',
      user: {
        id: authUser.id,
        email: authUser.email,
        first_name: application.first_name,
        last_name: application.last_name,
      },
    });
  } catch (err) {
    console.error('Enroll user error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
