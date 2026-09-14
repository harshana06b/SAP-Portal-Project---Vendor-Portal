const sapService = require('../services/sap.service');
const { calculateAging } = require('../utils/sap.formatter');

exports.getInvoices = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/InvoiceSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    
    const results = response.data.d.results.map(inv => ({
      ...inv,
      Aging: calculateAging(inv.InvoiceDate, inv.DueDate)
    }));

    res.status(200).json({ status: 'success', data: results });
  } catch (err) { next(err); }
};

exports.getInvoicePdf = async (req, res, next) => {
  try {
    const { belnr, gjahr } = req.params;
    const url = `/InvoicePdfSet(InvoiceNumber='${belnr}',FiscalYear='${gjahr}')/$value`;
    const response = await sapService.callSap('get', url, null, true);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.send(Buffer.from(response.data, 'binary'));
  } catch (err) { next(err); }
};

exports.getPaymentAging = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/PaymentAgingSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    res.status(200).json({ status: 'success', data: response.data.d.results });
  } catch (err) { next(err); }
};

exports.getCreditDebitMemo = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/CreditDebitMemoSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    res.status(200).json({ status: 'success', data: response.data.d.results });
  } catch (err) { next(err); }
};
