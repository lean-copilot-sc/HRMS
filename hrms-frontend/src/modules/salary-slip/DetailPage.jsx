import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Button,
  CircularProgress,
  Container,
  Grid,
  Paper,
  Typography,
} from '@mui/material';
import { toast } from 'react-toastify';
import dayjs from 'dayjs';
import SalarySlipSummaryCard from './components/SalarySlipSummaryCard';
import { salarySlipService } from '../../services';

function DetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [salarySlip, setSalarySlip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const loadSalarySlip = async () => {
      setLoading(true);
      try {
        const { data } = await salarySlipService.get(id);
        setSalarySlip(data);
      } catch (err) {
        console.error('Failed to load salary slip', err);
        toast.error('Salary slip not found');
        navigate('/salary-slip');
      } finally {
        setLoading(false);
      }
    };

    loadSalarySlip();
  }, [id, navigate]);

  const handleDownloadPdf = async () => {
    if (!salarySlip) {
      return;
    }

    setDownloading(true);
    try {
      const response = await salarySlipService.downloadPdf(id);
      const filename = resolveFilenameFromHeaders(
        response.headers,
        buildFallbackFilename(salarySlip),
      );
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/pdf',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to download PDF', err);
      toast.error('Download failed');
    } finally {
      setDownloading(false);
    }
  };

  const handleDelete = async () => {
    if (!salarySlip) {
      return;
    }

    const confirmation = window.confirm('Delete this salary slip? This action cannot be undone.');
    if (!confirmation) {
      return;
    }

    setDeleting(true);
    try {
      await salarySlipService.remove(id);
      toast.success('Salary slip deleted');
      navigate('/salary-slip');
    } catch (err) {
      console.error('Failed to delete salary slip', err);
      toast.error(err?.response?.data?.error || 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (!salarySlip) {
    return null;
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Salary Slip Details
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" onClick={() => navigate('/salary-slip')}>
            Back to List
          </Button>
          <Button variant="contained" color="primary" onClick={() => navigate(`/salary-slip/${id}/edit`)}>
            Edit
          </Button>
          <Button variant="contained" color="secondary" onClick={handleDownloadPdf} disabled={downloading}>
            {downloading ? 'Downloading…' : 'Download PDF'}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </Box>
      </Box>

      <SalarySlipSummaryCard salarySlip={salarySlip} />

      <Paper elevation={2} sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
          Salary Components
        </Typography>
        <Grid container spacing={2}>
          <InfoItem label="Basic Salary" value={salarySlip.basic_salary} />
          <InfoItem label="HRA" value={salarySlip.hra} />
          <InfoItem label="Allowances" value={salarySlip.allowances} />
          <InfoItem label="Overtime" value={salarySlip.overtime_amount} />
          <InfoItem label="Professional Tax" value={salarySlip.professional_tax} />
          <InfoItem label="PF Contribution" value={salarySlip.pf_contribution} />
          <InfoItem label="ESI" value={salarySlip.esi} />
          <InfoItem label="TDS" value={salarySlip.tds} />
          <InfoItem label="Gross Salary" value={salarySlip.gross_salary} highlight />
          <InfoItem label="Total Deductions" value={salarySlip.total_deductions} highlight />
          <InfoItem label="Net Salary" value={salarySlip.net_salary} highlight />
        </Grid>
      </Paper>
    </Container>
  );
}

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;

const resolveFilenameFromHeaders = (headers, fallback) => {
  const disposition = headers?.['content-disposition'];
  if (!disposition) {
    return fallback;
  }

  const utfMatch = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utfMatch && utfMatch[1]) {
    try {
      return decodeURIComponent(utfMatch[1]).trim();
    } catch (err) {
      console.warn('Failed to decode UTF-8 filename', err);
    }
  }

  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (asciiMatch && asciiMatch[1]) {
    return asciiMatch[1].trim();
  }

  return fallback;
};

const buildFallbackFilename = (slip) => {
  const name = (slip.employee_name || 'Employee').replace(/\s+/g, ' ').trim();
  const monthLabel = (slip.month ? dayjs(`${slip.month}-01`) : dayjs()).format('MMM YYYY').toUpperCase();
  return `Pay Slips- ${name} ${monthLabel}.pdf`;
};

function InfoItem({ label, value, highlight = false }) {
  return (
    <Grid item xs={12} sm={6} md={4}>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: highlight ? 600 : 400 }}>
        {currency(value)}
      </Typography>
    </Grid>
  );
}

export default DetailPage;
