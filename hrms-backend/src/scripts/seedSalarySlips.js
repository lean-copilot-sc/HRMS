require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const SalarySlip = require('../models/SalarySlip');
const Employee = require('../models/Employee');
const User = require('../models/User');

const SAMPLE_EMPLOYEES = [
  {
    name: 'Anita Desai',
    email: 'anita.desai@example.com',
    designation: 'Senior Developer',
    department: 'Engineering',
    phone: '9000000001',
    bank_account_no: '123456789012',
    ifsc_code: 'SBIN0001001',
  },
  {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    designation: 'HR Manager',
    department: 'Human Resources',
    phone: '9000000002',
    bank_account_no: '987654321098',
    ifsc_code: 'HDFC0002002',
  },
  {
    name: 'Priya Nair',
    email: 'priya.nair@example.com',
    designation: 'Finance Analyst',
    department: 'Finance',
    phone: '9000000003',
    bank_account_no: '456789123456',
    ifsc_code: 'ICIC0003003',
  },
];

const buildSalarySlipPayload = (employee, monthIndex) => {
  const base = 50000 + monthIndex * 5000;
  const hra = base * 0.4;
  const allowances = base * 0.2;
  const overtime = 2500 * monthIndex;
  const professional_tax = 200;
  const pf_contribution = base * 0.12;
  const esi = 0;
  const tds = base * 0.05;

  const gross_salary = base + hra + allowances + overtime;
  const total_deductions = professional_tax + pf_contribution + esi + tds;
  const net_salary = gross_salary - total_deductions;

  return {
    employee_id: employee._id,
    employee_name: employee.user_id?.name || 'Employee',
    designation: employee.designation || employee.position || 'Employee',
    department: employee.department_id?.name || employee.department_fallback || 'General',
    month: `2025-0${monthIndex + 1}`,
    basic_salary: base,
    hra,
    allowances,
    overtime_amount: overtime,
    gross_salary,
    professional_tax,
    pf_contribution,
    esi,
    tds,
    total_deductions,
    net_salary,
    bank_account_no: employee.bank_account_no || '0000000000',
    ifsc_code: employee.ifsc_code || 'IFSC0000',
  };
};

async function ensureEmployees() {
  const existing = await Employee.find().limit(3).populate('user_id');
  if (existing.length >= 3) {
    return existing;
  }

  const created = [];
  for (const sample of SAMPLE_EMPLOYEES) {
    const user = new User({
      name: sample.name,
      email: sample.email,
      password: 'Password@123',
      role: 'employee',
      phone: sample.phone,
    });
    await user.save();

    const employee = new Employee({
      user_id: user._id,
      designation: sample.designation,
      position: sample.designation,
      department_id: null,
      joining_date: new Date('2024-01-01'),
      salary: 60000,
      employee_type: 'full-time',
      bank_account_no: sample.bank_account_no,
      ifsc_code: sample.ifsc_code,
    });

    await employee.save();
    const hydrated = await Employee.findById(employee._id).populate('user_id');
    hydrated.department_fallback = sample.department;
    created.push(hydrated);
  }

  return created;
}

async function seed() {
  try {
    await connectDB();

    const employees = await ensureEmployees();

    const operations = employees.slice(0, 3).map((employee, index) => {
      const payload = buildSalarySlipPayload(employee, index % 3);
      return SalarySlip.findOneAndUpdate(
        { employee_id: payload.employee_id, month: payload.month },
        payload,
        { upsert: true, new: true }
      );
    });

    await Promise.all(operations);
    console.log('Seeded salary_slips collection with sample data.');
  } catch (err) {
    console.error('Failed to seed salary slips:', err);
    process.exitCode = 1;
  } finally {
    await mongoose.connection.close();
    process.exit();
  }
}

seed();
