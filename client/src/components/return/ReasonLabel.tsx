import React from 'react';
import { useTranslation } from 'react-i18next';

export function ReasonLabel({ reason }: { reason: string }) {
  const { t } = useTranslation(['returns']);
  const translated = t(`reason.${reason}`, { defaultValue: reason });
  return (
    <span className="font-medium text-gray-800">
      {translated}
    </span>
  );
}
