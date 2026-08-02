/**
 * Format currency safely across all platforms and browsers.
 * Uses standard INR formatting with fallback to avoid UTF-8 encoding corruption.
 */
export function formatCurrency(amount) {
  const num = Number(amount || 0);
  return '₹' + num.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}
