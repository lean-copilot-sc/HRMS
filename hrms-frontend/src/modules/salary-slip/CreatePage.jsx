import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import SalarySlipForm from './components/SalarySlipForm';
import { salarySlipService } from '../../services';
import { makeEmptySalarySlipFormValues } from './utils';

function CreatePage() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const { data } = await salarySlipService.getEmployeesMeta();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load employees for salary slip', err);
        toast.error('Unable to load employees');
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  const handleSubmit = async (payload) => {
    setSubmitting(true);
    try {
      const { data } = await salarySlipService.create(payload);
      toast.success('Salary slip created');
      const slipId = data?.id || data?._id;
      navigate(slipId ? `/salary-slip/${slipId}` : '/salary-slip');
    } catch (err) {
      console.error('Failed to create salary slip', err);
      const message = err?.response?.data?.error || 'Failed to create salary slip';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Create Salary Slip
        </Typography>
      </Box>

      {loadingEmployees ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : employees.length === 0 ? (
        <Typography color="text.secondary">
          No employees available. Add employees before creating salary slips.
        </Typography>
      ) : (
        <SalarySlipForm
          initialValues={makeEmptySalarySlipFormValues()}
          employees={employees}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/salary-slip')}
          submitLabel="Create Salary Slip"
          loading={submitting}
        />
      )}
    </Container>
  );
}

export default CreatePage;
