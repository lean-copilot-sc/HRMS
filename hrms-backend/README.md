# HRMS Backend - Node.js + AWS Lambda + MongoDB

## Overview
Serverless backend for Human Resource Management System using AWS Lambda, Node.js, and MongoDB.

## Tech Stack
- **Node.js** 18.x
- **AWS Lambda** (Serverless)
- **MongoDB** (Database)
- **Mongoose** (ODM)
- **JWT** (Authentication)
- **AWS S3** (File storage)
- **AWS SES** (Email notifications)
- **Serverless Framework**

## Project Structure
```
src/
├── handlers/           # Lambda function handlers
│   ├── auth.js        # Authentication endpoints
│   ├── employees.js   # Employee management
│   ├── attendance.js  # Attendance tracking
│   ├── leave.js       # Leave management
│   ├── departments.js # Department management
│   ├── holidays.js    # Holiday management
│   └── dashboard.js   # Dashboard statistics
├── models/            # Mongoose models
│   ├── User.js
│   ├── Employee.js
│   ├── Attendance.js
│   ├── Leave.js
│   ├── Department.js
│   └── Holiday.js
├── middleware/        # Custom middleware
│   └── authorizer.js  # JWT authorization
├── config/            # Configuration
│   └── database.js    # MongoDB connection
├── utils/             # Utility functions
│   ├── jwt.js         # JWT helpers
│   ├── response.js    # API response helper
│   └── validators.js  # Input validators
└── services/          # Business logic
    ├── email.js       # AWS SES email service
    └── s3.js          # AWS S3 file upload
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/register` - User registration
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Employees
- `GET /api/employees` - Get all employees
- `POST /api/employees` - Create employee
- `GET /api/employees/:id` - Get employee by ID
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Attendance
- `POST /api/attendance/clock-in` - Clock in
- `POST /api/attendance/clock-out` - Clock out
- `GET /api/attendance/:employeeId` - Get attendance records
- `GET /api/attendance/report` - Get attendance report
- `POST /api/attendance/manual` - Manual attendance entry

### Leave
- `POST /api/leave/request` - Request leave
- `GET /api/leave/my-requests` - Get my leave requests
- `GET /api/leave/pending` - Get pending leave requests
- `PUT /api/leave/:id/approve` - Approve leave
- `PUT /api/leave/:id/reject` - Reject leave

### Departments
- `GET /api/departments` - Get all departments
- `POST /api/departments` - Create department
- `PUT /api/departments/:id` - Update department
- `DELETE /api/departments/:id` - Delete department

### Holidays
- `GET /api/holidays` - Get all holidays
- `POST /api/holidays` - Create holiday
- `PUT /api/holidays/:id` - Update holiday
- `DELETE /api/holidays/:id` - Delete holiday

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics
- `GET /api/dashboard/activity` - Get recent activity

## Installation

### Prerequisites
- Node.js 18+
- npm or yarn
- MongoDB Atlas account
- AWS Account
- Serverless Framework

### Setup
```bash
# Install dependencies
npm install

# Install Serverless Framework globally
npm install -g serverless

# Copy environment file
cp .env.example .env

# Update .env with your credentials
```

### Environment Variables
Create `.env` file:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/hrms
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
AWS_S3_BUCKET=hrms-uploads
AWS_REGION=us-east-1
SES_EMAIL_FROM=noreply@hrms.com
NODE_ENV=development
```

## Database Setup

### MongoDB Atlas
1. Create MongoDB Atlas account
2. Create new cluster
3. Add database user
4. Whitelist IP address (0.0.0.0/0 for Lambda)
5. Get connection string
6. Update `MONGODB_URI` in `.env`

### Collections
- `users` - User accounts
- `employees` - Employee records
- `attendance` - Attendance records
- `leaves` - Leave requests
- `departments` - Departments
- `holidays` - Company holidays

## Development

### Local Development
```bash
# Start serverless offline
npm run dev

# API will be available at http://localhost:3001
```

### Testing Locally
```bash
# Test auth login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@hrms.com","password":"password123"}'
```

## Deployment

### Configure AWS Credentials
```bash
# Configure AWS CLI
aws configure

# Or use Serverless credentials
serverless config credentials \
  --provider aws \
  --key YOUR_ACCESS_KEY \
  --secret YOUR_SECRET_KEY
```

### Deploy to AWS
```bash
# Deploy to dev stage
npm run deploy

# Deploy to production
serverless deploy --stage prod

# Deploy specific function
serverless deploy function -f authLogin
```

### Remove Deployment
```bash
npm run remove
```

## AWS Services Setup

### S3 Bucket
```bash
# Create S3 bucket for file uploads
aws s3 mb s3://hrms-uploads

# Set bucket policy for public read (optional)
aws s3api put-bucket-policy --bucket hrms-uploads --policy file://bucket-policy.json
```

### SES Email
```bash
# Verify email address
aws ses verify-email-identity --email-address noreply@hrms.com

# Check verification status
aws ses get-identity-verification-attributes --identities noreply@hrms.com
```

## Authentication

### JWT Token
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Token Structure
```javascript
{
  id: "user_id",
  role: "admin|hr|employee",
  iat: 1234567890,
  exp: 1234567890
}
```

## Security

### Password Hashing
- bcryptjs with salt rounds: 10
- Passwords hashed before saving to database

### Input Validation
- Use Joi for request validation
- Validate all user inputs
- Sanitize data before database operations

### CORS
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}
```

### Rate Limiting
Implement rate limiting for production (optional).

## Monitoring

### CloudWatch Logs
```bash
# View logs for specific function
npm run logs -- authLogin

# Tail logs
serverless logs -f authLogin --tail
```

### CloudWatch Metrics
- Lambda invocations
- Error rate
- Duration
- Throttles

## Cost Optimization
- Use Lambda free tier (1M requests/month)
- Optimize function memory (512MB recommended)
- Set appropriate timeout (30s default)
- Use MongoDB connection pooling
- Cache database connections

## Troubleshooting

### MongoDB Connection Issues
- Check MongoDB Atlas IP whitelist
- Verify connection string format
- Ensure network access is configured

### Lambda Timeout
- Increase timeout in `serverless.yml`
- Optimize database queries
- Use indexes on frequently queried fields

### CORS Errors
- Ensure CORS headers in response
- Check API Gateway CORS configuration

## Testing

### Unit Tests
```bash
npm test
```

### Integration Tests
```bash
npm run test:integration
```

## Production Checklist
- [ ] Change JWT_SECRET to strong random value
- [ ] Set up MongoDB Atlas production cluster
- [ ] Configure AWS SES production access
- [ ] Set up S3 bucket with proper permissions
- [ ] Enable CloudWatch monitoring
- [ ] Set up API Gateway custom domain
- [ ] Configure rate limiting
- [ ] Set up backup strategy for MongoDB
- [ ] Review IAM permissions
- [ ] Enable AWS WAF (optional)

## Performance
- Lambda cold start: ~2-3 seconds
- Warm execution: ~100-300ms
- MongoDB connection reuse
- Optimized bundle size

## Contributing
1. Create feature branch
2. Implement feature
3. Add tests
4. Submit pull request

## License
MIT License
