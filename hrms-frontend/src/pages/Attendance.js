import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Box,
  TablePagination,
  TextField,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import TableLoadingState from '../components/ui/TableLoadingState';
import { LocationOn as LocationIcon } from '@mui/icons-material';

export default function Attendance() {
  const { user } = useAuth();
  const userId = useMemo(() => user?._id || user?.id, [user]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [latestStatus, setLatestStatus] = useState(null);

  const fetchRecords = useCallback(async () => {
    if (!userId) {
      setRecords([]);
      setLatestStatus(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const dateResponse = await api.get('/attendance/logs', {
        params: {
          userId,
          date: selectedDate,
        },
      });

      const data = Array.isArray(dateResponse.data) ? dateResponse.data : [];
      setRecords(data);

      const todayString = new Date().toISOString().split('T')[0];
      let latest = data.length > 0 ? data[0] : null;

      if (!latest || selectedDate !== todayString) {
        const statusResponse = await api.get('/attendance/logs', {
          params: {
            userId,
            limit: 1,
          },
        });
        const statusData = Array.isArray(statusResponse.data) ? statusResponse.data : [];
        latest = statusData.length > 0 ? statusData[0] : latest;
      }

      setLatestStatus(latest);
      setPage(0);
    } catch (err) {
      console.error('Failed to fetch attendance logs', err);
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  }, [userId, selectedDate]);

  useEffect(() => {
    if (userId) {
      fetchRecords();
    }
  }, [userId, fetchRecords]);

  useEffect(() => {
    const handleAttendanceUpdate = () => {
      fetchRecords();
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
  }, [fetchRecords]);

  const paginatedRecords = useMemo(
    () => records.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [records, page, rowsPerPage],
  );

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const openInMaps = (location) => {
    const { latitude, longitude } = location || {};
    if (!latitude || !longitude) return;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formatCoordinates = (location) => {
    const lat = Number(location?.latitude);
    const lng = Number(location?.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
        Attendance
      </Typography>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Select Date"
              InputLabelProps={{ shrink: true }}
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </Grid>
          {latestStatus && (
            <Grid item xs={12} md={8}>
              <Paper elevation={0} sx={{ p: 2, bgcolor: 'grey.100' }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Latest Activity
                </Typography>
                <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <Chip
                    label={latestStatus.action === 'checkin' ? 'Checked In' : 'Checked Out'}
                    color={latestStatus.action === 'checkin' ? 'success' : 'default'}
                    size="small"
                    sx={{ textTransform: 'capitalize' }}
                  />
                  {new Date(latestStatus.timestamp).toLocaleString()}
                  {latestStatus.location?.latitude && latestStatus.location?.longitude && (
                    <Tooltip
                      title={
                        latestStatus.location.accuracy
                          ? `Open in Google Maps (±${latestStatus.location.accuracy}m)`
                          : 'Open in Google Maps'
                      }
                    >
                      <IconButton
                        size="small"
                        color="primary"
                        onClick={() => openInMaps(latestStatus.location)}
                      >
                        <LocationIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Typography>
                {latestStatus.location?.address?.label && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5, maxWidth: 420 }}
                  >
                    {latestStatus.location.address.label}
                  </Typography>
                )}
                {formatCoordinates(latestStatus.location) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    {formatCoordinates(latestStatus.location)}
                  </Typography>
                )}
              </Paper>
            </Grid>
          )}
        </Grid>
      </Paper>

      <Paper elevation={2} sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Action</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableLoadingState
                loading={loading}
                hasData={paginatedRecords.length > 0}
                colSpan={3}
                emptyMessage="No attendance activity for the selected date"
              />
              {!loading && paginatedRecords.length > 0 && paginatedRecords.map((record) => (
                <TableRow key={record._id}>
                  <TableCell>{new Date(record.timestamp).toLocaleTimeString()}</TableCell>
                  <TableCell>
                    <Chip
                      label={record.action === 'checkin' ? 'Check In' : 'Check Out'}
                      color={record.action === 'checkin' ? 'success' : 'default'}
                      size="small"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  </TableCell>
                  <TableCell>
                    {record.location?.latitude && record.location?.longitude ? (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Tooltip
                          title={
                            record.location.accuracy
                              ? `Open in Google Maps (±${record.location.accuracy}m)`
                              : 'Open in Google Maps'
                          }
                        >
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => openInMaps(record.location)}
                          >
                            <LocationIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                          {record.location.address?.label ? (
                            <Tooltip title={record.location.address.label} placement="top-start">
                              <Typography
                                variant="body2"
                                sx={{
                                  maxWidth: 260,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                }}
                              >
                                {record.location.address.label}
                              </Typography>
                            </Tooltip>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No address available
                            </Typography>
                          )}
                          {formatCoordinates(record.location) && (
                            <Typography variant="caption" color="text.secondary">
                              {formatCoordinates(record.location)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        -
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={records.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
}
