export const formatINR = (n) =>
  '₹' +
  Number(n).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });