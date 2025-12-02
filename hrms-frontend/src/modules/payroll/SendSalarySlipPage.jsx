import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import dayjs from 'dayjs';
import { toast } from 'react-toastify';
import { salarySlipService, payrollService } from '../../services';

const MAX_MONTH_SELECTION = 6;
const MONTH_FORMAT = 'YYYY-MM';

const buildMonthOptions = () => {
  const months = [];
  const start = dayjs();
  for (let offset = 0; offset < 18; offset += 1) {
    const value = start.subtract(offset, 'month');
    months.push({
      value: value.format(MONTH_FORMAT),
      label: value.format('MMMM YYYY'),
    });
  }
  return months;
};

function SendSalarySlipPage() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [sending, setSending] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [results, setResults] = useState(null);

  const monthOptions = useMemo(buildMonthOptions, []);
  const employeeOptions = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        label: `${employee.name} ${employee.designation ? `(${employee.designation})` : ''}`.trim(),
      })),
    [employees],
  );

  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      try {
        const { data } = await salarySlipService.getEmployeesMeta();
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load employees', err);
        toast.error('Unable to load employees for salary slips');
        setEmployees([]);
      } finally {
        setLoadingEmployees(false);
      }
    };

    loadEmployees();
  }, []);

  const handleSelectAllEmployees = () => {
    setSelectedEmployees(employeeOptions);
  };

  const handleClearEmployees = () => {
    setSelectedEmployees([]);
  };

  const handleMonthsChange = (_event, newValue) => {
    if (newValue.length > MAX_MONTH_SELECTION) {
      toast.warn(`You can select up to ${MAX_MONTH_SELECTION} months`);
      return;
    }
    setSelectedMonths(newValue);
  };

  const handleOpenConfirmation = () => {
    if (selectedEmployees.length === 0) {
      toast.warning('Select at least one employee');
      return;
    }
    if (selectedMonths.length === 0) {
      toast.warning('Select at least one month');
      return;
    }
    setConfirmationOpen(true);
  };

  const handleSend = async () => {
    setSending(true);
    setResults(null);
    try {
      const payload = {
        employeeIds: selectedEmployees.map((employee) => employee.id),
        months: selectedMonths.map((month) => month.value),
      };

      const { data } = await payrollService.sendSalarySlips(payload);
      setResults(data);
      toast.success('Salary slips dispatched');
      setConfirmationOpen(false);
    } catch (err) {
      console.error('Failed to send salary slips', err);
      const message = err?.response?.data?.error || 'Failed to send salary slips';
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const totalCombinations = selectedEmployees.length * selectedMonths.length;

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          Send Salary Slips
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Employees</Typography>
                <Stack direction="row" spacing={1}>
                  <Button size="small" onClick={handleSelectAllEmployees} disabled={loadingEmployees || employeeOptions.length === 0}>
                    Select All
                  </Button>
                  <Button size="small" onClick={handleClearEmployees} disabled={selectedEmployees.length === 0}>
                    Clear
                  </Button>
                </Stack>
              </Box>
              {loadingEmployees ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
                  <CircularProgress size={28} />
                </Box>
              ) : (
                <Autocomplete
                  multiple
                  disableCloseOnSelect
                  options={employeeOptions}
                  value={selectedEmployees}
                  onChange={(_event, newValue) => setSelectedEmployees(newValue)}
                  getOptionLabel={(option) => option.label || option.name || ''}
                  renderOption={(props, option, { selected }) => (
                    <li {...props}>
                      <Checkbox style={{ marginRight: 8 }} checked={selected} />
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {option.name}
                        </Typography>
                        {option.designation && (
                          <Typography variant="caption" color="text.secondary">
                            {option.designation} • {option.department || 'General'}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => <TextField {...params} label="Select employees" placeholder="Search employee" />}
                  sx={{ mb: 1 }}
                />
              )}
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedEmployees.length} employee(s)
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Months (max {MAX_MONTH_SELECTION})
              </Typography>
              <Autocomplete
                multiple
                disableCloseOnSelect
                options={monthOptions}
                value={selectedMonths}
                getOptionLabel={(option) => option.label}
                onChange={handleMonthsChange}
                renderOption={(props, option, { selected }) => (
                  <li {...props}>
                    <Checkbox style={{ marginRight: 8 }} checked={selected} />
                    {option.label}
                  </li>
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => <Chip label={option.label} {...getTagProps({ index })} key={option.value} />)
                }
                renderInput={(params) => <TextField {...params} label="Select months" placeholder="Month" />}
              />
              <Typography variant="caption" color="text.secondary">
                Selected: {selectedMonths.length} month(s)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card elevation={1} sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <SummaryStat label="Employees" value={selectedEmployees.length} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <SummaryStat label="Months" value={selectedMonths.length} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <SummaryStat label="Total PDFs" value={totalCombinations} />
            </Grid>
          </Grid>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Button variant="outlined" onClick={() => setResults(null)} disabled={!results}>
              Reset Results
            </Button>
            <Button
              variant="contained"
              onClick={handleOpenConfirmation}
              disabled={selectedEmployees.length === 0 || selectedMonths.length === 0 || sending}
              startIcon={sending ? <CircularProgress size={18} /> : null}
            >
              {sending ? 'Preparing…' : 'Send Salary Slips'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {results && (
        <Box sx={{ mt: 3 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {`Total Employees: ${results.summary.totalEmployees} | Sent: ${results.summary.sent} | Partial: ${results.summary.partial} | Failed: ${results.summary.failed}`}
          </Alert>
          <Card elevation={1}>
            <CardContent>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Detailed Results
              </Typography>
              <List dense>
                {results.results.map((item) => (
                  <ListItem key={item.employeeId} sx={{ py: 0.5 }}>
                    <ListItemText
                      primary={`${resolveEmployeeName(item.employeeId, employees)} — ${item.status.toUpperCase()}`}
                      secondary={item.reason || (item.monthsSent ? item.monthsSent.join(', ') : null)}
                    />
                  </ListItem>
                ))}
              </List>
              {results.missingData?.length > 0 && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  Some salary slips could not be found:
                  <List dense>
                    {results.missingData.map((missing, index) => (
                      <ListItem key={`${missing.employeeId}-${missing.month || index}`} sx={{ py: 0.25 }}>
                        <ListItemText
                          primary={resolveMissingLabel(missing, employees)}
                          secondary={missing.reason}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Alert>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      <Dialog open={confirmationOpen} onClose={() => setConfirmationOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Send salary slips?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {`This will email ${selectedMonths.length} month(s) of salary slips to ${selectedEmployees.length} employee(s).`}
          </Typography>
          <Typography variant="subtitle2">Employees</Typography>
          <List dense>
            {selectedEmployees.map((employee) => (
              <ListItem key={employee.id} sx={{ py: 0.25 }}>
                <ListItemText primary={employee.name} secondary={employee.designation} />
              </ListItem>
            ))}
          </List>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>Months</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
            {selectedMonths.map((month) => (
              <Chip label={month.label} key={month.value} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmationOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            onClick={handleSend}
            variant="contained"
            disabled={sending}
            startIcon={sending ? <CircularProgress size={18} /> : null}
          >
            {sending ? 'Sending…' : 'Send Now'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function SummaryStat({ label, value }) {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
      <Typography variant="subtitle2" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}

const resolveEmployeeName = (employeeId, employees) => {
  const match = employees.find((employee) => employee.id === employeeId);
  return match ? match.name : employeeId;
};

const resolveMissingLabel = (missing, employees) => {
  const employeeName = resolveEmployeeName(missing.employeeId, employees);
  return missing.month ? `${employeeName} — ${dayjs(`${missing.month}-01`).format('MMMM YYYY')}` : employeeName;
};

export default SendSalarySlipPage;
