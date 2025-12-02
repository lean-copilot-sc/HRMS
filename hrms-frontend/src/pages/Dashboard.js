import { useState, useEffect } from 'react';
import { Container, Typography, Grid, Paper, Box } from '@mui/material';
import { People, AccessTime, EventNote, Business } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

export default function Dashboard() {
  const { user } = useAuth();
  const isEmployee = user?.role === 'employee';
  const initialStats = isEmployee
    ? [{ title: 'Pending Leaves', value: '0', icon: <EventNote fontSize="large" />, color: '#ed6c02' }]
    : [
        { title: 'Total Employees', value: '0', icon: <People fontSize="large" />, color: '#1976d2' },
        { title: 'Today Attendance', value: '0', icon: <AccessTime fontSize="large" />, color: '#2e7d32' },
        { title: 'Pending Leaves', value: '0', icon: <EventNote fontSize="large" />, color: '#ed6c02' },
        { title: 'Departments', value: '0', icon: <Business fontSize="large" />, color: '#9c27b0' },
      ];
  const [stats, setStats] = useState(initialStats);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await api.get('/dashboard/stats');
        const data = response.data;
        const updatedStats = isEmployee
          ? [
              {
                title: 'Pending Leaves',
                value: data.pendingLeaves || '0',
                icon: <EventNote fontSize="large" />,
                color: '#ed6c02',
              },
            ]
          : [
              { title: 'Total Employees', value: data.totalEmployees || '0', icon: <People fontSize="large" />, color: '#1976d2' },
              { title: 'Today Attendance', value: data.todayAttendance || '0', icon: <AccessTime fontSize="large" />, color: '#2e7d32' },
              { title: 'Pending Leaves', value: data.pendingLeaves || '0', icon: <EventNote fontSize="large" />, color: '#ed6c02' },
              { title: 'Departments', value: data.totalDepartments || '0', icon: <Business fontSize="large" />, color: '#9c27b0' },
            ];

        setStats(updatedStats);
      } catch (err) {
        console.error('Failed to fetch dashboard stats', err);
      }
    };

    fetchStats();
  }, [isEmployee]);

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
      <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
        Welcome, {user?.name}!
      </Typography>
      <Typography variant="body1" color="text.secondary" gutterBottom sx={{ mb: { xs: 3, sm: 4 } }}>
        Role: {user?.role?.toUpperCase()}
      </Typography>

      <Grid container spacing={{ xs: 2, sm: 3 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={isEmployee ? 12 : 6} md={isEmployee ? 4 : 3} key={index}>
            <Paper elevation={2} sx={{ p: { xs: 2, sm: 3 }, textAlign: 'center' }}>
              <Box sx={{ color: stat.color, mb: 1 }}>
                {stat.icon}
              </Box>
              <Typography variant="h4" gutterBottom sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>
                {stat.value}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.title}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}
