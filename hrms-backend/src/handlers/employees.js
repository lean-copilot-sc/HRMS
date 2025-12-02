const connectDB = require('../config/database');
const Employee = require('../models/Employee');
const User = require('../models/User');
const Department = require('../models/Department');
const { response } = require('../utils/response');

// Get all employees
module.exports.getAll = async (event) => {
  try {
    await connectDB();
    
    const employees = await Employee.find()
      .populate('user_id', 'name email profile_image')
      .populate('department_id', 'name')
      .sort({ createdAt: -1 });

    return response(200, employees);
  } catch (error) {
    console.error('Get employees error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Get employee by ID
module.exports.getById = async (event) => {
  try {
    await connectDB();
    
    const { id } = event.pathParameters;

    const employee = await Employee.findById(id)
      .populate('user_id', 'name email phone profile_image role')
      .populate('department_id', 'name description');

    if (!employee) {
      return response(404, { message: 'Employee not found' });
    }

    return response(200, employee);
  } catch (error) {
    console.error('Get employee error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Create employee
module.exports.create = async (event) => {
  try {
    await connectDB();
    
    const {
      name,
      email,
      password,
      role,
      designation,
      department_id,
      joining_date,
      salary,
      phone,
      employee_type,
      position,
      leaving_date,
      bank_account_no,
      ifsc_code,
    } = JSON.parse(event.body);

    // Create user first
    const user = new User({
      name,
      email,
      password,
      role: role || 'employee',
      phone: phone || null,
    });

    await user.save();

    // Create employee
    const employee = new Employee({
      user_id: user._id,
      designation,
      position: position || designation || null,
      phone: phone || null,
      bank_account_no: bank_account_no || null,
      ifsc_code: ifsc_code || null,
      department_id: department_id || null,
      joining_date,
      salary,
      employee_type: employee_type || 'full-time',
      leaving_date: leaving_date || null,
      status: leaving_date ? 'inactive' : 'active',
    });

    await employee.save();

    const populatedEmployee = await Employee.findById(employee._id)
      .populate('user_id', 'name email role')
      .populate('department_id', 'name');

    return response(201, populatedEmployee);
  } catch (error) {
    console.error('Create employee error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Update employee
module.exports.update = async (event) => {
  try {
    await connectDB();
    
    const { id } = event.pathParameters;
    const updates = JSON.parse(event.body);

    if (Object.prototype.hasOwnProperty.call(updates, 'leaving_date')) {
      if (!updates.leaving_date) {
        updates.leaving_date = null;
        if (!updates.status) {
          updates.status = 'active';
        }
      } else if (!updates.status) {
        updates.status = 'inactive';
      }
    }

    const employee = await Employee.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).populate('user_id', 'name email').populate('department_id', 'name');

    if (!employee) {
      return response(404, { message: 'Employee not found' });
    }

    return response(200, employee);
  } catch (error) {
    console.error('Update employee error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};

// Delete employee
module.exports.remove = async (event) => {
  try {
    await connectDB();
    
    const { id } = event.pathParameters;

    const employee = await Employee.findById(id);
    if (!employee) {
      return response(404, { message: 'Employee not found' });
    }

    // Delete user and employee
    await User.findByIdAndDelete(employee.user_id);
    await Employee.findByIdAndDelete(id);

    return response(200, { message: 'Employee deleted successfully' });
  } catch (error) {
    console.error('Delete employee error:', error);
    return response(500, { message: 'Server error', error: error.message });
  }
};
