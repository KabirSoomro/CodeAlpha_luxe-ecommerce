/**
 * Format a number as Pakistani Rupees
 * @param {number} price
 * @returns {string} e.g. "Rs. 1,49,500"
 */
export function formatPKR(price) {
  if (price === null || price === undefined || isNaN(price)) return 'Rs. 0';
  const num = Number(price);
  // Pakistani number formatting (lakh/crore system)
  const formatted = num.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `Rs. ${formatted}`;
}

export default formatPKR;
