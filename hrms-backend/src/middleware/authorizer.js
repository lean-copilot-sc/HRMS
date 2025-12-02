const { verifyToken } = require('../utils/jwt');

module.exports.handler = async (event) => {
  try {
    const token = event.authorizationToken.replace('Bearer ', '');
    
    const decoded = verifyToken(token);
    
    return {
      principalId: decoded.id,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Action: 'execute-api:Invoke',
            Effect: 'Allow',
            Resource: event.methodArn,
          },
        ],
      },
      context: {
        userId: decoded.id,
        role: decoded.role,
      },
    };
  } catch (error) {
    throw new Error('Unauthorized');
  }
};
