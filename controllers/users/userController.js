// controllers/users/userController.js
import { supabaseAdmin } from '../../lib/supabaseAdmin.js';

// ------------------------
// Verify user identity (DOB + last 4 SSN)
// ------------------------
export const verifyIdentity = async (req, res) => {
  try {
    const { dob, ssnLast4 } = req.body;
    if (!dob || !ssnLast4) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data: application, error } = await supabaseAdmin
      .from('applications')
      .select('id, first_name, middle_name, last_name, email')
      .eq('date_of_birth', dob)
      .like('ssn', `%${ssnLast4}`)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return res.status(404).json({ error: 'No matching application found' });
      throw error;
    }

    res.status(200).json({ application });
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
    const { applicationId, password } = req.body;
    if (!applicationId || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get the application
    const { data: application, error: appError } = await supabaseAdmin
      .from('applications')
      .select('id, email, first_name, middle_name, last_name')
      .eq('id', applicationId)
      .single();
    if (appError) throw appError;
    if (!application) return res.status(404).json({ error: 'Application not found' });

    // Create Supabase Auth user
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: application.email,
      password,
      email_confirm: true,
      user_metadata: {
        first_name: application.first_name,
        middle_name: application.middle_name,
        last_name: application.last_name,
      },
    });
    if (authError) throw authError;

    // Update the applications table with the new user ID
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
        middle_name: application.middle_name,
        last_name: application.last_name,
      },
    });
  } catch (err) {
    console.error('Enroll error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};
