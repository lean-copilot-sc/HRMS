const connectDB = require('../config/database');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');
const { response } = require('../utils/response');

// Login
module.exports.login = async (event) => {
  try {
    await connectDB();
    
    const { email, password } = JSON.parse(event.body);

    // Validate input
    if (!email || !password) {
      return response(400, { message: 'Email and password are required' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return response(401, { message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return response(401, { message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id, user.role);

    return response(200, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Register
module.exports.register = async (event) => {
  try {
    await connectDB();
    
    const { name, email, password, role } = JSON.parse(event.body);

    // Validate input
    if (!name || !email || !password) {
      return response(400, { message: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return response(400, { message: 'User already exists' });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role: role || 'employee',
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id, user.role);

    return response(201, {
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Forgot Password
module.exports.forgotPassword = async (event) => {
  try {
    await connectDB();
    
    const { email } = JSON.parse(event.body);

    const user = await User.findOne({ email });
    if (!user) {
      return response(404, { message: 'User not found' });
    }

    // Generate reset token (implement your own logic)
    const resetToken = Math.random().toString(36).substring(7);
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

    await user.save();

    // Send email (implement using AWS SES)
    // await sendResetEmail(email, resetToken);

    return response(200, { message: 'Password reset link sent to email' });
  } catch (error) {
    console.error('Forgot password error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Reset Password
module.exports.resetPassword = async (event) => {
  try {
    await connectDB();
    
    const { token, newPassword } = JSON.parse(event.body);

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return response(400, { message: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return response(200, { message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};
