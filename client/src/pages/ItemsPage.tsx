import React from 'react';
import { RefreshCw, AlertCircle, X, Loader2 } from 'lucide-react';
import { useReorderItems } from '../hooks/useReorderItems';
import { ItemList } from '../components/items/ItemList';
import './ItemsPage.css';

/**
 * ItemsPage — full-page demo for the Reorder feature.
 *
 * States handled:
 *  - Loading skeleton
 *  - Fetch error  (retry button)
 *  - Reorder error (dismissible banner)
 *  - Saving indicator (spinner in header)
 *  - Empty list
 */
export default function ItemsPage() {
    const {
        items,
        isLoading,
        isError,
        reorderError,
        isReordering,
        reorder,
        clearError,
    } = useReorderItems();

    /* ── Loading ──────────────────────────────────────────────────────────────── */
    if (isLoading) {
        return (
            <div className="items-page">
                <header className="items-page__header">
                    <h1 className="items-page__title">Item List</h1>
                </header>
                <div className="items-page__skeleton" aria-busy="true" aria-label="Loading items">
                    {[...Array(5)].map((_, i) => (
                        <div key={i} className="skeleton-row" style={{ animationDelay: `${i * 0.08}s` }} />
                    ))}
                </div>
            </div>
        );
    }

    /* ── Fetch Error ──────────────────────────────────────────────────────────── */
    if (isError) {
        return (
            <div className="items-page">
                <div className="items-page__fetch-error" role="alert">
                    <AlertCircle size={24} />
                    <span>Failed to load items. Please try again.</span>
                    <button
                        className="items-page__retry-btn"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw size={16} /> Retry
                    </button>
                </div>
            </div>
        );
    }

    /* ── Main ─────────────────────────────────────────────────────────────────── */
    return (
        <div className="items-page">
            <header className="items-page__header">
                <div>
                    <h1 className="items-page__title">Item List</h1>
                    <p className="items-page__subtitle">
                        Drag &amp; drop or use the keyboard (Space → Arrow keys → Space) to reorder.
                    </p>
                </div>

                {isReordering && (
                    <span className="items-page__saving" aria-live="polite" aria-label="Saving order">
                        <Loader2 size={16} className="spin" /> Saving…
                    </span>
                )}
            </header>

            {/* Reorder error banner */}
            {reorderError && (
                <div className="items-page__reorder-error" role="alert">
                    <AlertCircle size={16} />
                    <span>{reorderError}</span>
                    <button
                        className="items-page__dismiss"
                        onClick={clearError}
                        aria-label="Dismiss error"
                    >
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
