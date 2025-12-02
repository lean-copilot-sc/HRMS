const nodemailer = require('nodemailer');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');
const { response } = require('./response');
const jwt = require('./jwt');

const smtpConfig = {
  host: process.env.AWS_EMAIL_HOST,
  port: Number(process.env.AWS_EMAIL_PORT || 465),
  secure: String(process.env.AWS_EMAIL_PORT || '465') === '465',
  auth: {
    user: process.env.AWS_SES_USER,
    pass: process.env.AWS_SES_PASS
  },
  connectionTimeout: Number(process.env.EMAIL_CONNECTION_TIMEOUT || 10000),
  greetingTimeout: Number(process.env.EMAIL_GREETING_TIMEOUT || 10000)
};

const transporter = nodemailer.createTransport(smtpConfig);

const lambdaClient = new LambdaClient({
  region: process.env.REGION || process.env.AWS_REGION || 'us-east-1'
});

const normalizeAddresses = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return String(value)
    .split(',')
    .map((addr) => addr.trim())
    .filter(Boolean);
};

const sendEmail = async (emailOptions = {}) => {
  const toAddresses = normalizeAddresses(emailOptions.to);
  if (toAddresses.length === 0) {
    throw new Error('No email recipients provided');
  }

  const mailOptions = {
    from: `HRMS <${process.env.AWS_EMAIL || 'noreply@hrms.com'}>`,
    to: toAddresses,
    subject: emailOptions.subject,
    text: emailOptions.text || '',
    html: emailOptions.html,
    cc: normalizeAddresses(emailOptions.cc),
    bcc: normalizeAddresses(emailOptions.bcc),
    replyTo: emailOptions.replyTo || emailOptions.reply_to || process.env.REPLY_EMAIL || undefined,
    attachments: Array.isArray(emailOptions.attachments) ? emailOptions.attachments : []
  };

  // console.log('Prepared mail options:', {
  //   ...mailOptions,
  //   attachments: mailOptions.attachments?.length || 0
  // });

  const info = await transporter.sendMail(mailOptions);
  if (info?.messageId) {
    console.log('Message sent: %s', info.messageId);
  }
  return info;
};

// Helper function to determine email recipients with optional redirection for testing
const getEmailRecipients = (originalRecipients = []) => {
  const redirectAddress = process.env.EMAIL_REDIRECT_TO;
  if (redirectAddress) {
    return [redirectAddress.trim()].filter(Boolean);
  }

  const recipients = Array.isArray(originalRecipients)
    ? originalRecipients.filter(Boolean)
    : [];

  if (recipients.length === 0) {
    const fallback = process.env.DEFAULT_APPROVER_EMAIL || process.env.AWS_EMAIL;
    return fallback ? [fallback] : [];
  }

  return Array.from(new Set(recipients));
};

// Generate approval token for email links
const generateApprovalToken = (leaveId) => {
  return jwt.sign({ leaveId, type: 'leave_approval' }, { expiresIn: '7d' });
};

