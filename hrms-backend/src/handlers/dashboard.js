const connectDB = require('../config/database');
const Employee = require('../models/Employee');
const Attendance = require('../models/Attendance');
const Leave = require('../models/Leave');
const Department = require('../models/Department');
const User = require('../models/User');
const { success, error } = require('../utils/response');

// Get Dashboard Statistics
module.exports.getStats = async (event) => {
  try {
    await connectDB();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get counts
    const [
      totalEmployees,
      activeDepartments,
      todayAttendance,
      pendingLeaves
    ] = await Promise.all([
      Employee.countDocuments({ status: 'active' }),
      Department.countDocuments({ isActive: true }),
      Attendance.countDocuments({
        date: { $gte: today, $lt: tomorrow },
        status: 'present'
      }),
      Leave.countDocuments({ status: 'pending' })
    ]);

    // Calculate attendance rate
    const attendanceRate = totalEmployees > 0 
      ? ((todayAttendance / totalEmployees) * 100).toFixed(2)
      : 0;

    // Get employees on leave today
    const employeesOnLeave = await Leave.countDocuments({
      status: 'approved',
      startDate: { $lte: today },
      endDate: { $gte: today }
    });

    const stats = {
      totalEmployees,
      activeDepartments,
      todayAttendance,
      employeesOnLeave,
      attendanceRate: parseFloat(attendanceRate),
      pendingLeaves
    };

    return success(stats);
  } catch (err) {
    console.error('Get dashboard stats error:', err);
    return error(err.message);
  }
};

// Get Dashboard Activity
module.exports.getActivity = async (event) => {
  try {
    await connectDB();

    const { limit = 10 } = event.queryStringParameters || {};

    // Get recent leave requests
    const recentLeaves = await Leave.find()
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .sort({ applied_at: -1 })
      .limit(parseInt(limit));

    // Get today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate({
        path: 'employee_id',
        select: 'user_id department_id designation',
        populate: [
          { path: 'user_id', select: 'name email' },
          { path: 'department_id', select: 'name' }
        ]
      })
      .sort({ clock_in: -1 })
      .limit(parseInt(limit));

    const activity = {
      recentLeaves,
      todayAttendance
    };

    return success(activity);
  } catch (err) {
    console.error('Get dashboard activity error:', err);
    return error(err.message);
  }
};
