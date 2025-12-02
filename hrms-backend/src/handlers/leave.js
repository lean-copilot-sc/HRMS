const connectDB = require('../config/database');
const Leave = require('../models/Leave');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const Settings = require('../models/Settings');
const { success, error } = require('../utils/response');
const { sendLeaveApprovalRequest, sendLeaveApprovedNotification, sendLeaveRejectedNotification } = require('../utils/emailService');
const jwt = require('../utils/jwt');

// Request Leave
module.exports.request = async (event) => {
  try {
    await connectDB();

    const { userId } = event.requestContext.authorizer;
    
    // Find employee by user_id
    const employee = await Employee.findOne({ user_id: userId }).populate('user_id', 'name email');
    if (!employee) {
      return error('Employee record not found', 404);
    }

    const body = JSON.parse(event.body);
    const { leave_type, from_date, to_date, reason } = body;

    // Calculate duration
    const startDate = new Date(from_date);
    const endDate = new Date(to_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    const leave = await Leave.create({
      employee_id: employee._id,
      leave_type,
      from_date: startDate,
      to_date: endDate,
      reason,
      status: 'pending'
    });

    // Get settings for approval emails
    try {
      const settings = await Settings.findOne();
      const approvalEmails = settings?.leaveApprovalEmails && settings.leaveApprovalEmails.length > 0
        ? settings.leaveApprovalEmails
        : ['gaurang5416@gmail.com'];

      // Send approval request emails
      const leaveData = {
        _id: leave._id,
        employeeName: employee.user_id.name,
        employeeId: employee._id?.toString(),
        applicantEmail: employee.user_id.email,
        leaveType: leave_type,
        startDate,
        endDate,
        days,
        reason
      };

      await sendLeaveApprovalRequest(leaveData, approvalEmails);
      console.log('Leave approval emails sent successfully');
    } catch (emailError) {
      console.error('Failed to send approval emails:', emailError);
      // Don't fail the leave request if email fails
    }

    return success(leave, 201);
  } catch (err) {
    console.error('Request leave error:', err);
    return error(err.message);
  }
};

// Get My Leave Requests
module.exports.getMyRequests = async (event) => {
  try {
    await connectDB();

    const { userId } = event.requestContext.authorizer;
    
    // Find employee by user_id
    const employee = await Employee.findOne({ user_id: userId });
    if (!employee) {
      return error('Employee record not found', 404);
    }

    const { status, startDate, endDate } = event.queryStringParameters || {};

    const query = { employee_id: employee._id };

    if (status && status !== 'all') {
      query.status = status;
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        query.to_date = { ...(query.to_date || {}), $gte: start };
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.from_date = { ...(query.from_date || {}), $lte: end };
      }
    }

    const leaves = await Leave.find(query)
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .populate('approved_by', 'name email')
      .sort({ applied_at: -1 });

    return success(leaves);
  } catch (err) {
    console.error('Get my leave requests error:', err);
    return error(err.message);
  }
};

// Get Pending Leaves (Admin/Manager)
module.exports.getPending = async (event) => {
  try {
    await connectDB();

    const { status, startDate, endDate, employeeId } = event.queryStringParameters || {};

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    } else if (status === undefined) {
      query.status = 'pending';
    }

    if (employeeId) {
      query.employee_id = employeeId;
    }

    if (startDate) {
      const start = new Date(startDate);
      if (!Number.isNaN(start.getTime())) {
        query.to_date = { ...(query.to_date || {}), $gte: start };
      }
    }

    if (endDate) {
      const end = new Date(endDate);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        query.from_date = { ...(query.from_date || {}), $lte: end };
      }
    }

    const leaves = await Leave.find(query)
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .populate('approved_by', 'name email')
      .sort({ applied_at: -1 });

    return success(leaves);
  } catch (err) {
    console.error('Get pending leaves error:', err);
    return error(err.message);
  }
};

// Approve Leave
module.exports.approve = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;
    const { userId } = event.requestContext.authorizer;

    const leave = await Leave.findById(id)
      .populate({
        path: 'employee_id',
        select: 'user_id employee_id',
        populate: { path: 'user_id', select: 'name email' }
      });

    if (!leave) {
      return error('Leave request not found', 404);
    }

    if (leave.status !== 'pending') {
      return error('Leave request already processed', 400);
    }

    // Get approver info
    const approver = await User.findById(userId).select('name email role');
    const approverLabel = approver?.name || approver?.email || 'Portal Approver';

    leave.status = 'approved';
    leave.approved_by = userId;
    leave.processed_at = new Date();

    await leave.save();

    // Send approval notification to applicant
    try {
      const days = Math.ceil((leave.to_date - leave.from_date) / (1000 * 60 * 60 * 24)) + 1;
      const leaveData = {
        employeeName: leave.employee_id.user_id.name,
        leaveType: leave.leave_type,
        startDate: leave.from_date,
        endDate: leave.to_date,
        days
      };

      await sendLeaveApprovedNotification(
        leaveData,
        leave.employee_id.user_id.email,
        approverLabel
      );
      console.log('Leave approved notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError);
      // Don't fail the approval if email fails
    }

    return success(leave);
  } catch (err) {
    console.error('Approve leave error:', err);
    return error(err.message);
  }
};

