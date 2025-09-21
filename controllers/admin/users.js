// controllers/admin/users.js
import { supabaseAdmin, supabase } from '../../lib/supabaseClient.js';

//
// =====================
// Create User
// =====================
export const createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Create user in Supabase Auth
    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { firstName, lastName }
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//
// =====================
// Delete All Users
// =====================
export const deleteAllUsers = async (req, res) => {
  try {
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      return res.status(500).json({ error: 'Failed to list users' });
    }

    const results = [];
    for (const user of users?.users || []) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
      results.push({
        id: user.id,
        email: user.email,
        success: !deleteError,
        error: deleteError?.message || null
      });
    }

    res.status(200).json({ message: 'All users deleted', results });
  } catch (error) {
    console.error('Delete all users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//
// =====================
// Delete Single User
// =====================
export const deleteUser = async (req, res) => {
  try {
    const { userId, email } = req.body;
    let userToDelete = null;
    let userEmail = null;

    if (userId) {
      const { data: user, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      if (getUserError || !user) {
        return res.status(404).json({ error: 'User not found' });
      }
      userToDelete = user;
      userEmail = user.email;
    } else if (email) {
      const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
      if (listError) {
        return res.status(500).json({ error: 'Failed to list users' });
      }
      userToDelete = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());
      if (!userToDelete) {
        return res.status(404).json({ error: 'User with that email not found' });
      }
      userEmail = userToDelete.email;
    } else {
      return res.status(400).json({ error: 'Either userId or email is required' });
    }

    // delete related records
    await supabaseAdmin.from('applications').delete().eq('email', userEmail);
    await supabaseAdmin.from('accounts').delete().eq('email', userEmail);
    await supabaseAdmin.from('enrollments').delete().eq('email', userEmail);

    // delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userToDelete.id);
    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete user from authentication' });
    }

    res.status(200).json({
      message: 'User deleted successfully',
      details: { userId: userToDelete.id, email: userEmail }
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

//
// =====================
// Get All Users
// =====================
export const getUsers = async (req, res) => {
  try {
    const { data: applications, error: appError } = await supabase
      .from('applications')
      .select('*')
      .order('created_at', { ascending: false });

    if (appError) {
      return res.status(200).json({ success: true, users: [] });
    }

    const formattedUsers = applications?.map(app => ({
      id: app.id,
      email: app.email,
      name: `${app.first_name || ''} ${app.middle_name ? app.middle_name + ' ' : ''}${app.last_name || ''}`.trim(),
      created_at: app.created_at,
      phone: app.phone,
      status: app.status || 'pending'
    })) || [];

    return res.status(200).json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(200).json({ success: true, users: [] });
  }
};
