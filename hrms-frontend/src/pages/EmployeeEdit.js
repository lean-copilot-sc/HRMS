import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Paper, 
  TextField, 
  Button, 
  Grid, 
  MenuItem,
  CircularProgress,
  Box
} from '@mui/material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';

const validationSchema = Yup.object({
  firstName: Yup.string()
    .min(2, 'First name must be at least 2 characters')
    .required('First name is required'),
  lastName: Yup.string()
    .min(2, 'Last name must be at least 2 characters')
    .required('Last name is required'),
  email: Yup.string()
    .email('Invalid email address')
    .required('Email is required'),
  phone: Yup.string()
    .matches(/^[0-9]{10}$/, 'Phone number must be 10 digits')
    .required('Phone number is required'),
  department: Yup.string()
    .required('Department is required'),
  position: Yup.string()
    .required('Position is required'),
  salary: Yup.number()
    .positive('Salary must be positive')
    .required('Salary is required'),
  dateOfJoining: Yup.date()
    .max(new Date(), 'Date of joining cannot be in the future')
    .required('Date of joining is required'),
  employeeType: Yup.string()
    .oneOf(['full-time', 'part-time', 'contract'], 'Invalid employee type')
    .required('Employee type is required'),
  dateOfLeaving: Yup.date()
    .nullable()
    .transform((value, originalValue) => (originalValue === '' ? null : value))
    .when('dateOfJoining', (dateOfJoining, schema) => (
      dateOfJoining
        ? schema.min(dateOfJoining, 'Date of leaving cannot be before date of joining')
        : schema
    )),
});

export default function EmployeeEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  const formik = useFormik({
    initialValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: '',
      position: '',
      salary: '',
      dateOfJoining: '',
      employeeType: 'full-time',
      dateOfLeaving: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      try {
        // Transform form values to match backend API structure
        const fullName = `${values.firstName} ${values.lastName}`.replace(/\s+/g, ' ').trim();
        const payload = {
          name: fullName,
          email: values.email,
          phone: values.phone,
          department_id: values.department,
          position: values.position,
          designation: values.position, // Backend uses designation field
          salary: Number(values.salary),
          joining_date: values.dateOfJoining,
          employee_type: values.employeeType,
        };

        if (values.dateOfLeaving) {
          payload.leaving_date = values.dateOfLeaving;
          payload.status = 'inactive';
        } else {
          payload.leaving_date = null;
          payload.status = 'active';
        }
        
        await api.put(`/employees/${id}`, payload);
        toast.success('Employee updated successfully!');
        setTimeout(() => {
          navigate('/employees');
        }, 1500);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to update employee');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await api.get(`/employees/${id}`);
        console.log('Employee edit response:', response.data);
        const payload = response.data;
        const employee =
          payload && typeof payload === 'object' && !Array.isArray(payload)
            ? payload
            : (payload?.data && typeof payload.data === 'object' ? payload.data : {});
        
        formik.setValues({
          firstName: employee.user_id?.name?.split(' ')[0] || '',
          lastName: employee.user_id?.name?.split(' ').slice(1).join(' ') || '',
          email: employee.user_id?.email || '',
          phone: employee.phone || employee.user_id?.phone || '',
          department: employee.department_id?._id || employee.department_id || '',
          position: employee.position || employee.designation || '',
          salary: employee.salary || '',
          dateOfJoining: employee.joining_date?.split('T')[0] || '',
          employeeType: employee.employee_type || 'full-time',
          dateOfLeaving: employee.leaving_date
            ? new Date(employee.leaving_date).toISOString().split('T')[0]
            : '',
        });
      } catch (err) {
        toast.error('Failed to load employee data');
        console.error('Failed to fetch employee:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <Container maxWidth="md">
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
        Edit Employee #{id}
      </Typography>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 3 } }}>
        <form onSubmit={formik.handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="firstName"
                name="firstName"
                label="First Name"
                value={formik.values.firstName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                helperText={formik.touched.firstName && formik.errors.firstName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="lastName"
                name="lastName"
                label="Last Name"
                value={formik.values.lastName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                helperText={formik.touched.lastName && formik.errors.lastName}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="email"
                name="email"
                label="Email"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="phone"
                name="phone"
                label="Phone Number"
                value={formik.values.phone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.phone && Boolean(formik.errors.phone)}
                helperText={formik.touched.phone && formik.errors.phone}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
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
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="position"
                name="position"
                label="Position"
                value={formik.values.position}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.position && Boolean(formik.errors.position)}
                helperText={formik.touched.position && formik.errors.position}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="salary"
                name="salary"
                label="Salary"
                type="number"
                value={formik.values.salary}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.salary && Boolean(formik.errors.salary)}
                helperText={formik.touched.salary && formik.errors.salary}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="dateOfJoining"
                name="dateOfJoining"
                label="Date of Joining"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formik.values.dateOfJoining}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.dateOfJoining && Boolean(formik.errors.dateOfJoining)}
                helperText={formik.touched.dateOfJoining && formik.errors.dateOfJoining}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="dateOfLeaving"
                name="dateOfLeaving"
                label="Date of Leaving"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={formik.values.dateOfLeaving}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.dateOfLeaving && Boolean(formik.errors.dateOfLeaving)}
                helperText={formik.touched.dateOfLeaving && formik.errors.dateOfLeaving}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                id="employeeType"
                name="employeeType"
                label="Employee Type"
                value={formik.values.employeeType}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.employeeType && Boolean(formik.errors.employeeType)}
                helperText={formik.touched.employeeType && formik.errors.employeeType}
              >
                <MenuItem value="full-time">Full Time</MenuItem>
                <MenuItem value="part-time">Part Time</MenuItem>
                <MenuItem value="contract">Contract</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                size="large"
                disabled={formik.isSubmitting}
                sx={{ mr: 2 }}
              >
                {formik.isSubmitting ? 'Updating...' : 'Update Employee'}
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/employees')}
              >
                Cancel
              </Button>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
}
