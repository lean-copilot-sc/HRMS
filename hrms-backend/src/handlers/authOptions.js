const { connectToDatabase } = require('../libs/db');
const User = require('../models/User');
const { getAuthenticationOptions } = require('../libs/webauthn');
const { success, error } = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { userId } = body;

    if (!userId) {
      return error('userId is required', 400);
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return error('User not found', 404);
    }

    if (!user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      return error('No WebAuthn credentials registered for this user', 400);
    }

    const options = getAuthenticationOptions(user);
    user.currentChallenge = options.challenge;
    await user.save();

    return success(options);
  } catch (err) {
    console.error('WebAuthn auth options error:', err);
    return error(err.message || 'Failed to generate authentication options');
  }
};
