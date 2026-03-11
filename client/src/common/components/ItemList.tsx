import React from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    KeyboardSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Item } from '@/common/services/items.service';
import { ItemRow } from '@/common/components/ItemRow';

interface ItemListProps {
    items: Item[];
    onReorder: (itemId: number, fromIndex: number, toIndex: number) => void;
    isReordering?: boolean;
}

export const ItemList: React.FC<ItemListProps> = ({ items, onReorder, isReordering }) => {
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const fromIndex = items.findIndex((it) => it.id === active.id);
        const toIndex = items.findIndex((it) => it.id === over.id);
        if (fromIndex === -1 || toIndex === -1) return;

        onReorder(active.id as number, fromIndex, toIndex);
    };

    if (items.length === 0) {
        return (
            <div className="items-empty" role="status">
                <span>Danh sách trống.</span>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
                <ul
                    className={`items-list ${isReordering ? 'items-list--saving' : ''}`}
                    role="list"
                    aria-label="Danh sách có thể sắp xếp"
                    aria-busy={isReordering}
                >
                    {items.map((item, index) => (
                        <ItemRow
                            key={item.id}
                            item={item}
                            index={index}
                            total={items.length}
                            onMoveUp={() => onReorder(item.id, index, index - 1)}
                            onMoveDown={() => onReorder(item.id, index, index + 1)}
                        />
                    ))}
                </ul>
            </SortableContext>
        </DndContext>
    );
};
