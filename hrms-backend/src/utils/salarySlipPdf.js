const PDFDocument = require('pdfkit');

const currency = (value) => {
  const number = Number(value || 0);
  return `₹${number.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const parseMonth = (month) => {
  if (!month || typeof month !== 'string') {
    return new Date();
  }
  const [year, monthIndex] = month.split('-').map(Number);
  return new Date(year || 1970, (monthIndex || 1) - 1, 1);
};

const formatMonthLabel = (month) => {
  const date = parseMonth(month);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

const formatMonthLabelShort = (month) => {
  const date = parseMonth(month);
  return date.toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
};

const sanitizeName = (value) => {
  if (!value) return 'Employee';
  return String(value).replace(/\s+/g, ' ').trim();
};

const deriveEmployeeCode = (employee = {}, fallbackId) => {
  if (!employee) return fallbackId ? fallbackId.toString().slice(-6).toUpperCase() : 'EMP';
  return (
    employee.employee_code ||
    employee.employeeCode ||
    employee.code ||
    (employee._id ? employee._id.toString().slice(-6).toUpperCase() : null) ||
    (fallbackId ? fallbackId.toString().slice(-6).toUpperCase() : 'EMP')
  );
};

const getSalarySlipFilename = (salarySlip, employee = {}) => {
  const employeeName = sanitizeName(
    employee.user_id?.name || employee.name || salarySlip.employee_name || 'Employee',
  );
  const monthLabel = formatMonthLabelShort(salarySlip.month);
  return `Pay Slips- ${employeeName} ${monthLabel}.pdf`;
};

const buildSalarySlipPdf = (salarySlip, employee = {}) =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 36 });
    const chunks = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const margin = 32;
    const width = doc.page.width - margin * 2;
    const contentStartY = margin + 70;
    const monthLabel = formatMonthLabel(salarySlip.month);
    const employeeName = sanitizeName(
      employee.user_id?.name || employee.name || salarySlip.employee_name,
    );
    const employeeCode = deriveEmployeeCode(employee, salarySlip.employee_id);
    const designation = salarySlip.designation || employee.designation || employee.position || 'Employee';
    const department = salarySlip.department || employee.department_id?.name || 'General';
    const bankAccount = salarySlip.bank_account_no || employee.bank_account_no || 'N/A';
    const ifsc = salarySlip.ifsc_code || employee.ifsc_code || 'N/A';

    // Border
    doc.lineWidth(0.6).strokeColor('#d7dbe4');
    doc.roundedRect(margin, margin, width, doc.page.height - margin * 2, 8).stroke();

    // Header band
    doc.save();
    doc.roundedRect(margin, margin, width, 66, 8).fill('#1f3b70');
    doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold');
    doc.text('PAY SLIP', margin + 20, margin + 18, { align: 'left' });
    doc.fontSize(11).font('Helvetica').text(`Pay Period: ${monthLabel}`, margin + 20, margin + 40);

    doc.font('Helvetica-Bold').fontSize(14).text('ACME HRMS PRIVATE LIMITED', margin + width - 240, margin + 18, {
      width: 220,
      align: 'right',
    });
    doc.font('Helvetica').fontSize(9).text('Corporate Office: 123 Business Park, Mumbai 400001', margin + width - 240, margin + 38, {
      width: 220,
      align: 'right',
    });
    doc.restore();

    // Summary blocks
    const summaryY = contentStartY;
    const summaryWidth = (width - 40) / 3;
    const summaryData = [
      { label: 'GROSS PAY', value: currency(salarySlip.gross_salary), color: '#3758a6' },
      { label: 'TOTAL DEDUCTIONS', value: currency(salarySlip.total_deductions), color: '#e67e22' },
      { label: 'NET PAY', value: currency(salarySlip.net_salary), color: '#2c7a36' },
    ];

    summaryData.forEach((item, index) => {
      const boxX = margin + 20 + index * (summaryWidth + 10);
      doc
        .lineWidth(0.5)
        .strokeColor('#e3e7f0')
        .fillColor('#f6f8fc')
        .roundedRect(boxX, summaryY, summaryWidth, 70, 6)
        .fillAndStroke();

      doc
        .fillColor(item.color)
        .fontSize(10)
        .font('Helvetica-Bold')
        .text(item.label, boxX + 14, summaryY + 12);

      doc
        .fillColor('#121212')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(item.value, boxX + 14, summaryY + 32);
    });

    let cursorY = summaryY + 90;

    // Employee Information
    doc
      .fillColor('#1f3b70')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Employee Information', margin + 20, cursorY);

    cursorY += 8;
    doc.moveTo(margin + 20, cursorY + 12).lineTo(margin + width - 20, cursorY + 12).stroke('#e3e7f0');

    cursorY += 24;
    const infoRows = [
      ['Employee Name', employeeName],
      ['Employee Code', employeeCode],
      ['Designation', designation],
      ['Department', department],
      ['Bank Account', bankAccount],
      ['IFSC Code', ifsc],
    ];

    const columnWidth = (width - 60) / 2;
    const rowHeight = 24;

    for (let i = 0; i < infoRows.length; i += 2) {
      const left = infoRows[i];
      const right = infoRows[i + 1];
      const rowY = cursorY + (i / 2) * rowHeight;

      drawInfoItem(doc, left, margin + 20, rowY, columnWidth);
      if (right) {
        drawInfoItem(doc, right, margin + 40 + columnWidth, rowY, columnWidth);
      }
    }

    cursorY += Math.ceil(infoRows.length / 2) * rowHeight + 30;

    // Earnings and Deductions tables
    doc
      .fillColor('#1f3b70')
      .fontSize(12)
      .font('Helvetica-Bold')
      .text('Earnings & Deductions', margin + 20, cursorY);

    cursorY += 8;
    doc.moveTo(margin + 20, cursorY + 12).lineTo(margin + width - 20, cursorY + 12).stroke('#e3e7f0');
    cursorY += 24;

    const tableWidth = (width - 60) / 2;
    const earningsRows = [
      ['Basic Pay', salarySlip.basic_salary],
      ['House Rent Allowance', salarySlip.hra],
      ['Other Allowances', salarySlip.allowances],
      ['Overtime', salarySlip.overtime_amount],
    ];

    const deductionsRows = [
      ['Professional Tax', salarySlip.professional_tax],
      ['Provident Fund', salarySlip.pf_contribution],
      ['Employee State Insurance', salarySlip.esi],
      ['TDS', salarySlip.tds],
    ];

    drawAmountTable(doc, {
      x: margin + 20,
      y: cursorY,
      width: tableWidth,
      header: 'Earnings',
      rows: earningsRows,
      footer: ['Gross Pay', salarySlip.gross_salary],
    });

    drawAmountTable(doc, {
      x: margin + 40 + tableWidth,
      y: cursorY,
      width: tableWidth,
      header: 'Deductions',
      rows: deductionsRows,
      footer: ['Total Deductions', salarySlip.total_deductions],
    });

    const tablesHeight = Math.max(earningsRows.length, deductionsRows.length) * 28 + 56;
    cursorY += tablesHeight + 30;

    // Net Pay section
    doc
      .lineWidth(0.8)
      .strokeColor('#2c7a36')
      .fillColor('#f6fff6')
      .roundedRect(margin + 20, cursorY, width - 40, 60, 6)
      .fillAndStroke();

    doc
      .fillColor('#2c7a36')
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('Net Salary (in words)', margin + 40, cursorY + 14);

    doc
      .fillColor('#121212')
      .font('Helvetica')
      .fontSize(10)
      .text(numberToWordsIndian(salarySlip.net_salary), margin + 40, cursorY + 32, {
        width: width - 80,
      });

    cursorY += 90;

    doc
      .font('Helvetica-Oblique')
      .fontSize(9)
      .fillColor('#5c6c7c')
      .text(
        'This is a system-generated payslip and does not require a physical signature.',
        margin + 20,
        cursorY,
      );

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#121212')
      .text('Authorised Signatory', margin + width - 180, cursorY + 40, { align: 'right' });

    doc.end();
  });

const drawInfoItem = (doc, [label, value], x, y, width) => {
  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#4a5a6a')
    .text(label, x, y);
  doc
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#121212')
    .text(String(value ?? '-'), x, y + 12, { width, ellipsis: true });
};

const drawAmountTable = (doc, { x, y, width, header, rows, footer }) => {
  const rowHeight = 28;
  doc
    .lineWidth(0.6)
    .strokeColor('#d7dbe4')
    .fillColor('#f0f3f9')
    .roundedRect(x, y, width, rowHeight, 4)
    .fillAndStroke();

  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#1f3b70')
    .text(header, x + 12, y + 8);

  rows.forEach(([label, amount], index) => {
    const rowY = y + rowHeight + index * rowHeight;
    doc
      .fillColor(index % 2 === 0 ? '#ffffff' : '#f8f9fb')
      .rect(x, rowY, width, rowHeight)
      .fill();

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#2f3b47')
      .text(label, x + 12, rowY + 9, { width: width - 80 });

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#121212')
      .text(currency(amount), x + width - 72, rowY + 9, { width: 60, align: 'right' });
  });

  const footerY = y + (rows.length + 1) * rowHeight;
  doc
    .fillColor('#1f3b70')
    .rect(x, footerY, width, rowHeight)
    .fill();

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#ffffff')
    .text(footer[0], x + 12, footerY + 9);

  doc
    .font('Helvetica-Bold')
    .fontSize(10)
    .fillColor('#ffffff')
    .text(currency(footer[1]), x + width - 72, footerY + 9, { width: 60, align: 'right' });
};

const numberToWordsIndian = (amount) => {
  const numericValue = Math.abs(Number(amount) || 0);
  const rupees = Math.floor(numericValue);
  const paise = Math.round((numericValue - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = [
    'Ten',
    'Eleven',
    'Twelve',
    'Thirteen',
    'Fourteen',
    'Fifteen',
    'Sixteen',
    'Seventeen',
    'Eighteen',
    'Nineteen',
  ];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const toWordsUnderThousand = (num) => {
    let words = '';
    if (num > 99) {
      words += `${units[Math.floor(num / 100)]} Hundred `;
      num %= 100;
    }
    if (num > 19) {
      words += `${tens[Math.floor(num / 10)]} `;
      num %= 10;
    }
    if (num > 9) {
      words += `${teens[num - 10]} `;
    } else if (num > 0) {
      words += `${units[num]} `;
    }
    return words.trim();
  };

  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const hundred = Math.floor((rupees % 1000) / 100);
  const remainder = rupees % 100;

  let words = '';
  if (crore) words += `${toWordsUnderThousand(crore)} Crore `;
  if (lakh) words += `${toWordsUnderThousand(lakh)} Lakh `;
  if (thousand) words += `${toWordsUnderThousand(thousand)} Thousand `;
  if (hundred) words += `${units[hundred]} Hundred `;
  if (remainder) words += `${toWordsUnderThousand(remainder)} `;

  const rupeeWords = words.trim();
  const paiseWords = paise ? toWordsUnderThousand(paise) : '';

  if (rupeeWords && paiseWords) {
    return `${rupeeWords} Rupees and ${paiseWords} Paise only`;
  }
  if (rupeeWords) {
    return `${rupeeWords} Rupees only`;
  }
  return `${paiseWords} Paise only`;
};

module.exports = {
  buildSalarySlipPdf,
  deriveEmployeeCode,
  getSalarySlipFilename,
  formatMonthLabel,
};
