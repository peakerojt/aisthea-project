import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReviewModal } from '@/common/components/ReviewModal';

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();

  return {
    ...actual,
    useTranslation: () => ({
      t: (key: string) => key,
    }),
  };
});

vi.mock('@/common/services/review.service', () => ({
  createReview: vi.fn(),
}));

describe('ReviewModal', () => {
  it('renders translated review-modal chrome', () => {
    const queryClient = new QueryClient();

    render(
      <QueryClientProvider client={queryClient}>
        <ReviewModal
          open
          onClose={vi.fn()}
          orderId="10"
          item={{
            orderItemId: 1,
            productId: '11',
            productName: 'Ao thun',
            variant: 'Do / M',
            quantity: 1,
            price: 199000,
            subtotal: 199000,
            thumbnail: null,
          } as any}
        />
      </QueryClientProvider>,
    );

    expect(screen.getByText('Đánh giá sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Đánh giá của bạn')).toBeInTheDocument();
    expect(screen.getByText('Nhận xét')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Chia sẻ cảm nhận của bạn về sản phẩm...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1 sao' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gửi đánh giá' })).toBeDisabled();
  });
});
