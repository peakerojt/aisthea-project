import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';
import { ReturnDetail } from '@/store/pages/ReturnDetail';
import { returnOrderReadService } from '@/common/services/return.order-read.service';
import {
    RETURN_SUMMARY_CHANGED_EVENT,
    type ReturnSummaryChangedDetail,
} from '@/common/events/returnSummary.events';

/**
 * Wrapper cho react-router: /orders/:id/return
 * Dùng để bridge giữa URL-based routing và SPA setView pattern.
 */
export const CreateReturnPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation('returns', { keyPrefix: 'create' });
    const orderId = Number(id);
    const hasValidOrderId = Number.isFinite(orderId) && orderId > 0;

    const [returnId, setReturnId] = useState(0);
    const [view, setView] = useState<'create' | 'detail'>('create');
    const { data: existingReturn, isLoading: isLoadingExistingReturn, refetch: refetchExistingReturn } = useQuery({
        queryKey: ['order-return-existing', orderId],
        queryFn: () => returnOrderReadService.getForOrder(orderId),
        enabled: hasValidOrderId,
        retry: false,
    });

    useEffect(() => {
        if (!hasValidOrderId) {
            navigate('/my-orders', { replace: true });
        }
    }, [hasValidOrderId, navigate]);

    useEffect(() => {
        if (existingReturn?.returnId) {
            setReturnId(existingReturn.returnId);
            setView('detail');
        }
    }, [existingReturn]);

    useEffect(() => {
        const handleReturnSummaryChanged = (event: Event) => {
            const detail = (event as CustomEvent<ReturnSummaryChangedDetail>).detail;
            const matchesOrder = typeof detail?.orderId === 'number' && detail.orderId === orderId;
            const matchesReturn = typeof detail?.returnRequestId === 'number' && detail.returnRequestId === returnId;

            if (!matchesOrder && !matchesReturn) {
                return;
            }

            void refetchExistingReturn();
        };

        window.addEventListener(
            RETURN_SUMMARY_CHANGED_EVENT,
            handleReturnSummaryChanged as EventListener,
        );

        return () => {
            window.removeEventListener(
                RETURN_SUMMARY_CHANGED_EVENT,
                handleReturnSummaryChanged as EventListener,
            );
        };
    }, [orderId, refetchExistingReturn, returnId]);

    const handleSuccess = (rid?: number) => {
        if (rid) {
            setReturnId(rid);
            setView('detail');
        } else {
            navigate('/my-orders');
        }
    };

    const handleExistingReturn = (rid: number) => {
        setReturnId(rid);
        setView('detail');
    };

    const handleBackToOrders = () => {
        navigate('/my-orders');
    };

    if (!hasValidOrderId) {
        return null;
    }

    if (isLoadingExistingReturn) {
        return (
            <div className="p-6">
                <div className="rounded-sm border border-white/10 bg-white/5 p-6 text-white/70">
                    {t('loadingOrder')}
                </div>
            </div>
        );
    }

    if (view === 'detail' && returnId > 0) {
        return (
            <ReturnDetail
                returnId={returnId}
                onBack={() => navigate('/my-orders')}
            />
        );
    }

    return (
        <CreateReturnRequest
            orderIdForReturn={orderId}
            onSuccess={handleSuccess}
            onExistingReturn={handleExistingReturn}
            onBackToOrders={handleBackToOrders}
        />
    );
};
