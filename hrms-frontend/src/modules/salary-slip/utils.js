import dayjs from 'dayjs';

export const makeEmptySalarySlipFormValues = () => ({
  employee_id: '',
  employee_name: '',
  designation: '',
  department: '',
  month: dayjs().format('YYYY-MM'),
  basic_salary: '',
  hra: '0',
  allowances: '0',
  overtime_amount: '0',
  professional_tax: '0',
  pf_contribution: '0',
  esi: '0',
  tds: '0',
  bank_account_no: '',
  ifsc_code: '',
});

export const mapSalarySlipToFormValues = (salarySlip) => ({
  employee_id: salarySlip.employee_id || salarySlip.employee?.id || '',
  employee_name: salarySlip.employee_name || '',
  designation: salarySlip.designation || '',
  department: salarySlip.department || '',
  month: salarySlip.month || dayjs().format('YYYY-MM'),
  basic_salary: toStringValue(salarySlip.basic_salary),
  hra: toStringValue(salarySlip.hra),
  allowances: toStringValue(salarySlip.allowances),
  overtime_amount: toStringValue(salarySlip.overtime_amount),
  professional_tax: toStringValue(salarySlip.professional_tax),
  pf_contribution: toStringValue(salarySlip.pf_contribution),
  esi: toStringValue(salarySlip.esi),
  tds: toStringValue(salarySlip.tds),
  bank_account_no: salarySlip.bank_account_no || '',
  ifsc_code: salarySlip.ifsc_code || '',
});

const toStringValue = (value) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '0';
  }
  return value.toString();
};
