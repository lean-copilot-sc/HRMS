import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  MenuItem
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import api from '../services/api';
import TableLoadingState from '../components/ui/TableLoadingState';

const HOLIDAY_TYPE_OPTIONS = [
  { value: 'public', label: 'Public Holiday' },
  { value: 'optional', label: 'Optional Holiday' },
  { value: 'restricted', label: 'Restricted Holiday' },
  { value: 'company', label: 'Company Holiday' },
];

const validationSchema = Yup.object({
  name: Yup.string()
    .min(3, 'Holiday name must be at least 3 characters')
    .required('Holiday name is required'),
  date: Yup.date()
    .required('Date is required'),
  type: Yup.string()
    .oneOf(HOLIDAY_TYPE_OPTIONS.map((option) => option.value), 'Invalid holiday type')
    .required('Holiday type is required'),
  description: Yup.string(),
});

export default function Holidays() {
  const [open, setOpen] = useState(false);
  const [holidays, setHolidays] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const formik = useFormik({
    initialValues: {
      name: '',
      date: '',
      type: 'public',
      description: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      setError('');
      setSuccess('');

      try {
        let normalizedDate = values.date;
        if (typeof normalizedDate === 'string' && normalizedDate) {
          normalizedDate = normalizedDate.includes('T')
            ? normalizedDate
            : `${normalizedDate}T00:00:00.000Z`;
        }

        const payload = { ...values, date: normalizedDate };

        if (editingId) {
          await api.put(`/holidays/${editingId}`, payload);
          setSuccess('Holiday updated successfully!');
        } else {
          await api.post('/holidays', payload);
          setSuccess('Holiday added successfully!');
        }
        resetForm();
        setOpen(false);
        setEditingId(null);
        fetchHolidays();
      } catch (err) {
        setError(err.response?.data?.message || 'Operation failed');
      } finally {
        setSubmitting(false);
      }
    },
  });

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await api.get('/holidays');
      const data = Array.isArray(response.data) ? response.data : [];
      const normalized = data.map((holiday) => ({
        ...holiday,
        id: holiday._id || holiday.id,
      }));
      setHolidays(normalized);
    } catch (err) {
      console.error('Failed to fetch holidays');
    }
    finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHolidays();
  }, []);

  const handleEdit = (holiday) => {
    const holidayId = holiday.id || holiday._id;
    setEditingId(holidayId);
    formik.setValues({
      name: holiday.name,
      date: holiday.date?.split('T')[0] || '',
      type: holiday.type || 'public',
      description: holiday.description || '',
    });
    setOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this holiday?')) {
      try {
        await api.delete(`/holidays/${id}`);
        setSuccess('Holiday deleted successfully!');
        fetchHolidays();
      } catch (err) {
        setError('Failed to delete holiday');
      }
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEditingId(null);
    formik.resetForm();
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Holiday Calendar
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => {
            setEditingId(null);
            formik.resetForm();
            setOpen(true);
          }}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Add Holiday
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper elevation={2} sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Holiday Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Description</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableLoadingState
                loading={loading}
                hasData={holidays.length > 0}
                colSpan={5}
                emptyMessage="No holidays found"
              />
              {!loading && holidays.length > 0 && holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>{new Date(holiday.date).toLocaleDateString()}</TableCell>
                  <TableCell sx={{ textTransform: 'capitalize' }}>{holiday.type}</TableCell>
                  <TableCell>{holiday.description || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton 
                      color="primary" 
                      onClick={() => handleEdit(holiday)}
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(holiday.id)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={false}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
            {editingId ? 'Edit Holiday' : 'Add Holiday'}
          </DialogTitle>
          <DialogContent sx={{ pt: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  id="name"
                  name="name"
                  label="Holiday Name"
                  value={formik.values.name}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.name && Boolean(formik.errors.name)}
                  helperText={formik.touched.name && formik.errors.name}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="date"
                  name="date"
                  label="Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.date}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.date && Boolean(formik.errors.date)}
                  helperText={formik.touched.date && formik.errors.date}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  id="type"
                  name="type"
                  label="Holiday Type"
                  value={formik.values.type}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.type && Boolean(formik.errors.type)}
                  helperText={formik.touched.type && formik.errors.type}
                >
                  {HOLIDAY_TYPE_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  id="description"
                  name="description"
                  label="Description (Optional)"
                  value={formik.values.description}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.description && Boolean(formik.errors.description)}
                  helperText={formik.touched.description && formik.errors.description}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
