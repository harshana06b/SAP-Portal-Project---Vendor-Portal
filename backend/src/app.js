require('dotenv').config();
const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/api.routes');
const { handleErrors } = require('./middleware/error.middleware');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' });
});

// Routes
app.use('/api', apiRoutes);

// Error handling
app.use(handleErrors);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;