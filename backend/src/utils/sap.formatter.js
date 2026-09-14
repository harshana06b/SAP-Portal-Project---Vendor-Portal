// Padded for SAP (10 digits), Trimmed for User
const padVendorId = (id) => id.toString().padStart(10, '0');
const trimVendorId = (id) => id.toString().replace(/^0+/, '');
const condense = (value) => value?.toString().replace(/\s+/g, ' ').trim() ?? ''; //trim whitespace
// Aging = Billing Date - Due Date
const calculateAging = (billingDate, dueDate) => {
  const bill = new Date(billingDate);
  const due = new Date(dueDate);
  const diffTime = due - bill;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

module.exports = { padVendorId, trimVendorId, condense, calculateAging };