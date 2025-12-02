import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Chip,
  Divider,
  Grid,
  Typography,
} from '@mui/material';

const currency = (value) => `₹${Number(value || 0).toFixed(2)}`;

function SalarySlipSummaryCard({ salarySlip }) {
  return (
    <Card elevation={3} sx={{ mb: 3 }}>
      <CardContent>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
          Salary Slip — {salarySlip.month}
        </Typography>

        <Grid container spacing={2}>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Employee
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {salarySlip.employee_name}
            </Typography>
            <Typography variant="body2">{salarySlip.designation}</Typography>
            <Chip label={salarySlip.department} size="small" color="primary" sx={{ mt: 1 }} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Bank Details
            </Typography>
            <Typography variant="body2">Account: {salarySlip.bank_account_no}</Typography>
            <Typography variant="body2">IFSC: {salarySlip.ifsc_code}</Typography>
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" color="text.secondary">
              Net Salary
            </Typography>
            <Typography variant="h6" color="primary" sx={{ fontWeight: 700 }}>
              {currency(salarySlip.net_salary)}
            </Typography>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Earnings
            </Typography>
            <SummaryLine label="Basic Salary" value={salarySlip.basic_salary} />
            <SummaryLine label="HRA" value={salarySlip.hra} />
            <SummaryLine label="Allowances" value={salarySlip.allowances} />
            <SummaryLine label="Overtime" value={salarySlip.overtime_amount} />
            <SummaryLine label="Gross Salary" value={salarySlip.gross_salary} highlight />
          </Grid>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Deductions
            </Typography>
            <SummaryLine label="Professional Tax" value={salarySlip.professional_tax} />
            <SummaryLine label="PF Contribution" value={salarySlip.pf_contribution} />
            <SummaryLine label="ESI" value={salarySlip.esi} />
            <SummaryLine label="TDS" value={salarySlip.tds} />
            <SummaryLine label="Total Deductions" value={salarySlip.total_deductions} highlight />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

function SummaryLine({ label, value, highlight = false }) {
  return (
    <Grid container justifyContent="space-between" sx={{ py: 0.5 }}>
      <Grid item>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body2" sx={{ fontWeight: highlight ? 600 : 400 }}>
          {currency(value)}
        </Typography>
      </Grid>
    </Grid>
  );
}

SummaryLine.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  highlight: PropTypes.bool,
};

SalarySlipSummaryCard.propTypes = {
  salarySlip: PropTypes.shape({
    month: PropTypes.string.isRequired,
    employee_name: PropTypes.string.isRequired,
    designation: PropTypes.string,
    department: PropTypes.string,
    bank_account_no: PropTypes.string,
    ifsc_code: PropTypes.string,
    basic_salary: PropTypes.number,
    hra: PropTypes.number,
    allowances: PropTypes.number,
    overtime_amount: PropTypes.number,
    gross_salary: PropTypes.number,
    professional_tax: PropTypes.number,
    pf_contribution: PropTypes.number,
    esi: PropTypes.number,
    tds: PropTypes.number,
    total_deductions: PropTypes.number,
    net_salary: PropTypes.number,
  }).isRequired,
};

export default SalarySlipSummaryCard;
