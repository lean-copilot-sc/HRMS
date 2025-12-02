const { connectToDatabase } = require('../libs/db');
const User = require('../models/User');
const { verifyAuthentication, base64URLStringToBuffer } = require('../libs/webauthn');
const saveAttendanceRecord = require('../helpers/saveAttendanceRecord');
const { success, error } = require('../utils/response');

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const { userId, assertionResponse, action } = body;

    if (!userId || !assertionResponse || !action) {
      return error('userId, assertionResponse, and action are required', 400);
    }

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return error('User not found', 404);
    }

    if (!user.currentChallenge) {
      return error('No authentication challenge is active for this user', 400);
    }

    if (!user.webauthnCredentials || user.webauthnCredentials.length === 0) {
      return error('No WebAuthn credentials registered for this user', 400);
    }

    const credentialIdBase64 = assertionResponse?.id || assertionResponse?.rawId;
    if (!credentialIdBase64) {
      return error('Missing credential ID in assertion response', 400);
    }

    const credentialIdBuffer = base64URLStringToBuffer(credentialIdBase64);

    const storedCredential = user.webauthnCredentials.find((credential) =>
      credential.credentialID.equals(credentialIdBuffer)
    );

    if (!storedCredential) {
      return error('Authenticator is not registered for this user', 400);
    }

    const verification = await verifyAuthentication(user, assertionResponse, {
      credentialID: storedCredential.credentialID,
      credentialPublicKey: storedCredential.credentialPublicKey,
      counter: storedCredential.counter,
      transports: storedCredential.transports,
    });

    if (!verification.verified) {
      return error('Authentication could not be verified', 400);
    }

    const { authenticationInfo } = verification;
    storedCredential.counter = authenticationInfo.newCounter;
    user.currentChallenge = null;
    user.markModified('webauthnCredentials');
    await user.save();

    let attendanceRecord = null;
    try {
      attendanceRecord = await saveAttendanceRecord(user._id, action);
    } catch (attendanceError) {
      console.error('Attendance record error:', attendanceError);
      return error(attendanceError.message || 'Failed to record attendance', 400);
    }

    return success({
      verified: verification.verified,
      action,
      record: {
        id: attendanceRecord._id,
        _id: attendanceRecord._id,
        userId: attendanceRecord.userId,
        action: attendanceRecord.action,
        timestamp: attendanceRecord.timestamp,
      },
    });
  } catch (err) {
    console.error('WebAuthn auth complete error:', err);
    return error(err.message || 'Failed to complete authentication');
  }
};
