type ReturnTextResolver = (
  key: string,
  fallback: string,
  options?: Record<string, unknown>,
) => string;

const LEGACY_EXACT_COPY: Record<string, { key: string; fallback: string }> = {
  'Customer created return request': {
    key: 'timeline.comments.customerCreatedReturnRequest',
    fallback: 'Khách hàng đã gửi yêu cầu trả hàng.',
  },
  'Customer created return request. Awaiting admin review': {
    key: 'timeline.comments.customerCreatedAwaitingAdminReview',
    fallback: 'Khách hàng đã gửi yêu cầu trả hàng. Đang chờ quản trị viên xem xét.',
  },
  'Customer created return request. Awaiting COD payment confirmation': {
    key: 'timeline.comments.customerCreatedAwaitingCodPaymentConfirmation',
    fallback: 'Khách hàng đã gửi yêu cầu trả hàng. Đang chờ xác nhận thanh toán COD.',
  },
  'Return request submitted.': {
    key: 'timeline.comments.returnRequestSubmitted',
    fallback: 'Yêu cầu trả hàng đã được gửi.',
  },
  'Return request approved.': {
    key: 'timeline.comments.returnRequestApproved',
    fallback: 'Yêu cầu trả hàng đã được duyệt.',
  },
  'Return request rejected.': {
    key: 'timeline.comments.returnRequestRejected',
    fallback: 'Yêu cầu trả hàng đã bị từ chối.',
  },
  'Refund confirmed and stock restored.': {
    key: 'timeline.comments.refundConfirmedAndStockRestored',
    fallback: 'Hoàn tiền thành công và nhập lại kho.',
  },
  'Support reviewed evidence': {
    key: 'timeline.comments.supportReviewedEvidence',
    fallback: 'Bộ phận hỗ trợ đã xem xét minh chứng.',
  },
  'Reviewed by admin': {
    key: 'timeline.comments.reviewedByAdmin',
    fallback: 'Quản trị viên đã xem xét yêu cầu.',
  },
  'Approved by support/admin': {
    key: 'timeline.comments.approvedBySupportAdmin',
    fallback: 'Bộ phận hỗ trợ đã duyệt yêu cầu.',
  },
  'Warehouse confirmed return package received and inspection started': {
    key: 'timeline.comments.warehouseConfirmedInspectionStarted',
    fallback: 'Kho đã xác nhận nhận kiện hàng hoàn và bắt đầu kiểm tra.',
  },
  'Return package handed off for transit back to warehouse': {
    key: 'timeline.comments.returnPackageInTransit',
    fallback: 'Kiện hàng hoàn đang được chuyển về kho.',
  },
  'Return accepted for refund after receive and inspection': {
    key: 'timeline.comments.returnAcceptedForRefund',
    fallback: 'Yêu cầu đã được chấp nhận hoàn tiền sau khi nhận và kiểm tra hàng.',
  },
  'COD payment confirmed. Return request moved to admin review.': {
    key: 'timeline.comments.codPaymentConfirmedMovedToAdminReview',
    fallback: 'Đã xác nhận thanh toán COD. Yêu cầu hoàn trả được chuyển sang bước duyệt.',
  },
  'Gateway reconciliation started': {
    key: 'timeline.comments.gatewayReconciliationStarted',
    fallback: 'Đã bắt đầu đối soát cổng thanh toán.',
  },
  'Finance is reconciling the final settled amount.': {
    key: 'timeline.comments.financeReconcilingFinalAmount',
    fallback: 'Bộ phận tài chính đang đối soát số tiền quyết toán cuối cùng.',
  },
  'Finance is reconciling the gateway response': {
    key: 'timeline.comments.financeReconcilingGatewayResponse',
    fallback: 'Bộ phận tài chính đang đối soát phản hồi từ cổng thanh toán.',
  },
  'Finance is reconciling the gateway response.': {
    key: 'timeline.comments.financeReconcilingGatewayResponse',
    fallback: 'Bộ phận tài chính đang đối soát phản hồi từ cổng thanh toán.',
  },
  'Expected refund reduced to item net-paid cap.': {
    key: 'timeline.comments.expectedRefundReducedToNetPaidCap',
    fallback: 'Số tiền hoàn dự kiến đã được giới hạn theo mức thực trả của sản phẩm.',
  },
  'Refund gateway timed out.': {
    key: 'timeline.comments.refundGatewayTimedOut',
    fallback: 'Cổng hoàn tiền phản hồi quá hạn.',
  },
  'Gateway timeout while issuing refund': {
    key: 'timeline.comments.gatewayTimeoutWhileIssuingRefund',
    fallback: 'Cổng thanh toán bị quá hạn khi xử lý hoàn tiền.',
  },
  'Out of policy': {
    key: 'timeline.comments.outOfPolicy',
    fallback: 'Yêu cầu không đáp ứng chính sách hoàn trả.',
  },
  'Cancelled before fulfillment after successful VNPay payment': {
    key: 'timeline.comments.cancelledBeforeFulfillmentAfterSuccessfulVnpayPayment',
    fallback: 'Đơn đã được hủy trước khi xử lý đơn sau khi thanh toán VNPay thành công.',
  },
  'Customer cancelled a paid VNPAY order before fulfillment. Awaiting admin refund review.': {
    key: 'timeline.comments.customerCancelledPaidVnpayBeforeFulfillment',
    fallback: 'Khách hàng đã hủy đơn VNPAY đã thanh toán trước khi xử lý đơn. Đang chờ quản trị viên xem xét hoàn tiền.',
  },
  'Order cancelled by customer; refund request submitted for admin review': {
    key: 'timeline.comments.orderCancelledRefundSubmittedForAdminReview',
    fallback: 'Khách hàng đã hủy đơn. Yêu cầu hoàn tiền đã được tạo để quản trị viên xem xét.',
  },
  'Order cancelled by customer': {
    key: 'timeline.comments.orderCancelledByCustomer',
    fallback: 'Khách hàng đã hủy đơn.',
  },
};

