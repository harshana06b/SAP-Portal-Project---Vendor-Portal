const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const dashboardController = require('../controllers/dashboard.controller');
const financeController = require('../controllers/finance.controller');
const { authenticate, isolateVendor } = require('../middleware/auth.middleware');

// Auth routes
router.post('/auth/login', authController.login);

// Protected routes
router.use(authenticate);

// Dashboard/MM routes
router.get('/mm/po/:vendid', isolateVendor, dashboardController.getPurchaseOrders);
router.get('/mm/gr/:vendid', isolateVendor, dashboardController.getGoodsReceipts);
router.get('/mm/rfq/:vendid', isolateVendor, dashboardController.getRfqs);
router.get('/vendor/profile/:vendid', isolateVendor, dashboardController.getProfile);

// Finance routes
router.get('/fi/invoices/:vendid', isolateVendor, financeController.getInvoices);
router.get('/fi/pdf/:belnr/:gjahr', financeController.getInvoicePdf);
router.get('/fi/aging/:vendid', isolateVendor, financeController.getPaymentAging);
router.get('/fi/memo/:vendid', isolateVendor, financeController.getCreditDebitMemo);

module.exports = router;
