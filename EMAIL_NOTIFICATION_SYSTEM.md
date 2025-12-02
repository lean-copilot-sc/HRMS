PROJECT REQUIREMENTS — BUILD FINGERPRINT-BASED ATTENDANCE (WEBAUTHN) END-TO-END

I want you to build a full WebAuthn-based fingerprint/biometric attendance system, integrated into my HRMS.

You must implement frontend + backend + database using:

Frontend: React + Material UI

Backend: Node.js AWS Lambda (serverless framework)

Database: MongoDB (Atlas)

Libraries:

@simplewebauthn/server (backend)

@simplewebauthn/browser (frontend)

mongoose for MongoDB

axios in frontend

Authentication: JWT (existing login system)

Attendance: Stored in MongoDB

Fingerprint: Use WebAuthn platform authenticators (fingerprint, Windows Hello, Touch ID, Face ID)

No real fingerprint image is stored. Only public-key credentials.

Your task is to build everything needed.

1. Database Work (MongoDB/Mongoose)

Create/update:

1.1 User Model

Add fields:

webauthnCredentials: [
  {
    credentialID: Buffer,
    credentialPublicKey: Buffer,
    counter: Number,
    transports: [String],
    createdAt: Date
  }
],
currentChallenge: String

1.2 Attendance Model

Create model:

{
  userId: ObjectId,
  action: "checkin" | "checkout",
  timestamp: Date
}


Add helper:

async function saveAttendanceRecord(userId, action)

2. Backend — AWS Lambda Functions (Serverless)

Create 4 Lambda handlers:

2.1 POST /webauthn/register/options

Input: { userId }

Generate registration options via generateRegistrationOptions

Save user.currentChallenge

Return options

2.2 POST /webauthn/register/complete

Input: { userId, attestationResponse }

Verify with verifyRegistrationResponse

Save credential to user.webauthnCredentials

Clear currentChallenge

2.3 POST /webauthn/auth/options

Input: { userId }

Generate assertion options via generateAuthenticationOptions

Save challenge

2.4 POST /webauthn/auth/complete

Input: { userId, assertionResponse, action }

Verify using verifyAuthenticationResponse

Update credential counter

If action = "checkin" or "checkout", call saveAttendanceRecord

3. Backend Helpers
3.1 libs/db.js

Reusable MongoDB connection using mongoose.

3.2 libs/webauthn.js

Contains:

RP values:

const rpID = "gov.mastercastingandcad.com";
const origin = "https://gov.mastercastingandcad.com";


Registration options generator

Registration verify

Authentication options

Authentication verify

All using @simplewebauthn/server.

4. Serverless Configuration

In serverless.yml, create API endpoints:

POST webauthn/register/options
POST webauthn/register/complete
POST webauthn/auth/options
POST webauthn/auth/complete


Set env variable MONGO_URI.

5. Frontend — React Components

Create 3 components using @simplewebauthn/browser:

5.1 Registration Component

Button:

➡ Registers device for WebAuthn (fingerprint, Face ID, Touch ID)

Flow:

Call /webauthn/register/options

startRegistration(options)

POST /webauthn/register/complete

5.2 Authentication Component (Check-in / Check-out)

Button:

➡ Performs fingerprint auth & records attendance

Flow:

Call /webauthn/auth/options

startAuthentication(options)

POST /webauthn/auth/complete with action = "checkin" or "checkout"

Show toast on success.

5.3 Attendance Page (UI)

For logged-in user:

Show list of check-in/out for selected date (Material UI table)

Auto-refresh after successful check-in/out

6. UI/UX Requirements
Apply these for entire app:

All tables use Material UI <Table />

Full-width layout for all pages

No border-radius on page header (match sidebar header style)

Buttons:

"Register Fingerprint"

"Check In"

"Check Out"

Mobile:

Add Check In / Check Out buttons in sidebar drawer

7. Important WebAuthn Rules

Ensure:

origin must match production exact domain

rpID must match base domain

Challenges must be stored and verified

Convert credentialID from base64url → Buffer when comparing in DB

Use HTTPS in production

Use "localhost" origin & rpID during local dev

8. Final Deliverables Required from Copilot Agent

You must generate the following complete code files:

✅ Backend

/handlers/registerOptions.js

/handlers/registerComplete.js

/handlers/authOptions.js

/handlers/authComplete.js

/libs/webauthn.js

/libs/db.js

/models/User.js

/models/Attendance.js

/helpers/saveAttendanceRecord.js

Required serverless.yml sections

✅ Frontend (React)

WebAuthnRegister.jsx

WebAuthnAuthenticate.jsx (checkin/checkout)

Attendance page with:

date filter

table

auto refresh on successful auth

Full Material UI table styling applied throughout

✅ Other

Utility functions for base64url <-> Buffer conversions

Complete error handling

Example API calls using Axios

9. Additional Instructions

Make code production-ready

Use async/await everywhere

Use consistent naming conventions

Format cleanly (ESLint recommended)

Add comments explaining key logic

Do not implement passwords or JWT; assume userId is already known