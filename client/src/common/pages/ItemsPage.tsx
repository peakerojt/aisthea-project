import React from 'react';
import { RefreshCw, AlertCircle, X, Loader2 } from 'lucide-react';
import { useReorderItems } from '@/common/hooks/useReorderItems';
import { ItemList } from '@/common/components/ItemList';
import { useTranslation } from 'react-i18next';
import '@/pages/common/ItemsPage.css';

export default function ItemsPage() {
  const { t } = useTranslation('pages', { keyPrefix: 'itemsPage' });
  const { items, isLoading, isError, reorderError, isReordering, reorder, clearError } = useReorderItems();

  if (isLoading) {
    return (
      <div className="items-page">
        <header className="items-page__header">
          <h1 className="items-page__title">{t('title')}</h1>
        </header>
        <div className="items-page__skeleton" aria-busy="true" aria-label={t('states.loadingAria')}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.08}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="items-page">
        <div className="items-page__fetch-error" role="alert">
          <AlertCircle size={24} />
          <span>{t('states.loadFailed')}</span>
          <button className="items-page__retry-btn" onClick={() => window.location.reload()}>
            <RefreshCw size={16} /> {t('actions.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="items-page">
      <header className="items-page__header">
        <div>
          <h1 className="items-page__title">{t('title')}</h1>
          <p className="items-page__subtitle">{t('subtitle')}</p>
        </div>

        {isReordering && (
          <span className="items-page__saving" aria-live="polite" aria-label={t('states.savingAria')}>
            <Loader2 size={16} className="spin" /> {t('states.saving')}
          </span>
        )}
      </header>

      {reorderError && (
        <div className="items-page__reorder-error" role="alert">
          <AlertCircle size={16} />
          <span>{reorderError}</span>
          <button className="items-page__dismiss" onClick={clearError} aria-label={t('actions.dismissError')}>
            <X size={14} />
          </button>
        </div>
      )}

      <main className="items-page__body">
        <ItemList items={items} onReorder={reorder} isReordering={isReordering} />
      </main>
    </div>
  );
}
