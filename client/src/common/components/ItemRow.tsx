import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, ChevronUp, ChevronDown } from 'lucide-react';
import { Item } from '@/common/services/items.service';
import '@/common/styles/components/ItemRow.css';

interface ItemRowProps {
    item: Item;
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
}

export const ItemRow: React.FC<ItemRowProps> = ({ item, index, total, onMoveUp, onMoveDown }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 999 : undefined,
        opacity: isDragging ? 0.55 : 1,
    };

    const isFirst = index === 0;
    const isLast = index === total - 1;

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`item-row ${isDragging ? 'item-row--dragging' : ''}`}
            role="listitem"
        >
            {/* ── Drag handle ───────────────────────────────────────────── */}
            <button
                className="item-row__handle"
                {...attributes}
                {...listeners}
                aria-roledescription="sortable item"
                aria-label={`Kéo để sắp xếp lại ${item.title}`}
                tabIndex={0}
                type="button"
            >
                <GripVertical size={18} />
            </button>

            {/* ── sortOrder badge ───────────────────────────────────────── */}
            <span className="item-row__order">#{item.sortOrder}</span>

            {/* ── Title ────────────────────────────────────────────────── */}
            <span className="item-row__title">{item.title}</span>

            {/* ── Up / Down buttons ─────────────────────────────────────── */}
            <div className="item-row__arrows" role="group" aria-label={`Di chuyển ${item.title}`}>
                <button
                    className="item-row__arrow-btn"
                    onClick={onMoveUp}
                    disabled={isFirst}
                    aria-label={`Di chuyển lên: ${item.title}`}
                    type="button"
                    title="Lên"
                >
                    <ChevronUp size={16} />
                </button>
                <button
                    className="item-row__arrow-btn"
                    onClick={onMoveDown}
                    disabled={isLast}
                    aria-label={`Di chuyển xuống: ${item.title}`}
                    type="button"
                    title="Xuống"
                >
                    <ChevronDown size={16} />
                </button>
            </div>
        </li>
    );
};