// Email template for leave approval request
const getLeaveApprovalEmailHtml = (leaveData, approvalToken) => {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
  const approvalUrl = `${baseUrl}/leave/approve?token=${approvalToken}`;
  const rejectUrl = `${baseUrl}/leave/approve?token=${approvalToken}&action=reject&reason=${encodeURIComponent('Rejected via email link')}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #1976d2;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .details {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
        }
        .detail-value {
          flex: 1;
        }
        .button {
          display: inline-block;
          padding: 12px 30px;
          background-color: #4caf50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          text-align: center;
        }
        .button:hover {
          background-color: #45a049;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Leave Approval Request</h1>
        </div>
        <div class="content">
          <p>Hello,</p>
          <p>A new leave request has been submitted and requires your approval.</p>
          
          <div class="details">
            <div class="detail-row">
              <div class="detail-label">Employee:</div>
              <div class="detail-value">${leaveData.employeeName}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Employee ID:</div>
              <div class="detail-value">${leaveData.employeeId || 'N/A'}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Leave Type:</div>
              <div class="detail-value">${leaveData.leaveType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Start Date:</div>
              <div class="detail-value">${new Date(leaveData.startDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">End Date:</div>
              <div class="detail-value">${new Date(leaveData.endDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Duration:</div>
              <div class="detail-value">${leaveData.days} day(s)</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Reason:</div>
              <div class="detail-value">${leaveData.reason}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${approvalUrl}" class="button" style="margin-right: 10px;">Approve</a>
            <a href="${rejectUrl}" class="button" style="background-color: #f44336;">Reject</a>
          </div>
          
          <p style="margin-top: 30px; font-size: 14px; color: #666;">
            You can also approve this leave request by logging into the HRMS portal.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email template for leave approval confirmation (to applicant)
const getLeaveApprovedEmailHtml = (leaveData, approverName) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #4caf50;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .details {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
        }
        .detail-value {
          flex: 1;
        }
        .success-badge {
          background-color: #4caf50;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          display: inline-block;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Leave Request Approved</h1>
        </div>
        <div class="content">
          <p>Hello ${leaveData.employeeName},</p>
          <p>Great news! Your leave request has been approved.</p>
          
          <div style="text-align: center;">
            <span class="success-badge">✓ APPROVED</span>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <div class="detail-label">Leave Type:</div>
              <div class="detail-value">${leaveData.leaveType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Start Date:</div>
              <div class="detail-value">${new Date(leaveData.startDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">End Date:</div>
              <div class="detail-value">${new Date(leaveData.endDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Duration:</div>
              <div class="detail-value">${leaveData.days} day(s)</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Approved By:</div>
              <div class="detail-value">${approverName}</div>
            </div>
          </div>
          
          <p>Please ensure all your pending work is completed before your leave begins.</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Email template for leave rejection (to applicant)
const getLeaveRejectedEmailHtml = (leaveData, approverName, rejectionReason) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f9f9f9;
        }
        .header {
          background-color: #f44336;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          background-color: white;
          padding: 30px;
          border-radius: 5px;
          margin-top: 20px;
        }
        .details {
          background-color: #f5f5f5;
          padding: 15px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          padding: 8px 0;
          border-bottom: 1px solid #e0e0e0;
        }
        .detail-label {
          font-weight: bold;
          width: 150px;
        }
        .detail-value {
          flex: 1;
        }
        .rejected-badge {
          background-color: #f44336;
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          display: inline-block;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          margin-top: 20px;
          color: #666;
          font-size: 12px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Leave Request Update</h1>
        </div>
        <div class="content">
          <p>Hello ${leaveData.employeeName},</p>
          <p>We regret to inform you that your leave request has been declined.</p>
          
          <div style="text-align: center;">
            <span class="rejected-badge">✗ REJECTED</span>
          </div>
          
          <div class="details">
            <div class="detail-row">
              <div class="detail-label">Leave Type:</div>
              <div class="detail-value">${leaveData.leaveType}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Start Date:</div>
              <div class="detail-value">${new Date(leaveData.startDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">End Date:</div>
              <div class="detail-value">${new Date(leaveData.endDate).toLocaleDateString()}</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Duration:</div>
              <div class="detail-value">${leaveData.days} day(s)</div>
            </div>
            <div class="detail-row">
              <div class="detail-label">Rejected By:</div>
              <div class="detail-value">${approverName}</div>
            </div>
            ${rejectionReason ? `
            <div class="detail-row">
              <div class="detail-label">Reason:</div>
              <div class="detail-value">${rejectionReason}</div>
            </div>
            ` : ''}
          </div>
          
          <p>If you have any questions about this decision, please contact your manager or HR department.</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply.</p>
          <p>&copy; ${new Date().getFullYear()} HRMS. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send leave approval request email to approvers
const sendLeaveApprovalRequest = async (leaveData, recipientEmails) => {
  try {
    const approvalToken = generateApprovalToken(leaveData._id || leaveData.id);
    
    // Override recipients in non-production
    const finalRecipients = getEmailRecipients(recipientEmails);
    if (finalRecipients.length === 0) {
      throw new Error('No valid recipients configured for leave approval emails');
    }
    
    console.log('Sending leave approval email to:', finalRecipients);
    const info = await sendEmail({
      to: finalRecipients,
      subject: `Leave Approval Required - ${leaveData.employeeName}`,
      html: getLeaveApprovalEmailHtml(leaveData, approvalToken),
      replyTo: leaveData.applicantEmail || process.env.REPLY_EMAIL || process.env.AWS_EMAIL
    });
    const messageId = info?.messageId || info?.MessageId || null;
    return { success: true, token: approvalToken, messageId };
  } catch (error) {
    console.error('Error sending leave approval email:', error);
    throw error;
  }
};

// Send leave approved notification to applicant
const sendLeaveApprovedNotification = async (leaveData, applicantEmail, approverName) => {
  try {
    // Override recipient in non-production
    const finalRecipient = getEmailRecipients([applicantEmail])[0];
    
    console.log('Sending leave approved email to:', finalRecipient);
    await sendEmail({
      to: finalRecipient,
      subject: `Leave Request Approved - ${leaveData.leaveType}`,
      html: getLeaveApprovedEmailHtml(leaveData, approverName),
      replyTo: process.env.REPLY_EMAIL || process.env.AWS_EMAIL
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending leave approved email:', error);
    throw error;
  }
};

// Send leave rejected notification to applicant
const sendLeaveRejectedNotification = async (leaveData, applicantEmail, approverName, rejectionReason) => {
  try {
    // Override recipient in non-production
    const finalRecipient = getEmailRecipients([applicantEmail])[0];
    
    console.log('Sending leave rejected email to:', finalRecipient);
    await sendEmail({
      to: finalRecipient,
      subject: `Leave Request Update - ${leaveData.leaveType}`,
      html: getLeaveRejectedEmailHtml(leaveData, approverName, rejectionReason),
      replyTo: process.env.REPLY_EMAIL || process.env.AWS_EMAIL
    });
    return { success: true };
  } catch (error) {
    console.error('Error sending leave rejected email:', error);
    throw error;
  }
};

const parseEventBody = (event) => {
  if (!event) return {};
  if (event.body == null) return event;

  if (typeof event.body === 'string') {
    try {
      return JSON.parse(event.body);
    } catch (err) {
      console.error('Failed to parse email event body:', err);
      return {};
    }
  }

  return event.body || {};
};

const isProductionStage = () => {
  const stage = (process.env.STAGE || process.env.NODE_ENV || '').toLowerCase();
  return stage === 'prod' || stage === 'production';
};

const NON_PROD_DEFAULT_RECIPIENTS = [
  'Avani.Desai@scalecapacity.com',
  'Gaurang.Dudhwala@scalecapacity.com',
  'arpit.naik@scalecapacity.com'
];

const commonSendEmail = async (event) => {
  const payload = parseEventBody(event);
  console.log('commonSendEmail payload:', payload);

  const overridesNeeded = !isProductionStage();
  const to = overridesNeeded ? NON_PROD_DEFAULT_RECIPIENTS : payload.to;
  const cc = overridesNeeded ? [] : payload.cc;
  const bcc = overridesNeeded ? [] : payload.bcc;

  try {
    const info = await sendEmail({
      to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text || '',
      cc,
      bcc,
      replyTo: payload.replyTo || process.env.REPLY_EMAIL,
      attachments: payload.attachments || []
    });

    return response(200, {
      success: true,
      message: 'Mail sent successfully.',
      statusCode: 200,
      messageId: info?.messageId || info?.MessageId || null
    });
  } catch (err) {
    console.error('Common email send error:', err);
    return response(500, {
      success: false,
      message: 'Error sending email',
      error: err.message || err
    });
  }
};

const triggerEmail = async (options = {}) => {
  const stage = process.env.STAGE || 'dev';
  const functionName = `new-mcc-order-${stage}-commonSendEmail`;

  const payload = {
    body: {
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text || '',
      cc: options.cc || [],
      replyTo: options.replyTo || process.env.REPLY_EMAIL,
      attachments: options.attachments || []
    }
  };

  const command = new InvokeCommand({
    FunctionName: functionName,
    InvocationType: 'RequestResponse',
    LogType: 'Tail',
    Payload: Buffer.from(JSON.stringify(payload))
  });

  try {
    const result = await lambdaClient.send(command);
    return result;
  } catch (err) {
    console.error('Error occurred while invoking email lambda:', err);
    throw err;
  }
};

module.exports = {
  sendLeaveApprovalRequest,
  sendLeaveApprovedNotification,
  sendLeaveRejectedNotification,
  generateApprovalToken,
  commonSendEmail,
  sendEmail,
  triggerEmail
};
