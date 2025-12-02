const { connectToDatabase } = require('../libs/db');
const User = require('../models/User');
const { verifyRegistration, bufferToBase64URLString } = require('../libs/webauthn');
const { success, error } = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { userId, attestationResponse } = body;

    if (!userId || !attestationResponse) {
      return error('userId and attestationResponse are required', 400);
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return error('User not found', 404);
    }

    if (!user.currentChallenge) {
      return error('No registration challenge is active for this user', 400);
    }

    const verification = await verifyRegistration(user, attestationResponse);

    if (!verification.verified) {
      return error('Registration could not be verified', 400);
    }

    const { registrationInfo } = verification;
    const credentialIDBuffer = Buffer.from(registrationInfo.credentialID);
    const credentialPublicKeyBuffer = Buffer.from(registrationInfo.credentialPublicKey);
    const { counter } = registrationInfo;

    // Avoid duplicates if the credential already exists
    const alreadyExists = (user.webauthnCredentials || []).some((credential) =>
      credential.credentialID.equals(credentialIDBuffer)
    );

    if (!alreadyExists) {
      user.webauthnCredentials.push({
        credentialID: credentialIDBuffer,
        credentialPublicKey: credentialPublicKeyBuffer,
        counter,
        transports: attestationResponse?.response?.transports || [],
        createdAt: new Date(),
      });
    }

    user.currentChallenge = null;
    await user.save();

    return success({
      verified: verification.verified,
      credentialId: bufferToBase64URLString(credentialIDBuffer),
    });
  } catch (err) {
    console.error('WebAuthn register complete error:', err);
    return error(err.message || 'Failed to complete registration');
  }
};
