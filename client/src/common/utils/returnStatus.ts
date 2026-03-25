export const normalizeReturnStatus = (status?: string | null) => {
  const normalized = (status ?? '')
    .trim()
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

  if (!normalized) return 'REQUESTED';
  if (normalized === 'PENDING_APPROVAL' || normalized === 'REQUESTED') return 'REQUESTED';
  if (normalized === 'APPROVED') return 'APPROVED';
  if (normalized === 'REJECTED') return 'REJECTED';
  if (normalized === 'RECEIVED') return 'RECEIVED';
  if (normalized === 'COMPLETED' || normalized === 'REFUNDED') return 'REFUNDED';
  return normalized;
};
