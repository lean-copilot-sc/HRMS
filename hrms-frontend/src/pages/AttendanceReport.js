import { useState, useEffect, useCallback, useMemo } from 'react';
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Chip,
  Grid,
  MenuItem,
  Tooltip,
} from '@mui/material';
import { Visibility as ViewIcon, Close as CloseIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { toast } from 'react-toastify';
import api from '../services/api';
import TableLoadingState from '../components/ui/TableLoadingState';

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'success' },
  absent: { label: 'Absent', color: 'error' },
  'half-day': { label: 'Half Day', color: 'warning' },
  'in-progress': { label: 'In Progress', color: 'info' },
};

const getStatusPresentation = (status) => {
  const normalized = status?.toLowerCase?.();
  if (normalized && STATUS_CONFIG[normalized]) {
    return STATUS_CONFIG[normalized];
  }

  const fallbackLabel = status ? status.replace(/-/g, ' ') : 'Unknown';
  return { label: fallbackLabel, color: 'default' };
};

export default function AttendanceReport() {
  const [attendanceData, setAttendanceData] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [logEntries, setLogEntries] = useState([]);
  const [detailTotalMs, setDetailTotalMs] = useState(0);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    fetchAttendanceData();
  }, [selectedDate, selectedEmployee]);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees');
      const payload = response.data;
      const employeeList = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];
      setEmployees(employeeList);
    } catch (err) {
      console.error('Failed to fetch employees', err);
    }
  };

  const fetchAttendanceData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedDate) {
        params.date = selectedDate;
      }
      if (selectedEmployee) {
        params.employeeId = selectedEmployee;
      }

      const response = await api.get('/attendance/report', { params });
      const payload = response.data;
      const records = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.data)
          ? payload.data
          : [];

      setAttendanceData(records);
      setPage(0);
    } catch (err) {
      toast.error('Failed to fetch attendance data');
      console.error('Failed to fetch attendance', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleViewDetails = async (record) => {
    setDetailsDialog(true);
    setSelectedRecord(record);
    setLogEntries([]);

    await fetchLocationLogs(record);
  };

  const handleCloseDetails = () => {
    setDetailsDialog(false);
    setSelectedRecord(null);
    setLogEntries([]);
  };

  const handleClearFilters = () => {
    setSelectedDate('');
    setSelectedEmployee('');
  };

  const formatTime = (dateString) => {
    if (!dateString) return '-';
    const parsed = new Date(dateString);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const calculateDurationMs = (startTime, endTime, includeActive = false) => {
    if (!startTime) {
      return 0;
    }

    const start = new Date(startTime).getTime();
    if (Number.isNaN(start)) {
      return 0;
    }

    if (endTime) {
      const end = new Date(endTime).getTime();
      if (Number.isNaN(end) || end <= start) {
        return 0;
      }
      return end - start;
    }

    if (!includeActive) {
      return 0;
    }

    const now = Date.now();
    return now > start ? now - start : 0;
  };

  const convertDecimalHoursToMs = (decimalHours) => {
    if (!Number.isFinite(decimalHours) || decimalHours <= 0) {
      return 0;
    }
    const totalSeconds = Math.round(decimalHours * 3600);
    return totalSeconds * 1000;
  };

  const formatDurationLabel = (milliseconds) => {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return '0h 00m 00s';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds
      .toString()
      .padStart(2, '0')}s`;
  };

  const openInMaps = (location) => {
    const { latitude, longitude } = location || {};
    if (!latitude || !longitude) return;
    const url = `https://www.google.com/maps?q=${latitude},${longitude}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const fetchLocationLogs = async (record) => {
    const userId = record?.employee?.user?._id;
    const dateValue = record?.date;
    if (!userId || !dateValue) {
      setLogEntries([]);
      return;
    }

    try {
      const dateParam = typeof dateValue === 'string'
        ? dateValue.split('T')[0]
        : new Date(dateValue).toISOString().split('T')[0];
      const response = await api.get('/attendance/logs', {
        params: {
          userId,
          date: selectedDate,
        },
      });
      const data = Array.isArray(response.data) ? response.data : [];
      setLogEntries(data);
    } catch (err) {
      console.error('Failed to fetch location logs', err);
      toast.error('Failed to load attendance locations');
      setLogEntries([]);
    }
  };


  const findLogEntry = useCallback(
    (action, timestamp) => {
      if (!timestamp || !logEntries.length) return null;
      const targetTime = new Date(timestamp).getTime();
      if (Number.isNaN(targetTime)) return null;

      let closest = null;
      let smallestDiff = Number.POSITIVE_INFINITY;

      logEntries.forEach((entry) => {
        if (entry.action !== action || !entry.timestamp) return;
        const entryTime = new Date(entry.timestamp).getTime();
        if (Number.isNaN(entryTime)) return;
        const diff = Math.abs(entryTime - targetTime);
        if (diff < smallestDiff) {
          smallestDiff = diff;
          closest = entry;
        }
      });

      return smallestDiff <= 5 * 60 * 1000 ? closest : null;
    },
    [logEntries],
  );

  const computedSessions = useMemo(() => {
    if (selectedRecord?.sessions?.length) {
      return selectedRecord.sessions;
    }

    if (!logEntries.length) {
      return [];
    }

    const sortedLogs = [...logEntries]
      .filter((entry) => entry && entry.timestamp)
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const sessions = [];
    let current = null;

    sortedLogs.forEach((entry) => {
      const action = entry.action?.toLowerCase?.();
      const time = entry.timestamp;
      if (!action || !time) {
        return;
      }

      if (action === 'checkin') {
        if (current) {
          sessions.push({ ...current });
        }
        current = { clockIn: time, clockOut: null };
      } else if (action === 'checkout') {
        if (current && !current.clockOut) {
          current.clockOut = time;
          sessions.push({ ...current });
          current = null;
        } else {
          sessions.push({ clockIn: null, clockOut: time });
        }
      }
    });

    if (current) {
      sessions.push({ ...current });
    }

    return sessions.map((session, index) => ({
      order: index + 1,
      clockIn: session.clockIn,
      clockOut: session.clockOut,
    }));
  }, [selectedRecord, logEntries]);

  useEffect(() => {
    if (!detailsDialog) {
      setDetailTotalMs(0);
      return undefined;
    }

    if (!computedSessions.length) {
      setDetailTotalMs(0);
      return undefined;
    }

    const updateTotals = () => {
      const total = computedSessions.reduce((sum, session) => {
        const includeActive = Boolean(session.clockIn) && !session.clockOut;
        return (
          sum +
          calculateDurationMs(
            session.clockIn,
            session.clockOut,
            includeActive
          )
        );
      }, 0);

      setDetailTotalMs(total);
    };

    updateTotals();

    const hasActiveSession = computedSessions.some(
      (session) => session.clockIn && !session.clockOut
    );

    if (!hasActiveSession) {
      return undefined;
    }

    const intervalId = setInterval(updateTotals, 1000);
    return () => clearInterval(intervalId);
  }, [detailsDialog, computedSessions]);

  const paginatedData = useMemo(
    () => attendanceData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [attendanceData, page, rowsPerPage],
  );

  const renderStatusChip = (status) => {
    const presentation = getStatusPresentation(status);
    return (
      <Chip
        label={presentation.label}
        color={presentation.color}
        size="small"
        sx={{ textTransform: 'capitalize' }}
      />
    );
  };

  const renderSessionCountChip = (count) => (
    <Chip
      label={`${count} ${count === 1 ? 'session' : 'sessions'}`}
      size="small"
      color="primary"
    />
  );
  const getSessionCount = (record) => (
    typeof record.sessionCount === 'number'
      ? record.sessionCount
      : record.sessions?.length || 0
  );

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 }, pb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Employee Attendance Report
        </Typography>
      </Box>

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              label="Date"
              type="date"
              value={selectedDate || ''}
              onChange={(e) => setSelectedDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              select
              label="Employee"
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
            >
              <MenuItem value="">All Employees</MenuItem>
              {employees.map((emp) => (
                <MenuItem key={emp._id} value={emp._id}>
                  {emp.user_id?.name || 'Unknown'} - {emp.designation}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="outlined"
              fullWidth
              sx={{ height: '56px' }}
              onClick={handleClearFilters}
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
                <TableCell sx={{ fontWeight: 'bold' }}>Employee Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>First Clock-In</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Last Clock-Out</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Sessions</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Total Hours</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableLoadingState
                loading={loading}
                hasData={paginatedData.length > 0}
                colSpan={9}
                emptyMessage="No attendance records found"
              />
              {!loading && paginatedData.length > 0 && paginatedData.map((record) => {
                const employeeId = record.employee?._id || record.employee?.user?._id || 'employee';
                const rowKey = `${employeeId}-${record.date || 'no-date'}`;
                const sessionCount = getSessionCount(record);
                const sessionTotalMs = (record.sessions || []).reduce((sum, session) => {
                  const includeActive = Boolean(session.clockIn) && !session.clockOut;
                  return (
                    sum +
                    calculateDurationMs(
                      session.clockIn,
                      session.clockOut,
                      includeActive
                    )
                  );
                }, 0);

                const recordTotalMs = sessionTotalMs || (Number.isFinite(record.totalHours)
                  ? convertDecimalHoursToMs(record.totalHours)
                  : 0);
                const lastClockOutDisplay = record.lastClockOut
                  ? formatTime(record.lastClockOut)
                  : (record.status || '').toLowerCase() === 'in-progress'
                    ? <Chip label="In Progress" size="small" color="warning" />
                    : '-';

                return (
                  <TableRow key={rowKey}>
                    <TableCell>{record.employee?.user?.name || 'N/A'}</TableCell>
                    <TableCell>{record.employee?.department?.name || 'N/A'}</TableCell>
                    <TableCell>{record.date ? new Date(record.date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell>{formatTime(record.firstClockIn)}</TableCell>
                    <TableCell>{lastClockOutDisplay}</TableCell>
                    <TableCell>{renderSessionCountChip(sessionCount)}</TableCell>
                    <TableCell>
                      <strong>
                        {formatDurationLabel(recordTotalMs)}
                      </strong>
                    </TableCell>
                    <TableCell>{renderStatusChip(record.status)}</TableCell>
                    <TableCell align="center">
                      <IconButton
                        color="primary"
                        onClick={() => handleViewDetails(record)}
                        title="View Session Details"
                      >
                        <ViewIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25, 50]}
          component="div"
          count={attendanceData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>

      <Dialog
        open={detailsDialog}
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Session Details</Typography>
            <IconButton onClick={handleCloseDetails}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent dividers>
          {selectedRecord && (
            <>
              <Box sx={{ mb: 3 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Employee</Typography>
                    <Typography variant="body1"><strong>{selectedRecord.employee?.user?.name || 'N/A'}</strong></Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Department</Typography>
                    <Typography variant="body1"><strong>{selectedRecord.employee?.department?.name || 'N/A'}</strong></Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Date</Typography>
                    <Typography variant="body1"><strong>{selectedRecord.date ? new Date(selectedRecord.date).toLocaleDateString() : '-'}</strong></Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Status</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {renderStatusChip(selectedRecord.status)}
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Total Hours</Typography>
                    <Typography variant="body1">
                      <strong>{formatDurationLabel(detailTotalMs)}</strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Sessions</Typography>
                    <Typography variant="body1">
                      <strong>
                        {(() => {
                          const count = computedSessions.length;
                          return `${count} ${count === 1 ? 'session' : 'sessions'}`;
                        })()}
                      </strong>
                    </Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">First Clock-In</Typography>
                    <Typography variant="body1"><strong>{formatTime(selectedRecord.firstClockIn)}</strong></Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="body2" color="text.secondary">Last Clock-Out</Typography>
                    <Typography variant="body1"><strong>{formatTime(selectedRecord.lastClockOut)}</strong></Typography>
                  </Grid>
                </Grid>
              </Box>

              <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
                Clock-In/Out Sessions
              </Typography>

              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><strong>#</strong></TableCell>
                      <TableCell><strong>Clock-In Time</strong></TableCell>
                      <TableCell><strong>Clock-Out Time</strong></TableCell>
                      <TableCell><strong>Duration</strong></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {computedSessions.length > 0 ? (
                      computedSessions.map((session, index) => {
                        const checkInLog = findLogEntry('checkin', session.clockIn);
                        const checkOutLog = session.clockOut
                          ? findLogEntry('checkout', session.clockOut)
                          : null;

                        return (
                          <TableRow key={index}>
                            <TableCell>{session.order || index + 1}</TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                {formatTime(session.clockIn)}
                                {checkInLog?.location?.latitude && checkInLog?.location?.longitude && (
                                  <Tooltip
                                    title={
                                      checkInLog.location?.accuracy
                                        ? `Open in Google Maps (±${checkInLog.location.accuracy}m)`
                                        : 'Open in Google Maps'
                                    }
                                  >
                                    <IconButton
                                      size="small"
                                      color="primary"
                                      onClick={() => openInMaps(checkInLog.location)}
                                    >
                                      <LocationIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              {session.clockOut ? (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {formatTime(session.clockOut)}
                                  {checkOutLog?.location?.latitude && checkOutLog?.location?.longitude && (
                                    <Tooltip
                                      title={
                                        checkOutLog.location?.accuracy
                                          ? `Open in Google Maps (±${checkOutLog.location.accuracy}m)`
                                          : 'Open in Google Maps'
                                      }
                                    >
                                      <IconButton
                                        size="small"
                                        color="primary"
                                        onClick={() => openInMaps(checkOutLog.location)}
                                      >
                                        <LocationIcon fontSize="small" />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Box>
                              ) : (
                                <Chip label="In Progress" size="small" color="warning" />
                              )}
                            </TableCell>
                            <TableCell>
                              <strong>
                                {formatDurationLabel(
                                  calculateDurationMs(session.clockIn, session.clockOut)
                                )}
                              </strong>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} align="center">
                          No sessions found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails} variant="contained">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
