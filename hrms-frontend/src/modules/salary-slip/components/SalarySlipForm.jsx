import { useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';

const validationSchema = Yup.object({
  employee_id: Yup.string().required('Employee is required'),
  month: Yup.string()
    .matches(/^\d{4}-(0[1-9]|1[0-2])$/, 'Select a valid month')
    .required('Month is required'),
  basic_salary: Yup.number().min(0).required('Basic salary is required'),
  hra: Yup.number().min(0).required('HRA is required'),
  allowances: Yup.number().min(0).required('Allowances are required'),
  overtime_amount: Yup.number().min(0).required('Overtime is required'),
  professional_tax: Yup.number().min(0).required('Professional tax is required'),
  pf_contribution: Yup.number().min(0).required('PF contribution is required'),
  esi: Yup.number().min(0).required('ESI is required'),
  tds: Yup.number().min(0).required('TDS is required'),
  bank_account_no: Yup.string().min(6, 'Enter a valid account number').required('Bank account is required'),
  ifsc_code: Yup.string().min(4, 'Enter a valid IFSC code').required('IFSC is required'),
});

const numberOrZero = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

function SalarySlipForm({
  initialValues,
  employees,
  onSubmit,
  onCancel,
  submitLabel = 'Create Salary Slip',
  loading = false,
}) {
  const formik = useFormik({
    initialValues,
    enableReinitialize: true,
    validationSchema,
    onSubmit: async (values, helpers) => {
      const payload = buildPayload(values);
      try {
        await onSubmit(payload);
      } finally {
        helpers.setSubmitting(false);
      }
    },
  });

  const selectedEmployee = useMemo(
    () => employees.find((emp) => emp.id === formik.values.employee_id) || null,
    [employees, formik.values.employee_id],
  );

  const summary = useMemo(() => {
    const gross_salary =
      numberOrZero(formik.values.basic_salary) +
      numberOrZero(formik.values.hra) +
      numberOrZero(formik.values.allowances) +
      numberOrZero(formik.values.overtime_amount);

    const total_deductions =
      numberOrZero(formik.values.professional_tax) +
      numberOrZero(formik.values.pf_contribution) +
      numberOrZero(formik.values.esi) +
      numberOrZero(formik.values.tds);

    const net_salary = gross_salary - total_deductions;

    return {
      gross_salary,
      total_deductions,
      net_salary,
    };
  }, [formik.values]);

  useEffect(() => {
    if (!selectedEmployee) {
      return;
    }

    const updates = {
      employee_name: selectedEmployee.name || '',
      designation: selectedEmployee.designation || '',
      department: selectedEmployee.department || '',
      bank_account_no: selectedEmployee.bank_account_no || formik.values.bank_account_no,
      ifsc_code: selectedEmployee.ifsc_code || formik.values.ifsc_code,
    };

    Object.entries(updates).forEach(([field, value]) => {
      if (value && formik.values[field] !== value) {
        formik.setFieldValue(field, value, false);
      }
    });
  }, [selectedEmployee]);

  return (
    <form onSubmit={formik.handleSubmit} noValidate>
      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Employee & Period
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                id="employee_id"
                name="employee_id"
                label="Employee"
                value={formik.values.employee_id}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.employee_id && Boolean(formik.errors.employee_id)}
                helperText={formik.touched.employee_id && formik.errors.employee_id}
              >
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.name} — {employee.designation}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                id="month"
                name="month"
                label="Salary Month"
                type="month"
                InputLabelProps={{ shrink: true }}
                value={formik.values.month}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.month && Boolean(formik.errors.month)}
                helperText={formik.touched.month && formik.errors.month}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="employee_name"
                name="employee_name"
                label="Employee Name"
                value={formik.values.employee_name}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="designation"
                name="designation"
                label="Designation"
                value={formik.values.designation}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.designation && Boolean(formik.errors.designation)}
                helperText={formik.touched.designation && formik.errors.designation}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="department"
                name="department"
                label="Department"
                value={formik.values.department}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.department && Boolean(formik.errors.department)}
                helperText={formik.touched.department && formik.errors.department}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Earnings
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="basic_salary"
                name="basic_salary"
                label="Basic Salary"
                type="number"
                value={formik.values.basic_salary}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.basic_salary && Boolean(formik.errors.basic_salary)}
                helperText={formik.touched.basic_salary && formik.errors.basic_salary}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="hra"
                name="hra"
                label="HRA"
                type="number"
                value={formik.values.hra}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.hra && Boolean(formik.errors.hra)}
                helperText={formik.touched.hra && formik.errors.hra}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="allowances"
                name="allowances"
                label="Allowances"
                type="number"
                value={formik.values.allowances}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.allowances && Boolean(formik.errors.allowances)}
                helperText={formik.touched.allowances && formik.errors.allowances}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="overtime_amount"
                name="overtime_amount"
                label="Overtime Amount"
                type="number"
                value={formik.values.overtime_amount}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.overtime_amount && Boolean(formik.errors.overtime_amount)}
                helperText={formik.touched.overtime_amount && formik.errors.overtime_amount}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Deductions
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="professional_tax"
                name="professional_tax"
                label="Professional Tax"
                type="number"
                value={formik.values.professional_tax}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.professional_tax && Boolean(formik.errors.professional_tax)}
                helperText={formik.touched.professional_tax && formik.errors.professional_tax}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="pf_contribution"
                name="pf_contribution"
                label="PF Contribution"
                type="number"
                value={formik.values.pf_contribution}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.pf_contribution && Boolean(formik.errors.pf_contribution)}
                helperText={formik.touched.pf_contribution && formik.errors.pf_contribution}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="esi"
                name="esi"
                label="ESI"
                type="number"
                value={formik.values.esi}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.esi && Boolean(formik.errors.esi)}
                helperText={formik.touched.esi && formik.errors.esi}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                id="tds"
                name="tds"
                label="TDS"
                type="number"
                value={formik.values.tds}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.tds && Boolean(formik.errors.tds)}
                helperText={formik.touched.tds && formik.errors.tds}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card elevation={2} sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Bank & Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="bank_account_no"
                name="bank_account_no"
                label="Bank Account Number"
                value={formik.values.bank_account_no}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.bank_account_no && Boolean(formik.errors.bank_account_no)}
                helperText={formik.touched.bank_account_no && formik.errors.bank_account_no}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                id="ifsc_code"
                name="ifsc_code"
                label="IFSC Code"
                value={formik.values.ifsc_code}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.ifsc_code && Boolean(formik.errors.ifsc_code)}
                helperText={formik.touched.ifsc_code && formik.errors.ifsc_code}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Gross Salary"
                value={`₹${summary.gross_salary.toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Total Deductions"
                value={`₹${summary.total_deductions.toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Net Salary"
                value={`₹${summary.net_salary.toFixed(2)}`}
                InputProps={{ readOnly: true }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button variant="outlined" color="inherit" onClick={onCancel} disabled={formik.isSubmitting || loading}>
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={formik.isSubmitting || loading}
          startIcon={formik.isSubmitting || loading ? <CircularProgress size={18} /> : null}
        >
          {submitLabel}
        </Button>
      </Box>
    </form>
  );
}

const buildPayload = (values) => ({
  employee_id: values.employee_id,
  employee_name: values.employee_name,
  designation: values.designation,
  department: values.department,
  month: values.month,
  basic_salary: numberOrZero(values.basic_salary),
  hra: numberOrZero(values.hra),
  allowances: numberOrZero(values.allowances),
  overtime_amount: numberOrZero(values.overtime_amount),
  professional_tax: numberOrZero(values.professional_tax),
  pf_contribution: numberOrZero(values.pf_contribution),
  esi: numberOrZero(values.esi),
  tds: numberOrZero(values.tds),
  bank_account_no: values.bank_account_no,
  ifsc_code: values.ifsc_code,
});

SalarySlipForm.propTypes = {
  initialValues: PropTypes.object.isRequired,
  employees: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired,
      designation: PropTypes.string,
      department: PropTypes.string,
      bank_account_no: PropTypes.string,
      ifsc_code: PropTypes.string,
      code: PropTypes.string,
      email: PropTypes.string,
    }),
  ).isRequired,
  onSubmit: PropTypes.func.isRequired,
  onCancel: PropTypes.func,
  submitLabel: PropTypes.string,
  loading: PropTypes.bool,
};

export default SalarySlipForm;
