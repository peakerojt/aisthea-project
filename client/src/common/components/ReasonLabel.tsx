import React from 'react';
import { useTranslation } from 'react-i18next';

export function ReasonLabel({ reason }: { reason: string }) {
  const { t } = useTranslation(['returns']);
  const translated = t(`reasons.${reason}`, { defaultValue: reason });
  const label = translated === `reasons.${reason}` ? reason : translated;
  return (
    <span className="font-medium text-gray-800">
      {label}
    </span>
  );
}