// Reject Leave
module.exports.reject = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;
    const { userId } = event.requestContext.authorizer;
    const body = event.body ? JSON.parse(event.body) : {};
    const rejectionReason = body.reason || '';

    const leave = await Leave.findById(id)
      .populate({
        path: 'employee_id',
        select: 'user_id employee_id',
        populate: { path: 'user_id', select: 'name email' }
      });

    if (!leave) {
      return error('Leave request not found', 404);
    }

    if (leave.status !== 'pending') {
      return error('Leave request already processed', 400);
    }

    // Get approver info
    const approver = await User.findById(userId).select('name email role');
    const approverLabel = approver?.name || approver?.email || 'Portal Approver';

    leave.status = 'rejected';
    leave.approved_by = userId;
    leave.processed_at = new Date();

    await leave.save();

    // Send rejection notification to applicant
    try {
      const days = Math.ceil((leave.to_date - leave.from_date) / (1000 * 60 * 60 * 24)) + 1;
      const leaveData = {
        employeeName: leave.employee_id.user_id.name,
        leaveType: leave.leave_type,
        startDate: leave.from_date,
        endDate: leave.to_date,
        days
      };

      await sendLeaveRejectedNotification(
        leaveData,
        leave.employee_id.user_id.email,
        approverLabel,
        rejectionReason
      );
      console.log('Leave rejected notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send rejection notification:', emailError);
      // Don't fail the rejection if email fails
    }

    return success(leave);
  } catch (err) {
    console.error('Reject leave error:', err);
    return error(err.message);
  }
};

// Approve Leave via Email Token
module.exports.approveViaEmail = async (event) => {
  try {
    await connectDB();

    const { token } = event.queryStringParameters || {};

    if (!token) {
      return error('Approval token is required', 400);
    }

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token);
      if (decoded.type !== 'leave_approval') {
        return error('Invalid approval token', 401);
      }
    } catch (err) {
      return error('Invalid or expired token', 401);
    }

    const { leaveId } = decoded;
    const leave = await Leave.findById(leaveId)
      .populate({
        path: 'employee_id',
        select: 'user_id employee_id',
        populate: { path: 'user_id', select: 'name email' }
      });

    if (!leave) {
      return error('Leave request not found', 404);
    }

    if (leave.status !== 'pending') {
      // Return success with message instead of error for better UX
      return success({ 
        message: `This leave request has already been ${leave.status}`,
        leave 
      });
    }

    leave.status = 'approved';
    leave.processed_at = new Date();
    // Mark as approved via email (no specific approver)
    leave.approved_by = null;

    await leave.save();

    // Send approval notification to applicant
    try {
      const days = Math.ceil((leave.to_date - leave.from_date) / (1000 * 60 * 60 * 24)) + 1;
      const leaveData = {
        employeeName: leave.employee_id.user_id.name,
        leaveType: leave.leave_type,
        startDate: leave.from_date,
        endDate: leave.to_date,
        days
      };

      await sendLeaveApprovedNotification(
        leaveData,
        leave.employee_id.user_id.email,
        'Email Approval Link'
      );
      console.log('Leave approved notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send approval notification:', emailError);
    }

    return success({ 
      message: 'Leave request approved successfully',
      leave 
    });
  } catch (err) {
    console.error('Approve leave via email error:', err);
    return error(err.message);
  }
};

// Reject Leave via Email Token
module.exports.rejectViaEmail = async (event) => {
  try {
    await connectDB();

    const { token, reason } = event.queryStringParameters || {};

    if (!token) {
      return error('Rejection token is required', 400);
    }

    let decoded;
    try {
      decoded = jwt.verify(token);
      if (decoded.type !== 'leave_approval') {
        return error('Invalid rejection token', 401);
      }
    } catch (err) {
      return error('Invalid or expired token', 401);
    }

    const { leaveId } = decoded;
    const leave = await Leave.findById(leaveId)
      .populate({
        path: 'employee_id',
        select: 'user_id employee_id',
        populate: { path: 'user_id', select: 'name email' }
      });

    if (!leave) {
      return error('Leave request not found', 404);
    }

    if (leave.status !== 'pending') {
      return success({
        message: `This leave request has already been ${leave.status}`,
        leave
      });
    }

    leave.status = 'rejected';
    leave.processed_at = new Date();
    leave.approved_by = null;

    await leave.save();

    // Notify applicant about rejection
    try {
      const days = Math.ceil((leave.to_date - leave.from_date) / (1000 * 60 * 60 * 24)) + 1;
      const leaveData = {
        employeeName: leave.employee_id.user_id.name,
        leaveType: leave.leave_type,
        startDate: leave.from_date,
        endDate: leave.to_date,
        days
      };

      await sendLeaveRejectedNotification(
        leaveData,
        leave.employee_id.user_id.email,
        'Email Approval Link',
        reason || 'Rejected via email link'
      );
      console.log('Leave rejection notification sent successfully');
    } catch (emailError) {
      console.error('Failed to send rejection notification:', emailError);
    }

    return success({
      message: 'Leave request rejected successfully',
      leave
    });
  } catch (err) {
    console.error('Reject leave via email error:', err);
    return error(err.message);
  }
};
