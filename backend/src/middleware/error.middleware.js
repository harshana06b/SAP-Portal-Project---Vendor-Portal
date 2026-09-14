exports.handleErrors = (err, req, res, next) => {
  console.error(err);

  if (err.response) {
    // SAP error
    const sapError = err.response.data?.error?.message?.value || 'SAP Error';
    return res.status(err.response.status).json({ status: 'error', message: sapError });
  }

  res.status(500).json({ status: 'error', message: 'Internal server error' });
};