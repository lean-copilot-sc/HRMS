import { useCallback, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import {
  AccessTime,
  Assessment,
  Business,
  CalendarToday,
  Cancel as CheckOutIcon,
  CheckCircle as CheckInIcon,
  Dashboard,
  EventNote,
  Logout,
  Menu as MenuIcon,
  People,
  ReceiptLong,
  Send,
  Settings,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { enrichLocationWithAddress, requestCurrentLocation } from '../utils/location';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/500.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';

const drawerWidth = 240;
const HOLIDAY_NOTIFICATION_STORAGE_KEY = 'hrmsHolidayNotificationLog';

const toLocalDateParam = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const summarizeWorkedTime = (logs = []) => {
  if (!Array.isArray(logs) || logs.length === 0) {
    return { totalMs: 0, activeSince: null };
  }

  const sortedLogs = [...logs]
    .filter((entry) => entry && entry.timestamp && typeof entry.action === 'string')
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let activeCheckIn = null;
  let totalMs = 0;

  sortedLogs.forEach((entry) => {
    const timestamp = new Date(entry.timestamp).getTime();
    if (Number.isNaN(timestamp)) {
      return;
    }

    const action = entry.action?.toLowerCase?.();

    if (action === 'checkin') {
      activeCheckIn = timestamp;
    } else if (action === 'checkout' && activeCheckIn !== null && timestamp > activeCheckIn) {
      totalMs += timestamp - activeCheckIn;
      activeCheckIn = null;
    }
  });

  return {
    totalMs,
    activeSince: activeCheckIn,
  };
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

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard', roles: ['admin', 'hr', 'employee'] },
  { text: 'Employees', icon: <People />, path: '/employees', roles: ['admin', 'hr'] },
  { text: 'Attendance', icon: <AccessTime />, path: '/attendance', roles: ['admin', 'hr', 'employee'] },
  { text: 'Attendance Report', icon: <Assessment />, path: '/attendance/report', roles: ['admin', 'hr'] },
  { text: 'Leave', icon: <EventNote />, path: '/leave', roles: ['admin', 'hr', 'employee'] },
  { text: 'Departments', icon: <Business />, path: '/departments', roles: ['admin', 'hr'] },
  { text: 'Holidays', icon: <CalendarToday />, path: '/holidays', roles: ['admin', 'hr', 'employee'] },
  { text: 'Salary Slips', icon: <ReceiptLong />, path: '/salary-slip', roles: ['admin'] },
  { text: 'Send Salary Slips', icon: <Send />, path: '/payroll/send-salary-slip', roles: ['admin'] },
  { text: 'Settings', icon: <Settings />, path: '/settings', roles: ['admin'] },
];

const BRAND_COLOR = '#17134b';
const BRAND_FONT_FAMILY = '"Poppins", "Segoe UI", sans-serif';
const drawerPaperSx = {
  boxSizing: 'border-box',
  width: drawerWidth,
  borderRight: '1px solid rgba(23, 19, 75, 0.12)',
  borderRadius: 0,
};

export default function MainLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const userId = user?._id || user?.id;
  const [checkedIn, setCheckedIn] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [todayHours, setTodayHours] = useState('0h 00m 00s');
  const [todayHoursLoading, setTodayHoursLoading] = useState(false);
  const [todayWorkSnapshot, setTodayWorkSnapshot] = useState(null);

  const checkAttendanceStatus = useCallback(async () => {
    if (!userId) {
      setCheckedIn(false);
      setTodayHours('0h 00m 00s');
      setTodayWorkSnapshot(null);
      return;
    }

    setTodayHoursLoading(true);

    try {
      const todayParam = toLocalDateParam(new Date());
      const todaysResponse = await api.get('/attendance/logs', {
        params: {
          userId,
          date: todayParam,
        },
      });

      const todaysLogs = Array.isArray(todaysResponse.data)
        ? todaysResponse.data
        : Array.isArray(todaysResponse.data?.data)
        ? todaysResponse.data.data
        : [];

      let latestRecords = todaysLogs;

      if (latestRecords.length === 0) {
        const latestFallback = await api.get('/attendance/logs', {
          params: {
            userId,
            limit: 1,
          },
        });

        latestRecords = Array.isArray(latestFallback.data)
          ? latestFallback.data
          : Array.isArray(latestFallback.data?.data)
          ? latestFallback.data.data
          : [];
      }

      setCheckedIn(latestRecords.length > 0 && latestRecords[0].action === 'checkin');

      const { totalMs, activeSince } = summarizeWorkedTime(todaysLogs);
      setTodayWorkSnapshot({ totalMs, activeSince });
    } catch (err) {
      console.error('Failed to check attendance status', err);
      setTodayWorkSnapshot(null);
      setTodayHours('--');
    } finally {
      setTodayHoursLoading(false);
    }
  }, [userId]);

  const checkHolidayReminder = useCallback(async () => {
    if (!userId) {
      return;
    }

    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return;
    }

    if (Notification.permission === 'default') {
      try {
        await Notification.requestPermission();
      } catch (requestErr) {
        console.warn('Notification permission request failed', requestErr);
      }
    }

    if (Notification.permission !== 'granted') {
      return;
    }

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowKey = toLocalDateParam(tomorrow);
      const todayKey = toLocalDateParam(new Date());
      const year = tomorrow.getFullYear();

      const response = await api.get('/holidays', {
        params: { year },
      });

      const holidays = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.data)
        ? response.data.data
        : [];

      if (!holidays.length) {
        return;
      }

      const matches = holidays.filter((holiday) => {
        if (!holiday?.date) {
          return false;
        }
        const holidayDate = new Date(holiday.date);
        if (Number.isNaN(holidayDate.getTime())) {
          return false;
        }
        return toLocalDateParam(holidayDate) === tomorrowKey;
      });

      if (!matches.length) {
        return;
      }

      let history = {};
      try {
        history = JSON.parse(localStorage.getItem(HOLIDAY_NOTIFICATION_STORAGE_KEY) || '{}');
      } catch (storageErr) {
        console.warn('Failed to parse holiday notification history', storageErr);
      }

      const updatedHistory = { ...history };

      matches.forEach((holiday) => {
        const identifier = `${holiday?._id || holiday?.id || holiday?.name}-${tomorrowKey}`;
        if (updatedHistory[identifier] === todayKey) {
          return;
        }

        try {
          new Notification('Upcoming Holiday', {
            body: `Tomorrow is ${holiday.name}`,
            icon: '/new_tablecloth.png',
            requireInteraction: false,
          });
          updatedHistory[identifier] = todayKey;
        } catch (notifyErr) {
          console.warn('Failed to dispatch holiday notification', notifyErr);
        }
      });

      localStorage.setItem(HOLIDAY_NOTIFICATION_STORAGE_KEY, JSON.stringify(updatedHistory));
    } catch (err) {
      console.error('Holiday reminder check failed', err);
    }
  }, [userId]);

  useEffect(() => {
    checkAttendanceStatus();
  }, [checkAttendanceStatus]);

  useEffect(() => {
    if (!todayWorkSnapshot) {
      return undefined;
    }

    const tick = () => {
      const baseMs = Number.isFinite(todayWorkSnapshot.totalMs) ? todayWorkSnapshot.totalMs : 0;
      const runningMs = todayWorkSnapshot.activeSince
        ? Math.max(0, Date.now() - todayWorkSnapshot.activeSince)
        : 0;
      setTodayHours(formatDurationLabel(baseMs + runningMs));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [todayWorkSnapshot]);

  useEffect(() => {
    if (!userId) {
      return undefined;
    }

    checkHolidayReminder();
    const interval = setInterval(checkHolidayReminder, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [userId, checkHolidayReminder]);

  useEffect(() => {
    const handleAttendanceUpdated = (event) => {
      const record = event?.detail;
      if (record?.action === 'checkin') {
        setCheckedIn(true);
      } else if (record?.action === 'checkout') {
        setCheckedIn(false);
      }

      checkAttendanceStatus();
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdated);
    return () => window.removeEventListener('attendanceUpdated', handleAttendanceUpdated);
  }, [checkAttendanceStatus]);

  const filteredMenuItems = menuItems.filter((item) => item.roles.includes(user?.role));

  const handleDrawerToggle = () => {
    setMobileOpen((prev) => !prev);
  };

  const handleNavigation = (path) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const ensureGeolocationPermission = async () => {
    if (typeof navigator === 'undefined') {
      toast.error('Attendance actions require a browser environment.');
      return false;
    }

    if (!('geolocation' in navigator)) {
      toast.error('Geolocation is not supported on this device.');
      return false;
    }

    if (!navigator.permissions?.query) {
      return true;
    }

    try {
      const permissionStatus = await navigator.permissions.query({ name: 'geolocation' });
      if (permissionStatus.state === 'denied') {
        toast.error('Location permission is required to record attendance. Please enable it and try again.');
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Failed to check geolocation permission', err);
      return true;
    }
  };

  const handleSimpleAction = async (action) => {
    setPendingAction(action);
    setActionLoading(true);
    try {
      const hasPermission = await ensureGeolocationPermission();
      if (!hasPermission) {
        return;
      }

      const location = await requestCurrentLocation({ desiredAccuracy: 30, improvementTimeout: 12000 });
      const enrichedLocation = await enrichLocationWithAddress(location);
      const response = await api.post(`/attendance/logs/${action}`, { location: enrichedLocation });
      const record = response.data;

      if (action === 'checkin') {
        toast.success('Checked in successfully!');
        setCheckedIn(true);
      } else {
        toast.success('Checked out successfully!');
        setCheckedIn(false);
      }

      window.dispatchEvent(new CustomEvent('attendanceUpdated', { detail: record }));
    } catch (err) {
      const message = err?.response?.data?.error || err?.message || `Failed to ${action}`;
      toast.error(message);
    } finally {
      setActionLoading(false);
      setPendingAction(null);
    }
  };

  const drawer = (
    <Box sx={{ fontFamily: BRAND_FONT_FAMILY, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 1,
          py: 1.5,
          px: 2,
          backgroundColor: BRAND_COLOR,
          color: '#ffffff',
          minHeight: '64px',
          borderRadius: 0,
          width: '100%',
        }}
      >
        <Box sx={{ width: '100%' }}>
          <img
            src="/new_tablecloth.png"
            alt="HRMS Logo"
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
        </Box>
      </Toolbar>
      <Divider />
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          gap: 0.75,
          px: 2,
          py: 1.75,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            fontFamily: BRAND_FONT_FAMILY,
            letterSpacing: '0.12em',
            color: alpha(BRAND_COLOR, 0.7),
          }}
        >
          Today's Hours
        </Typography>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            backgroundColor: alpha(BRAND_COLOR, 0.08),
            borderRadius: 2,
            px: 1.25,
            py: 1,
          }}
        >
          <AccessTime sx={{ fontSize: 20, color: BRAND_COLOR }} />
          {todayHoursLoading ? (
            <CircularProgress size={16} sx={{ color: BRAND_COLOR }} />
          ) : (
            <Typography
              variant="subtitle2"
              sx={{
                fontFamily: BRAND_FONT_FAMILY,
                fontWeight: 600,
                color: BRAND_COLOR,
              }}
            >
              {todayHours ?? '0h 00m 00s'}
            </Typography>
          )}
        </Box>
      </Box>
      <Divider sx={{ display: { xs: 'block', md: 'none' }, mx: 1.5, my: 1 }} />
      <Box sx={{ overflow: 'auto', flexGrow: 1, py: 2 }}>
        <List sx={{ px: 1 }}>
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <ListItem
                button
                key={item.text}
                onClick={() => handleNavigation(item.path)}
                selected={isActive}
                sx={{
                  borderRadius: 1.5,
                  mb: 0.5,
                  mx: 0.5,
                  px: 2,
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(BRAND_COLOR, 0.08),
                    transform: 'translateX(4px)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: alpha(BRAND_COLOR, 0.12),
                    '&:hover': {
                      backgroundColor: alpha(BRAND_COLOR, 0.2),
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    color: BRAND_COLOR,
                    minWidth: 40,
                    '& svg': {
                      fontSize: '1.15rem',
                    },
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.text}
                  primaryTypographyProps={{
                    fontFamily: BRAND_FONT_FAMILY,
                    fontWeight: isActive ? 600 : 500,
                    letterSpacing: '0.02em',
                    fontSize: '0.9rem',
                  }}
                />
              </ListItem>
            );
          })}
        </List>
        <Divider sx={{ mx: 1.5, my: 1.5 }} />
        <List sx={{ px: 1 }}>
          <ListItem
            button
            onClick={() => handleNavigation('/profile')}
            selected={location.pathname === '/profile'}
            sx={{
              borderRadius: 1.5,
              mx: 0.5,
              px: 2,
              transition: 'background-color 0.2s ease, transform 0.2s ease',
              '&:hover': {
                backgroundColor: alpha(BRAND_COLOR, 0.08),
                transform: 'translateX(4px)',
              },
              '&.Mui-selected': {
                backgroundColor: alpha(BRAND_COLOR, 0.12),
                '&:hover': {
                  backgroundColor: alpha(BRAND_COLOR, 0.2),
                },
              },
            }}
          >
                <ListItemIcon
                  sx={{
                    color: BRAND_COLOR,
                    minWidth: 40,
                    '& svg': {
                      fontSize: '1.15rem',
                    },
                  }}
                >
              <People />
            </ListItemIcon>
            <ListItemText
              primary="Profile"
              primaryTypographyProps={{
                fontFamily: BRAND_FONT_FAMILY,
                fontWeight: location.pathname === '/profile' ? 600 : 500,
                    letterSpacing: '0.02em',
                    fontSize: '0.9rem',
              }}
            />
          </ListItem>
          {isMobile && (
            <>
              <Divider sx={{ mx: 1.5, my: 1.5 }} />
              <ListItem
                button
                onClick={() => handleSimpleAction(checkedIn ? 'checkout' : 'checkin')}
                disabled={actionLoading || !userId}
                sx={{
                  borderRadius: 1.5,
                  mx: 0.5,
                  px: 2,
                  opacity: actionLoading || !userId ? 0.6 : 1,
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                  '&:hover': {
                    backgroundColor: alpha(BRAND_COLOR, 0.06),
                    transform: actionLoading || !userId ? 'none' : 'translateX(4px)',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {actionLoading && pendingAction ? (
                    <CircularProgress size={18} color="inherit" />
                  ) : checkedIn ? (
                    <CheckOutIcon color="error" />
                  ) : (
                    <CheckInIcon color="success" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={
                    actionLoading && pendingAction
                      ? 'Processing...'
                      : checkedIn
                      ? 'Check Out'
                      : 'Check In'
                  }
                  primaryTypographyProps={{
                    fontFamily: BRAND_FONT_FAMILY,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    fontSize: '0.9rem',
                  }}
                />
              </ListItem>
            </>
          )}
        </List>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          zIndex: (muiTheme) => muiTheme.zIndex.drawer + 1,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: BRAND_COLOR,
          color: '#ffffff',
          boxShadow: '0 6px 20px rgba(23, 19, 75, 0.35)',
          minHeight: '64px',
          borderRadius: '0 !important',
        }}
      >
        <Toolbar sx={{ minHeight: '64px' }}>
          {isMobile && (
            <IconButton color="inherit" edge="start" onClick={handleDrawerToggle} sx={{ mr: 2 }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, fontFamily: BRAND_FONT_FAMILY }}>
            {isMobile && (
              <img src="/new_tablecloth.png" alt="HRMS Logo" style={{ height: 24, width: 'auto' }} />
            )}
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontFamily: BRAND_FONT_FAMILY,
                fontWeight: 700,
                letterSpacing: '0.06em',
              }}
            >
              {isMobile ? 'HRMS' : `HRMS - ${user?.name}`}
            </Typography>
          </Box>
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: 1,
              backgroundColor: alpha('#ffffff', 0.16),
              borderRadius: '999px',
              px: 1.5,
              py: 0.75,
              mr: 2,
              color: '#ffffff',
              minWidth: 118,
            }}
          >
            <AccessTime sx={{ fontSize: 18, color: '#ffffff' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              {todayHoursLoading ? (
                <CircularProgress size={14} sx={{ color: '#ffffff' }} />
              ) : (
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontFamily: BRAND_FONT_FAMILY,
                    fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                    {todayHours ?? '0h 00m 00s'}
                </Typography>
              )}
            </Box>
          </Box>
          {!isMobile && (
            <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
              {!checkedIn ? (
                <Button
                  variant="contained"
                  color="success"
                  size="small"
                  startIcon={
                    actionLoading && pendingAction === 'checkin' ? (
                      <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} />
                    ) : (
                      <CheckInIcon />
                    )
                  }
                  onClick={() => handleSimpleAction('checkin')}
                  disabled={actionLoading || !userId}
                  sx={{
                    minWidth: 130,
                    fontFamily: BRAND_FONT_FAMILY,
                    fontWeight: 600,
                    backgroundColor: '#25a244',
                    '&:hover': { backgroundColor: '#1f8a3a' },
                    '&.Mui-disabled': {
                      backgroundColor: '#25a244',
                      color: '#ffffff',
                      opacity: 0.92,
                    },
                  }}
                >
                  {actionLoading && pendingAction === 'checkin' ? 'Processing...' : 'Check In'}
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="error"
                  size="small"
                  startIcon={
                    actionLoading && pendingAction === 'checkout' ? (
                      <CircularProgress size={16} thickness={5} sx={{ color: 'inherit' }} />
                    ) : (
                      <CheckOutIcon />
                    )
                  }
                  onClick={() => handleSimpleAction('checkout')}
                  disabled={actionLoading || !userId}
                  sx={{
                    minWidth: 130,
                    fontFamily: BRAND_FONT_FAMILY,
                    fontWeight: 600,
                    backgroundColor: '#d32f2f',
                    '&:hover': { backgroundColor: '#b71c1c' },
                    '&.Mui-disabled': {
                      backgroundColor: '#d32f2f',
                      color: '#ffffff',
                      opacity: 0.92,
                    },
                  }}
                >
                  {actionLoading && pendingAction === 'checkout' ? 'Processing...' : 'Check Out'}
                </Button>
              )}
            </Box>
          )}
          <IconButton color="inherit" onClick={handleLogout} sx={{ color: '#ffffff' }}>
            <Logout />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': drawerPaperSx,
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          bgcolor: 'background.default',
          minHeight: '100vh',
          width: { xs: '100%', md: `calc(100% - ${drawerWidth}px)` },
          fontFamily: BRAND_FONT_FAMILY,
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
