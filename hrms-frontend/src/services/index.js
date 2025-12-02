import api from './api';

// Employee Services
export const employeeService = {
  getAll: () => api.get('/employees'),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  uploadPhoto: (id, formData) => api.post(`/employees/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

// Attendance Services
export const attendanceService = {
  getBiometricLogs: (params) => api.get('/attendance/logs', { params }),
  getByEmployee: (employeeId, params) => api.get(`/attendance/${employeeId}`, { params }),
  getReport: (params) => api.get('/attendance/report', { params }),
  manualEntry: (data) => api.post('/attendance/manual', data),
};

// Leave Services
export const leaveService = {
  request: (data) => api.post('/leave/request', data),
  getMyRequests: (employeeId) => api.get('/leave/my-requests', { params: { employeeId } }),
  getPending: () => api.get('/leave/pending'),
  approve: (id) => api.put(`/leave/${id}/approve`),
  reject: (id) => api.put(`/leave/${id}/reject`),
};

// Department Services
export const departmentService = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
};

// Holiday Services
export const holidayService = {
  getAll: () => api.get('/holidays'),
  create: (data) => api.post('/holidays', data),
  update: (id, data) => api.put(`/holidays/${id}`, data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// Dashboard Services
export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentActivity: () => api.get('/dashboard/activity'),
};

export const salarySlipService = {
  getEmployeesMeta: () => api.get('/salary-slips/employees'),
  list: (params) => api.get('/salary-slips', { params }),
  get: (id) => api.get(`/salary-slips/${id}`),
  create: (data) => api.post('/salary-slips', data),
  update: (id, data) => api.put(`/salary-slips/${id}`, data),
  remove: (id) => api.delete(`/salary-slips/${id}`),
  downloadPdf: (id) => api.get(`/salary-slips/${id}/pdf`, { responseType: 'blob' }),
  exportExcel: (params) => api.get('/salary-slips/export', {
    params,
    responseType: 'blob',
  }),
};

export const payrollService = {
  sendSalarySlips: (data) => api.post('/payroll/send-salary-slip', data),
};

export default {
  employee: employeeService,
  attendance: attendanceService,
  leave: leaveService,
  department: departmentService,
  holiday: holidayService,
  dashboard: dashboardService,
  salarySlip: salarySlipService,
  payroll: payrollService,
};
