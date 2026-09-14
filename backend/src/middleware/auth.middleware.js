const jwt = require('jsonwebtoken');

exports.authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ status: 'error', message: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.vendorId = decoded.vendorId;
    next();
  } catch (err) {
    res.status(401).json({ status: 'error', message: 'Invalid token' });
  }
};

exports.isolateVendor = (req, res, next) => {
  const { vendid } = req.params;
  if (req.vendorId !== vendid) {
    return res.status(403).json({ status: 'error', message: 'Access denied' });
  }
  next();
};