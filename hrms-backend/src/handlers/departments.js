const connectDB = require('../config/database');
const Department = require('../models/Department');
const Employee = require('../models/Employee');
const { success, error } = require('../utils/response');

// Get All Departments
module.exports.getAll = async (event) => {
  try {
    await connectDB();

    const departments = await Department.find()
      .sort({ name: 1 });

    return success(departments);
  } catch (err) {
    console.error('Get departments error:', err);
    return error(err.message);
  }
};

// Create Department
module.exports.create = async (event) => {
  try {
    await connectDB();

    const body = JSON.parse(event.body);
    const { name, code, description, manager } = body;

    // Check if department code already exists
    const existingDept = await Department.findOne({ code });
    if (existingDept) {
      return error('Department code already exists', 400);
    }

    const department = await Department.create({
      name,
      code,
      description,
      manager
    });

    return success(department, 201);
  } catch (err) {
    console.error('Create department error:', err);
    return error(err.message);
  }
};

// Update Department
module.exports.update = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;
    const body = JSON.parse(event.body);

    const department = await Department.findByIdAndUpdate(
      id,
      { ...body },
      { new: true, runValidators: true }
    );

    if (!department) {
      return error('Department not found', 404);
    }

    return success(department);
  } catch (err) {
    console.error('Update department error:', err);
    return error(err.message);
  }
};

// Delete Department (Soft delete)
module.exports.remove = async (event) => {
  try {
    await connectDB();

    const { id } = event.pathParameters;

    const department = await Department.findByIdAndUpdate(
      id,
      { isActive: false, updatedAt: new Date() },
      { new: true }
    );

    if (!department) {
      return error('Department not found', 404);
    }

    return success({ message: 'Department deleted successfully' });
  } catch (err) {
    console.error('Delete department error:', err);
    return error(err.message);
  }
};