const REFUND_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ hoàn tiền',
  PROCESSING: 'Đang hoàn tiền',
  FAILED: 'Hoàn tiền thất bại',
  MANUAL_REVIEW: 'Cần kiểm tra thủ công',
  REFUNDED: 'Đã hoàn tiền',
  PARTIALLY_REFUNDED: 'Hoàn tiền một phần',
  LOCKED_UNTIL_PAYMENT_CONFIRMED: 'Khóa tới khi xác nhận thanh toán',
  NOT_APPLICABLE: 'Chưa mở hoàn tiền',
};

const formatRefundStatusPath = (status: string) =>
  REFUND_STATUS_LABELS[status.trim()] ?? status.trim();

const REFUND_METHOD_LABELS: Record<string, { key: string; fallback: string }> = {
  BANK_TRANSFER: {
    key: 'detail.refundBankTransfer',
    fallback: 'Chuyển khoản ngân hàng',
  },
  ORIGINAL_GATEWAY: {
    key: 'detail.refundOriginal',
    fallback: 'Hoàn về phương thức gốc',
  },
  STORE_WALLET: {
    key: 'detail.refundWallet',
    fallback: 'Ví điện tử',
  },
};

const formatRefundMethodPath = (method: string, resolveText: ReturnTextResolver) => {
  const normalizedMethod = method.trim().toUpperCase();
  const config = REFUND_METHOD_LABELS[normalizedMethod];
  if (!config) {
    return normalizedMethod;
  }

  return resolveText(config.key, config.fallback);
};

export const translateLegacyReturnCopy = (
  message: string | null | undefined,
  resolveText: ReturnTextResolver,
) => {
  const trimmedMessage = message?.trim();

  if (!trimmedMessage) {
    return null;
  }

  const exactMatch = LEGACY_EXACT_COPY[trimmedMessage];
  if (exactMatch) {
    return resolveText(exactMatch.key, exactMatch.fallback);
  }

  if (trimmedMessage.startsWith('Refunded:')) {
    const note = trimmedMessage.slice('Refunded:'.length).trim();
    return resolveText('timeline.comments.refundedWithNote', 'Đã hoàn tiền: {{note}}', {
      note: note || resolveText('detail.processing', 'Đang xử lý...'),
    });
  }

  if (trimmedMessage.startsWith('Refund status updated:')) {
    const transition = trimmedMessage.slice('Refund status updated:'.length).trim();
    const [fromStatus, toStatus] = transition.split('->').map((part) => part?.trim() ?? '');

    return resolveText(
      'timeline.comments.refundStatusUpdated',
      'Cập nhật trạng thái hoàn tiền: {{from}} -> {{to}}',
      {
        from: formatRefundStatusPath(fromStatus),
        to: formatRefundStatusPath(toStatus),
      },
    );
  }

  if (trimmedMessage.startsWith('Customer selected cancellation reason:')) {
    const reason = trimmedMessage.slice('Customer selected cancellation reason:'.length).trim();
    return resolveText(
      'timeline.comments.customerSelectedCancellationReason',
      'Khách hàng chọn lý do hủy đơn: {{reason}}',
      {
        reason: reason || resolveText('detail.processing', 'Đang xử lý...'),
      },
    );
  }

  if (trimmedMessage.startsWith('Refund completed via')) {
    const matchedRefund = trimmedMessage.match(/^Refund completed via\s+([A-Z_]+)\s+-\s+txn\s+(.+)$/i);
    if (matchedRefund) {
      const [, method, transactionRef] = matchedRefund;
      return resolveText(
        'timeline.comments.refundCompletedViaMethod',
        'Đã hoàn tiền qua {{method}} - mã giao dịch {{transactionRef}}',
        {
          method: formatRefundMethodPath(method, resolveText).toLowerCase(),
          transactionRef: transactionRef.trim(),
        },
      );
    }
  }

  return trimmedMessage;
};
