import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ReasonLabel } from '@/common/components/ReasonLabel';

describe('ReasonLabel', () => {
  beforeEach(() => {
    cleanup();
  });

  it('falls back to the raw reason instead of exposing the translation key', () => {
    render(<ReasonLabel reason="DEFECTIVE" />);

    expect(screen.getByText('DEFECTIVE')).toBeInTheDocument();
    expect(screen.queryByText('reasons.DEFECTIVE')).not.toBeInTheDocument();
  });
});
