import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper,
  TextField,
  Button,
  Grid,
  Alert,
  Divider,
  Box,
  IconButton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';

const validationSchema = Yup.object({
  companyName: Yup.string().required('Company name is required'),
  companyEmail: Yup.string().email('Invalid email').required('Company email is required'),
  companyPhone: Yup.string().matches(/^[0-9]{10}$/, 'Phone must be 10 digits'),
  workingHoursPerDay: Yup.number().min(1).max(24).required('Working hours required'),
  leavePerYear: Yup.number().min(0).required('Leave per year required'),
});

export default function Settings() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [leaveApprovalEmails, setLeaveApprovalEmails] = useState(['gaurang5416@gmail.com']);

  const formik = useFormik({
    initialValues: {
      companyName: '',
      companyEmail: '',
      companyPhone: '',
      companyAddress: '',
      workingHoursPerDay: 8,
      leavePerYear: 20,
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setError('');
      setSuccess('');

      try {
        await api.put('/settings', {
          ...values,
          leaveApprovalEmails: leaveApprovalEmails.filter(email => email.trim() !== ''),
        });
        setSuccess('Settings updated successfully!');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to update settings');
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await api.get('/settings');
        const settings = response.data;
        
        formik.setValues({
          companyName: settings.companyName || '',
          companyEmail: settings.companyEmail || '',
          companyPhone: settings.companyPhone || '',
          companyAddress: settings.companyAddress || '',
          workingHoursPerDay: settings.workingHoursPerDay || 8,
          leavePerYear: settings.leavePerYear || 20,
        });
        
        setLeaveApprovalEmails(
          settings.leaveApprovalEmails && settings.leaveApprovalEmails.length > 0
            ? settings.leaveApprovalEmails
            : ['gaurang5416@gmail.com']
        );
      } catch (err) {
        console.error('Failed to fetch settings', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddEmail = () => {
    setLeaveApprovalEmails([...leaveApprovalEmails, '']);
  };

  const handleRemoveEmail = (index) => {
    if (leaveApprovalEmails.length > 1) {
      const newEmails = leaveApprovalEmails.filter((_, i) => i !== index);
      setLeaveApprovalEmails(newEmails);
    }
  };

  const handleEmailChange = (index, value) => {
    const newEmails = [...leaveApprovalEmails];
    newEmails[index] = value;
    setLeaveApprovalEmails(newEmails);
  };

  const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Settings
      </Typography>
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, mt: { xs: 2, sm: 3 } }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <form onSubmit={formik.handleSubmit}>
          <Typography variant="h6" gutterBottom>
            Company Information
          </Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="companyName"
                name="companyName"
                label="Company Name"
                value={formik.values.companyName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.companyName && Boolean(formik.errors.companyName)}
                helperText={formik.touched.companyName && formik.errors.companyName}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="companyEmail"
                name="companyEmail"
                label="Company Email"
                type="email"
                value={formik.values.companyEmail}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.companyEmail && Boolean(formik.errors.companyEmail)}
                helperText={formik.touched.companyEmail && formik.errors.companyEmail}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="companyPhone"
                name="companyPhone"
                label="Company Phone"
                value={formik.values.companyPhone}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.companyPhone && Boolean(formik.errors.companyPhone)}
                helperText={formik.touched.companyPhone && formik.errors.companyPhone}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                id="companyAddress"
                name="companyAddress"
                label="Company Address"
                multiline
                rows={2}
                value={formik.values.companyAddress}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                disabled={loading}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Work Configuration
          </Typography>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="workingHoursPerDay"
                name="workingHoursPerDay"
                label="Working Hours Per Day"
                type="number"
                value={formik.values.workingHoursPerDay}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.workingHoursPerDay && Boolean(formik.errors.workingHoursPerDay)}
                helperText={formik.touched.workingHoursPerDay && formik.errors.workingHoursPerDay}
                disabled={loading}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                id="leavePerYear"
                name="leavePerYear"
                label="Leave Days Per Year"
                type="number"
                value={formik.values.leavePerYear}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.leavePerYear && Boolean(formik.errors.leavePerYear)}
                helperText={formik.touched.leavePerYear && formik.errors.leavePerYear}
                disabled={loading}
              />
            </Grid>
          </Grid>

          <Divider sx={{ my: 3 }} />

          <Typography variant="h6" gutterBottom>
            Leave Approval Email Recipients
          </Typography>
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Configure email addresses that will receive leave approval notifications. At least one valid email is required.
            </Typography>
            {leaveApprovalEmails.map((email, index) => (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TextField
                  fullWidth
                  label={`Email ${index + 1}`}
                  type="email"
                  value={email}
                  onChange={(e) => handleEmailChange(index, e.target.value)}
                  error={email.trim() !== '' && !isValidEmail(email)}
                  helperText={email.trim() !== '' && !isValidEmail(email) ? 'Invalid email address' : ''}
                  disabled={loading}
                  sx={{ mr: 1 }}
                />
                <IconButton
                  onClick={() => handleRemoveEmail(index)}
                  disabled={leaveApprovalEmails.length === 1 || loading}
                  color="error"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
            ))}
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={handleAddEmail}
              disabled={loading}
              size="small"
            >
              Add More
            </Button>
          </Box>

          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={formik.isSubmitting || loading}
          >
            {formik.isSubmitting ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </Paper>
    </Container>
  );
}
