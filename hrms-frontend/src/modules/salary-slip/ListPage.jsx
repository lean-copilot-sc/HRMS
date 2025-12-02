import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  RemoveRedEye as ViewIcon,
  Print as PdfIcon,
  UploadFile as ExportIcon,
} from '@mui/icons-material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import TableLoadingState from '../../components/ui/TableLoadingState';
import { salarySlipService } from '../../services';

const currentMonth = dayjs().format('YYYY-MM');

function ListPage() {
  const navigate = useNavigate();
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [salarySlips, setSalarySlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const paginatedData = useMemo(
    () => salarySlips.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage),
    [salarySlips, page, rowsPerPage],
  );

  useEffect(() => {
    fetchSalarySlips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthFilter]);

  useEffect(() => {
    setPage(0);
  }, [monthFilter]);

  const fetchSalarySlips = async () => {
    setLoading(true);
    try {
      const params = monthFilter ? { month: monthFilter } : {};
      const { data } = await salarySlipService.list(params);
      setSalarySlips(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load salary slips', err);
      toast.error('Failed to load salary slips');
      setSalarySlips([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this salary slip? This action cannot be undone.')) {
      return;
    }

    try {
      await salarySlipService.remove(id);
      toast.success('Salary slip deleted');
      fetchSalarySlips();
    } catch (err) {
      console.error('Failed to delete salary slip', err);
      toast.error(err.response?.data?.error || 'Failed to delete salary slip');
    }
  };

  const buildFallbackFilename = (slip) => {
    const name = (slip.employee_name || 'Employee').replace(/\s+/g, ' ').trim();
    const monthLabel = (slip.month ? dayjs(`${slip.month}-01`) : dayjs()).format('MMM YYYY').toUpperCase();
    return `Pay Slips- ${name} ${monthLabel}.pdf`;
  };

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

  const handleDownloadPdf = async (slip) => {
    try {
      const response = await salarySlipService.downloadPdf(slip.id || slip._id);
      const filename = resolveFilenameFromHeaders(response.headers, buildFallbackFilename(slip));
      const blob = new Blob([response.data], {
        type: response.headers?.['content-type'] || 'application/pdf',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = filename;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to download salary slip PDF', err);
      toast.error('Download failed');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await salarySlipService.exportExcel(monthFilter ? { month: monthFilter } : {});
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `salary-slips-${monthFilter || 'all'}.xlsx`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error('Failed to export salary slips', err);
      toast.error('Export failed');
    }
  };

  const handleChangePage = (_event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Container maxWidth={false} disableGutters sx={{ px: { xs: 2, sm: 3 } }}>
      <Box
        sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Salary Slips
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
          <TextField
            size="small"
            type="month"
            label="Month"
            InputLabelProps={{ shrink: true }}
            value={monthFilter}
            onChange={(event) => setMonthFilter(event.target.value)}
          />
          <Button
            variant="outlined"
            startIcon={<ExportIcon />}
            onClick={handleExportExcel}
          >
            Export Excel
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => navigate('/salary-slip/create')}
          >
            Create Salary Slip
          </Button>
        </Box>
      </Box>

      <Paper elevation={2} sx={{ overflowX: 'auto' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'grey.200' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Employee</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Department</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Month</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Net Salary</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableLoadingState
                loading={loading}
                hasData={salarySlips.length > 0}
                colSpan={5}
                emptyMessage="No salary slips found"
              />
              {!loading && paginatedData.length > 0 && paginatedData.map((slip) => (
                <TableRow key={slip.id || slip._id}>
                  <TableCell>{slip.employee_name}</TableCell>
                  <TableCell>{slip.department}</TableCell>
                  <TableCell>{slip.month}</TableCell>
                  <TableCell>₹{Number(slip.net_salary || 0).toFixed(2)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="View Details">
                      <IconButton color="primary" onClick={() => navigate(`/salary-slip/${slip.id || slip._id}`)}>
                        <ViewIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Download PDF">
                      <IconButton color="primary" onClick={() => handleDownloadPdf(slip)}>
                        <PdfIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <IconButton color="secondary" onClick={() => navigate(`/salary-slip/${slip.id || slip._id}/edit`)}>
                        <EditIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton color="error" onClick={() => handleDelete(slip.id || slip._id)}>
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={salarySlips.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Container>
  );
}

export default ListPage;
