import { describe, expect, it } from 'vitest';

import {
  canonicalizeWorkflowStatusFallback,
  normalizeReturnStatus,
  normalizeWorkflowStatusValue,
  resolveWorkflowStatus,
} from '@/common/utils/returnStatus';

describe('normalizeReturnStatus', () => {
  it('normalizes legacy aliases into canonical statuses', () => {
    expect(normalizeReturnStatus('PENDING_APPROVAL')).toBe('REQUESTED');
    expect(normalizeReturnStatus('COMPLETED')).toBe('REFUNDED');
  });

  it('normalizes casing and spacing for known statuses', () => {
    expect(normalizeReturnStatus(' pending approval ')).toBe('REQUESTED');
    expect(normalizeReturnStatus('completed')).toBe('REFUNDED');
    expect(normalizeReturnStatus('reCeived')).toBe('RECEIVED');
    expect(normalizeReturnStatus('return requested')).toBe('REQUESTED');
  });

  it('maps Phase 5 return workflow statuses into stable UI buckets', () => {
    expect(normalizeReturnStatus('SUBMITTED')).toBe('REQUESTED');
    expect(normalizeReturnStatus('PENDING_PAYMENT_CONFIRMATION')).toBe('REQUESTED');
    expect(normalizeReturnStatus('PENDING_ADMIN_REVIEW')).toBe('REQUESTED');
    expect(normalizeReturnStatus('IN_RETURN_TRANSIT')).toBe('APPROVED');
    expect(normalizeReturnStatus('RECEIVED_AND_INSPECTING')).toBe('RECEIVED');
    expect(normalizeReturnStatus('ACCEPTED_FOR_REFUND')).toBe('RECEIVED');
    expect(normalizeReturnStatus('CLOSED')).toBe('REFUNDED');
  });
});

describe('normalizeWorkflowStatusValue', () => {
  it('normalizes casing and delimiters for workflow values', () => {
    expect(normalizeWorkflowStatusValue(' pending approval ')).toBe('PENDING_APPROVAL');
    expect(normalizeWorkflowStatusValue('received-and-inspecting')).toBe('RECEIVED_AND_INSPECTING');
  });
});

describe('canonicalizeWorkflowStatusFallback', () => {
  it('maps legacy fallback statuses into Phase 5 workflow vocabulary', () => {
    expect(canonicalizeWorkflowStatusFallback('PENDING_APPROVAL')).toBe('PENDING_ADMIN_REVIEW');
    expect(canonicalizeWorkflowStatusFallback('completed')).toBe('CLOSED');
    expect(canonicalizeWorkflowStatusFallback('ACCEPTED_FOR_REFUND')).toBe('ACCEPTED_FOR_REFUND');
  });
});

describe('resolveWorkflowStatus', () => {
  it('prefers explicit workflowStatus and otherwise canonicalizes legacy fallbacks', () => {
    expect(resolveWorkflowStatus('closed', 'COMPLETED')).toBe('CLOSED');
    expect(resolveWorkflowStatus('PENDING_APPROVAL', 'REQUESTED')).toBe('PENDING_ADMIN_REVIEW');
    expect(resolveWorkflowStatus(undefined, 'PENDING_APPROVAL')).toBe('PENDING_ADMIN_REVIEW');
    expect(resolveWorkflowStatus(null, 'completed')).toBe('CLOSED');
  });
});
