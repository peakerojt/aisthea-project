import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreateReturnRequest } from '@/store/pages/CreateReturnRequest';
import { ReturnDetail } from '@/store/pages/ReturnDetail';
import { ViewState } from '@/types';

/**
 * Wrapper cho react-router: /orders/:id/return
 * Dùng để bridge giữa URL-based routing và SPA setView pattern.
 */
export const CreateReturnPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const orderId = Number(id);

    const [returnId, setReturnId] = useState(0);
    const [view, setView] = useState<'create' | 'detail'>('create');

    const handleSetView = (v: ViewState) => {
        if (v === 'STORE_MY_RETURNS') {
            navigate(-1);
        } else if (v === 'STORE_RETURN_DETAIL') {
            setView('detail');
        } else {
            navigate(-1);
        }
    };

    const handleSetReturnId = (rid: number) => {
        setReturnId(rid);
        setView('detail');
    };

    if (view === 'detail' && returnId > 0) {
        return (
            <ReturnDetail
                returnId={returnId}
                setView={handleSetView}
            />
        );
    }

    return (
        <CreateReturnRequest
            setView={handleSetView}
            orderIdForReturn={orderId}
            setReturnId={handleSetReturnId}
        />
    );
};
