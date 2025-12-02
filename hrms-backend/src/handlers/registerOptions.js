const { connectToDatabase } = require('../libs/db');
const User = require('../models/User');
const { getRegistrationOptions } = require('../libs/webauthn');
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

    const options = getRegistrationOptions(user);
    user.currentChallenge = options.challenge;
    await user.save();

    return success(options);
  } catch (err) {
    console.error('WebAuthn register options error:', err);
    return error(err.message || 'Failed to generate registration options');
  }
};
