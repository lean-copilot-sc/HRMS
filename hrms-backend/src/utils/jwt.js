const jsonwebtoken = require('jsonwebtoken');

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not configured');
  }
  return secret;
};

const sign = (payload, options = {}) => {
  return jsonwebtoken.sign(payload, getSecret(), options);
};

const verify = (token, options = {}) => {
  try {
    return jsonwebtoken.verify(token, getSecret(), options);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

const generateToken = (userId, role) => {
  return sign(
    { id: userId, role },
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const verifyToken = (token) => verify(token);

module.exports = {
  generateToken,
  verifyToken,
  sign,
  verify,
};
