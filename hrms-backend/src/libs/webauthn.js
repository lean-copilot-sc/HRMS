const {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} = require('@simplewebauthn/server');

const isProduction = process.env.NODE_ENV === 'production';
const defaultRpID = isProduction ? 'gov.mastercastingandcad.com' : 'localhost';
const defaultOrigin = isProduction ? 'https://gov.mastercastingandcad.com' : 'http://localhost:3000';

const rpID = process.env.WEBAUTHN_RP_ID || defaultRpID;
const origin = process.env.WEBAUTHN_ORIGIN || defaultOrigin;
const rpName = process.env.WEBAUTHN_RP_NAME || 'HRMS Attendance';

function bufferToBase64URLString(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64URLStringToBuffer(base64URLString) {
  const padding = 4 - (base64URLString.length % 4 || 4);
  const base64 = `${base64URLString}${'='.repeat(padding === 4 ? 0 : padding)}`
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  return Buffer.from(base64, 'base64');
}

function normalizeCredentialDescriptors(list = []) {
  return list.map((credential) => {
    const id = credential.id;
    return {
      ...credential,
      id: Buffer.isBuffer(id) ? bufferToBase64URLString(id) : id,
    };
  });
}

function getRegistrationOptions(user) {
  const options = generateRegistrationOptions({
    rpName,
    rpID,
    timeout: 60000,
    attestationType: 'none',
    userID: user._id.toString(),
    userName: user.email,
    userDisplayName: user.name,
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
    excludeCredentials: (user.webauthnCredentials || []).map((credential) => ({
      id: credential.credentialID,
      type: 'public-key',
      transports: credential.transports,
    })),
  });

  return {
    ...options,
    excludeCredentials: normalizeCredentialDescriptors(options.excludeCredentials),
  };
}

function getAuthenticationOptions(user) {
  const options = generateAuthenticationOptions({
    timeout: 60000,
    rpID,
    allowCredentials: (user.webauthnCredentials || []).map((credential) => ({
      id: credential.credentialID,
      type: 'public-key',
      transports: credential.transports,
    })),
    userVerification: 'preferred',
  });

  return {
    ...options,
    allowCredentials: normalizeCredentialDescriptors(options.allowCredentials),
  };
}

async function verifyRegistration(user, attestationResponse) {
  return verifyRegistrationResponse({
    response: attestationResponse,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: true,
  });
}

async function verifyAuthentication(user, assertionResponse, authenticator) {
  return verifyAuthenticationResponse({
    response: assertionResponse,
    expectedChallenge: user.currentChallenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    authenticator,
    requireUserVerification: true,
  });
}

module.exports = {
  rpID,
  origin,
  getRegistrationOptions,
  getAuthenticationOptions,
  verifyRegistration,
  verifyAuthentication,
  bufferToBase64URLString,
  base64URLStringToBuffer,
};
