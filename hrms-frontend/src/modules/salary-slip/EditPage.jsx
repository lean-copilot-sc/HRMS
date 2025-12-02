import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Box, CircularProgress, Container, Typography } from '@mui/material';
import { toast } from 'react-toastify';
import SalarySlipForm from './components/SalarySlipForm';
import { salarySlipService } from '../../services';
import { makeEmptySalarySlipFormValues, mapSalarySlipToFormValues } from './utils';

function EditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [salarySlip, setSalarySlip] = useState(null);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingSlip, setLoadingSlip] = useState(true);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    const loadSalarySlip = async () => {
      try {
        const { data } = await salarySlipService.get(id);
        setSalarySlip(data);
      } catch (err) {
        console.error('Failed to load salary slip', err);
        toast.error('Salary slip not found');
        navigate('/salary-slip');
      } finally {
        setLoadingSlip(false);
      }
    };

    loadSalarySlip();
  }, [id, navigate]);

  const initialValues = useMemo(() => {
    if (!salarySlip) {
      return makeEmptySalarySlipFormValues();
    }
    return mapSalarySlipToFormValues(salarySlip);
  }, [salarySlip]);

  const handleSubmit = async (payload) => {
    setSaving(true);
    try {
      const { data } = await salarySlipService.update(id, payload);
      toast.success('Salary slip updated');
      const slipId = data?.id || data?._id || id;
      navigate(`/salary-slip/${slipId}`);
    } catch (err) {
      console.error('Failed to update salary slip', err);
      const message = err?.response?.data?.error || 'Failed to update salary slip';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const isLoading = loadingEmployees || loadingSlip;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Edit Salary Slip
        </Typography>
      </Box>

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : employees.length === 0 || !salarySlip ? (
        <Typography color="text.secondary">
          Unable to load required data. Please try again later.
        </Typography>
      ) : (
        <SalarySlipForm
          initialValues={initialValues}
          employees={employees}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/salary-slip/${id}`)}
          submitLabel="Update Salary Slip"
          loading={saving}
        />
      )}
    </Container>
  );
}

export default EditPage;
