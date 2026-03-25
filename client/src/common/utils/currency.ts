const toNumericValue = (value: number | string): number => {
  const numericValue = typeof value === 'string' ? Number.parseFloat(value) : value;
  return Number.isFinite(numericValue) ? numericValue : 0;
};

export const formatCurrencyVND = (value: number | string): string =>
  `${toNumericValue(value).toLocaleString('vi-VN')} đ`;

export const formatCurrencyFullVND = (value: number | string): string =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(toNumericValue(value));
