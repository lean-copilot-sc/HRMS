# HRMS Frontend - React Application

## Overview
Human Resource Management System frontend built with React.js, Material UI, and modern web technologies.

## Tech Stack
- **React** 18.2.0
- **Material UI** 5.15+
- **React Router** 6.22+
- **Axios** for API calls
- **Yup** for form validation
- **Recharts** for data visualization
- **React CSV** for data exports

## Project Structure
```
src/
├── components/         # Reusable components
│   ├── common/        # Common UI components
│   ├── forms/         # Form components
│   ├── tables/        # Table components
│   └── modals/        # Modal dialogs
├── pages/             # Page components
│   ├── Login.js
│   ├── Dashboard.js
│   ├── Employees.js
│   ├── Attendance.js
│   ├── Leave.js
│   ├── Departments.js
│   ├── Holidays.js
│   ├── Profile.js
│   └── Settings.js
├── layouts/           # Layout components
│   └── MainLayout.js  # Sidebar + TopBar
├── context/           # React Context
│   └── AuthContext.js # Authentication state
├── services/          # API services
│   ├── api.js        # Axios instance
│   └── index.js      # Service methods
├── utils/             # Utilities
│   ├── validators.js
│   ├── helpers.js
│   └── constants.js
├── theme/             # MUI theme
│   └── index.js
├── App.js            # Main App component
└── index.js          # Entry point
```

## Features
- ✅ Role-based authentication (Admin, HR, Employee)
- ✅ Employee management (CRUD)
- ✅ Attendance tracking (clock-in/out, reports)
- ✅ Leave management (apply, approve/reject)
- ✅ Department management
- ✅ Holiday calendar
- ✅ Dashboard with analytics
- ✅ Reports and exports (CSV/Excel)
- ✅ Responsive Material UI design
- ✅ Profile photo upload
- ✅ Form validation

## Installation

### Prerequisites
- Node.js 16+ and npm

### Setup
```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your backend API URL
REACT_APP_API_URL=http://localhost:3001/api

# Start development server
npm start
```

The app will open at `http://localhost:3000`

## Environment Variables
```
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_AWS_S3_BUCKET=hrms-uploads
REACT_APP_AWS_REGION=us-east-1
```

## Available Scripts

### `npm start`
Runs the app in development mode at http://localhost:3000

### `npm run build`
Builds the app for production to the `build` folder

### `npm test`
Launches the test runner

### `npm run eject`
Ejects from Create React App (one-way operation)

## Authentication Flow
1. User logs in with email/password
2. Backend returns JWT token
3. Token stored in localStorage
4. Token sent with every API request via Axios interceptor
5. Unauthorized requests redirect to login

## Role-Based Access Control
- **Admin**: Full access to all modules
- **HR**: Access to employees, attendance, leave approval, departments
- **Employee**: Access to own attendance, leave requests, profile

## API Integration
All API calls go through `src/services/api.js`:
```javascript
import api from './services/api';

// Example: Get all employees
const response = await api.get('/employees');
```

## Components

### Reusable Components
- **DataTable**: Sortable, filterable table with pagination
- **FormDialog**: Modal dialog for forms
- **FileUpload**: File upload with preview
- **DateRangePicker**: Date range selection
- **StatsCard**: Dashboard statistics card
- **Chart**: Chart components using Recharts

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to AWS Amplify
```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Publish
amplify publish
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

### Deploy to Netlify
```bash
# Build
npm run build

# Deploy build folder to Netlify
```

## Testing
```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage
```

## Troubleshooting

### CORS Issues
Ensure backend has proper CORS configuration:
```javascript
headers: {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Credentials': true,
}
```

### Token Expiration
Tokens expire after 7 days. Implement refresh token logic if needed.

### API Connection
Check `.env` file has correct `REACT_APP_API_URL`

## Contributing
1. Create feature branch
2. Make changes
3. Test thoroughly
4. Submit pull request

## License
MIT License
