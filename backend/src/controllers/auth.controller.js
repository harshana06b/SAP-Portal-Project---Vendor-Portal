const jwt = require('jsonwebtoken');
const sapService = require('../services/sap.service');
const { condense, padVendorId } = require('../utils/sap.formatter');

exports.login = async (req, res, next) => {
  try {
    const rawVendorId = condense(req.body.vendorId); 
    const { password } = req.body;
    const paddedId = padVendorId(rawVendorId);
    console.log('Login attempt for vendorId:', rawVendorId, 'paddedId:', paddedId);
    // Call SAP VendorLoginSet with filter - use original vendorId as SAP stores it unpadded
    const url = `/VendorLoginSet?$filter=VendorID eq '${rawVendorId}' and Password eq '${password}'&$format=json`;
    console.log('SAP URL:', url);
    const response = await sapService.callSap('get', url);
    console.log('SAP Response:', JSON.stringify(response.data, null, 2));
    // SAP returns results array
    if (response.data.d.results && response.data.d.results.length > 0 && response.data.d.results[0].Status === 'SUCCESS') {
      console.log('Login successful for vendorId:', rawVendorId);
      const token = jwt.sign({ vendorId: paddedId }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ status: 'success', token, vendorId: paddedId });
    } else {
      console.log('Login failed: Invalid credentials or no results');
      res.status(401).json({ status: 'error', message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('Login error:', err.message);
    next(err);
  }
};
