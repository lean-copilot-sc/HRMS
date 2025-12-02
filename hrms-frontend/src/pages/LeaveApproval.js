import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Container, 
  Paper, 
  Typography, 
  CircularProgress,
  Alert,
  Box,
  Button
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import api from '../services/api';

export default function LeaveApproval() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const action = searchParams.get('action') === 'reject' ? 'reject' : 'approve';

  useEffect(() => {
    const processLeaveDecision = async () => {
      const token = searchParams.get('token');
      const reasonParam = searchParams.get('reason');

      if (!token) {
        setError('Invalid approval link. Token is missing.');
        setLoading(false);
        return;
      }

      try {
        const basePath = action === 'reject' ? '/leave/reject-email' : '/leave/approve-email';
        const query = new URLSearchParams({ token });
        if (action === 'reject' && reasonParam) {
          query.append('reason', reasonParam);
        }

        const response = await api.get(`${basePath}?${query.toString()}`);
        setResult(response.data);
      } catch (err) {
        const fallbackMessage =
          action === 'reject'
            ? 'Failed to reject leave request. The link may be expired or invalid.'
            : 'Failed to approve leave request. The link may be expired or invalid.';
        setError(err.response?.data?.message || fallbackMessage);
      } finally {
        setLoading(false);
      }
    };

    processLeaveDecision();
  }, [searchParams, action]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <CircularProgress />
          <Typography variant="h6" sx={{ mt: 2 }}>
            {action === 'reject' ? 'Processing your rejection...' : 'Processing your approval...'}
          </Typography>
        </Paper>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm" sx={{ mt: 8 }}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />
          </Box>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
          <Button 
            variant="contained" 
            fullWidth
            onClick={() => navigate('/login')}
          >
            Go to Login
          </Button>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 8 }}>
      <Paper sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          {action === 'reject' ? (
            <ErrorIcon sx={{ fontSize: 60, color: 'warning.main' }} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
          )}
        </Box>
        
        <Alert severity={action === 'reject' ? 'warning' : 'success'} sx={{ mb: 3 }}>
          {result?.message ||
            (action === 'reject'
              ? 'Leave request rejected successfully.'
              : 'Leave request approved successfully!')}
        </Alert>

        {result?.leave && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Leave Details
            </Typography>
            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Employee:</strong> {result.leave.employee_id?.user_id?.name || 'N/A'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Leave Type:</strong> {result.leave.leave_type}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Start Date:</strong> {new Date(result.leave.from_date).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>End Date:</strong> {new Date(result.leave.to_date).toLocaleDateString()}
              </Typography>
              <Typography variant="body2">
                <strong>Status:</strong> {result.leave.status.toUpperCase()}
              </Typography>
            </Box>
          </Box>
        )}

        <Button 
          variant="contained" 
          fullWidth
          onClick={() => navigate('/login')}
        >
          Go to HRMS Portal
        </Button>
      </Paper>
    </Container>
  );
}
