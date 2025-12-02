import { useState, useEffect, useCallback } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  MenuItem,
  Box,
  TablePagination
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TableLoadingState from '../components/ui/TableLoadingState';

const validationSchema = Yup.object({
  leaveType: Yup.string()
    .oneOf(['sick', 'casual', 'vacation', 'unpaid'], 'Invalid leave type')
    .required('Leave type is required'),
  startDate: Yup.date()
    .min(new Date(), 'Start date cannot be in the past')
    .required('Start date is required'),
  endDate: Yup.date()
    .min(Yup.ref('startDate'), 'End date must be after start date')
    .required('End date is required'),
  reason: Yup.string()
    .min(10, 'Reason must be at least 10 characters')
    .required('Reason is required'),
});

export default function Leave() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const getDefaultFilters = (role) => ({
    status: role === 'employee' ? 'all' : 'pending',
    employeeId: '',
    startDate: '',
    endDate: ''
  });

  const [filters, setFilters] = useState(getDefaultFilters(user?.role));

  const formik = useFormik({
    initialValues: {
      leaveType: 'casual',
      startDate: '',
      endDate: '',
      reason: '',
    },
    validationSchema: validationSchema,
    onSubmit: async (values, { setSubmitting, resetForm }) => {
      try {
        // Map fields to backend contract
        const payload = {
          leave_type: values.leaveType,
          from_date: values.startDate,
          to_date: values.endDate,
          reason: values.reason,
        };
        await api.post('/leave/request', payload);
        toast.success('Leave request submitted successfully!');
        resetForm();
        setOpen(false);
        fetchLeaves();
      } catch (err) {
        const message =
          err.response?.data?.error ||
          err.response?.data?.message ||
          'Failed to submit leave request';
        toast.error(message);
      } finally {
        setSubmitting(false);
      }
    },
  });

  const fetchLeaves = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const endpoint = user.role === 'employee' ? '/leave/my-requests' : '/leave/pending';
      const params = {
        status: filters.status,
      };

      if (filters.startDate) {
        params.startDate = filters.startDate;
      }

      if (filters.endDate) {
        params.endDate = filters.endDate;
      }

      if (user.role !== 'employee' && filters.employeeId) {
        params.employeeId = filters.employeeId;
      }

      const response = await api.get(endpoint, { params });
      const payload = response.data;
      const leavesData = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setLeaves(leavesData);
      setPage((prevPage) => {
        const maxPage = Math.max(Math.ceil(leavesData.length / rowsPerPage) - 1, 0);
        return prevPage > maxPage ? maxPage : prevPage;
      });
    } catch (err) {
      console.error('Failed to fetch leaves', err);
      toast.error('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  }, [user, filters, rowsPerPage]);

  useEffect(() => {
    if (user) {
      setFilters(getDefaultFilters(user.role));
    }
  }, [user?.role]);

  useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const response = await api.get('/employees');
        const payload = response.data;
        const employeeData = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.data)
            ? payload.data
            : [];
        setEmployees(employeeData);
      } catch (err) {
        console.error('Failed to load employees list', err);
        toast.error('Failed to load employees list');
      }
    };

    if (user && user.role !== 'employee') {
      loadEmployees();
    }
  }, [user]);

  const handleFilterChange = (field) => (event) => {
    const { value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [field]: value
    }));
    setPage(0);
  };

  const handleResetFilters = () => {
    if (!user) return;
    setFilters(getDefaultFilters(user.role));
    setPage(0);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const isEmployeeUser = user?.role === 'employee';
  const columnsCount = isEmployeeUser ? 5 : 6;
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
    { label: 'Rejected', value: 'rejected' }
  ];

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Leave Management
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<AddIcon />}
          onClick={() => setOpen(true)}
          sx={{ width: { xs: '100%', sm: 'auto' } }}
        >
          Request Leave
        </Button>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              select
              label="Status"
              value={filters.status}
              onChange={handleFilterChange('status')}
            >
              {statusOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          {!isEmployeeUser && (
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                fullWidth
                select
                label="Employee"
                value={filters.employeeId}
                onChange={handleFilterChange('employeeId')}
              >
                <MenuItem value="">
                  All Employees
                </MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee._id} value={employee._id}>
                    {employee.user_id?.name || 'Unknown'}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          )}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              InputLabelProps={{ shrink: true }}
              value={filters.startDate}
              onChange={handleFilterChange('startDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              InputLabelProps={{ shrink: true }}
              value={filters.endDate}
              onChange={handleFilterChange('endDate')}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              sx={{ height: '100%' }}
              onClick={handleResetFilters}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>
      <Paper elevation={2} sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                {!isEmployeeUser && (
                  <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                )}
                <TableCell sx={{ fontWeight: 'bold' }}>Leave Type</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>End Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Reason</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableLoadingState
                loading={loading}
                hasData={leaves.length > 0}
                colSpan={columnsCount}
                emptyMessage="No leave requests found"
              />
              {!loading && leaves.length > 0 && leaves
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((leave) => (
                  <TableRow key={leave._id || leave.id}>
                    {!isEmployeeUser && (
                      <TableCell>{leave.employee_id?.user_id?.name || 'N/A'}</TableCell>
                    )}
                    <TableCell sx={{ textTransform: 'capitalize' }}>{leave.leave_type}</TableCell>
                    <TableCell>{leave.from_date ? new Date(leave.from_date).toLocaleDateString() : ''}</TableCell>
                    <TableCell>{leave.to_date ? new Date(leave.to_date).toLocaleDateString() : ''}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Chip 
                        label={leave.status} 
                        color={getStatusColor(leave.status)} 
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          rowsPerPageOptions={[5, 10, 25, 50]}
          count={leaves.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth fullScreen={false}>
        <form onSubmit={formik.handleSubmit}>
          <DialogTitle sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>Request Leave</DialogTitle>
          <DialogContent sx={{ pt: { xs: 2, sm: 3 } }}>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  select
                  id="leaveType"
                  name="leaveType"
                  label="Leave Type"
                  value={formik.values.leaveType}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.leaveType && Boolean(formik.errors.leaveType)}
                  helperText={formik.touched.leaveType && formik.errors.leaveType}
                >
                  <MenuItem value="sick">Sick Leave</MenuItem>
                  <MenuItem value="casual">Casual Leave</MenuItem>
                  <MenuItem value="vacation">Vacation</MenuItem>
                  <MenuItem value="unpaid">Unpaid Leave</MenuItem>
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="startDate"
                  name="startDate"
                  label="Start Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.startDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.startDate && Boolean(formik.errors.startDate)}
                  helperText={formik.touched.startDate && formik.errors.startDate}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  id="endDate"
                  name="endDate"
                  label="End Date"
                  type="date"
                  InputLabelProps={{ shrink: true }}
                  value={formik.values.endDate}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.endDate && Boolean(formik.errors.endDate)}
                  helperText={formik.touched.endDate && formik.errors.endDate}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  id="reason"
                  name="reason"
                  label="Reason"
                  value={formik.values.reason}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.reason && Boolean(formik.errors.reason)}
                  helperText={formik.touched.reason && formik.errors.reason}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Container>
  );
}
