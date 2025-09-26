// controllers/applications/applicationsController.js
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// -------------------------
// Submit Application
// -------------------------
export const submitApplication = async (req, res) => {
  try {
    const {
      firstName,
      middleName,
      lastName,
      email,
      phone,
      dateOfBirth,
      country,
      ssn,
      idNumber,
      address,
      city,
      state,
      zipCode,
      mothersMaidenName,
      accountTypes = []
    } = req.body;

    if (!firstName || !lastName || !email) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Insert application into Supabase
    const { data: application, error: applicationError } = await supabaseAdmin
      .from('applications')
      .insert([{
        first_name: firstName.trim(),
        middle_name: middleName?.trim() || null,
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        date_of_birth: dateOfBirth,
        country,
        ssn: country === 'US' ? ssn?.trim() : null,
        id_number: country !== 'US' ? idNumber?.trim() : null,
        address: address?.trim() || null,
        city,
        state,
        zip_code: zipCode?.trim() || null,
        mothers_maiden_name: mothersMaidenName?.trim() || null,
        account_types: accountTypes,
        application_status: 'pending',
      }])
      .select()
      .single();

    if (applicationError) {
      console.error('Application insert error:', applicationError);
      return res.status(500).json({ error: 'Failed to save application' });
    }

    // Create enrollment token
    const token = crypto.randomBytes(32).toString('hex');
    await supabaseAdmin.from('enrollments').insert([{
      email: application.email,
      application_id: application.id,
      token,
      is_used: false,
    }]);

    // Send confirmation email
    const enrollLink = `${process.env.NEXT_PUBLIC_SITE_URL}/complete-enroll?token=${token}`;
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: application.email,
      subject: 'Application Received - Complete Enrollment',
      html: `
        <p>Hello ${application.first_name},</p>
        <p>Thank you for applying for an account with us. Your application has been received.</p>
        <p>To complete your enrollment, click the link below:</p>
        <p><a href="${enrollLink}">Complete Enrollment</a></p>
        <p>If you did not apply, you can ignore this email.</p>
      `,
    });

    res.status(201).json({
      message: 'Application submitted successfully. Check your email to complete enrollment.',
      applicationId: application.id
    });

  } catch (err) {
    console.error('Submit application error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
