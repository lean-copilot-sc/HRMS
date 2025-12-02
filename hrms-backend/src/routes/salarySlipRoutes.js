const express = require('express');
const router = express.Router();
const salarySlipController = require('../controllers/salarySlipController');

const wrap = (handler) => async (req, res, next) => {
  try {
    const result = await handler({
      body: req.body,
      params: req.params,
      query: req.query,
      context: req.user || {},
    });

    if (result && typeof result === 'object' && Buffer.isBuffer(result.buffer)) {
      const isPdfRequest = req.path.endsWith('/pdf');
      const filename =
        result.filename ||
        (isPdfRequest ? `salary-slip-${req.params.id}.pdf` : `salary-slips-${req.query.month || 'all'}.xlsx`);

      res.setHeader(
        'Content-Type',
        result.contentType
          || (isPdfRequest
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'),
      );
      res.setHeader('Content-Disposition', `${isPdfRequest ? 'inline' : 'attachment'}; filename="${filename}"`);
      res.send(result.buffer);
      return;
    }

    if (Buffer.isBuffer(result)) {
      res.setHeader(
        'Content-Type',
        req.headers['x-export-type'] === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      );
      res.send(result);
      return;
    } else {
      res.json(result);
    }
  } catch (error) {
    next(error);
  }
};

router.post('/', wrap(salarySlipController.createSalarySlip));
router.get('/', wrap(salarySlipController.listSalarySlips));
router.get('/employees', wrap(salarySlipController.listEmployeesForSalarySlip));
router.get('/export', wrap(salarySlipController.exportSalarySlips));
router.get('/:id', wrap(salarySlipController.getSalarySlip));
router.put('/:id', wrap(salarySlipController.updateSalarySlip));
router.delete('/:id', wrap(salarySlipController.deleteSalarySlip));
router.get('/:id/pdf', wrap(salarySlipController.getSalarySlipPdf));

module.exports = router;
