import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';
import { ReturnDetail } from '@/store/pages/ReturnDetail';

/**
 * Wrapper cho react-router: /orders/:id/return
 * Dùng để bridge giữa URL-based routing và SPA setView pattern.
 */
export const CreateReturnPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const orderId = Number(id);
    const hasValidOrderId = Number.isFinite(orderId) && orderId > 0;

    const [returnId, setReturnId] = useState(0);
    const [view, setView] = useState<'create' | 'detail'>('create');

    useEffect(() => {
        if (!hasValidOrderId) {
            navigate('/my-orders', { replace: true });
        }
    }, [hasValidOrderId, navigate]);

    const handleSuccess = (rid?: number) => {
        if (rid) {
            setReturnId(rid);
            setView('detail');
        } else {
            navigate('/my-orders');
        }
    };

    const handleBackToOrders = () => {
        navigate('/my-orders');
    };

    if (!hasValidOrderId) {
        return null;
    }

    if (view === 'detail' && returnId > 0) {
        return (
            <ReturnDetail
                returnId={returnId}
                onBack={() => navigate(-1)}
            />
        );
    }

    return (
        <CreateReturnRequest
            orderIdForReturn={orderId}
            onSuccess={handleSuccess}
            onBackToOrders={handleBackToOrders}
        />
    );
};
