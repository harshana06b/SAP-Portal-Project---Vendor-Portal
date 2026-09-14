const sapService = require('../services/sap.service');

exports.getPurchaseOrders = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/PurchaseOrderSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    res.status(200).json({ status: 'success', data: response.data.d.results });
  } catch (err) { next(err); }
};

exports.getGoodsReceipts = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/GoodsReceiptSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    res.status(200).json({ status: 'success', data: response.data.d.results });
  } catch (err) { next(err); }
};

exports.getRfqs = async (req, res, next) => {
  try {
    const { vendid } = req.params;
    const url = `/RFQSet?$filter=VendorID eq '${vendid}'`;
    const response = await sapService.callSap('get', url);
    res.status(200).json({ status: 'success', data: response.data.d.results });
  } catch (err) { next(err); }
};

exports.getProfile = async (req, res, next) => {
  try {
    const { vendid } = req.params;

    // 🔥 IMPORTANT: Convert padded → original (remove leading zeros)
    const unpaddedId = String(parseInt(vendid, 10));

    console.log('Profile request for:', vendid, 'unpadded:', unpaddedId);

   // const unpaddedId = String(parseInt(vendid, 10));
const url = `/VendorProfileSet('${unpaddedId}')?$format=json`;

    console.log('SAP URL:', url);

    const response = await sapService.callSap('get', url);

    console.log('SAP Response:', JSON.stringify(response.data, null, 2));

    if (response.data && response.data.d) {
      res.status(200).json({
        status: 'success',
        data: response.data.d
      });
    } else {
      res.status(404).json({
        status: 'error',
        message: 'Profile not found'
      });
    }

  } catch (err) {
    console.error('Profile error:', err.message);
    next(err);
  }
};
