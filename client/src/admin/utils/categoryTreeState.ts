import type { CategoryNode } from '@/common/services/category.service';

const collectCategoryIds = (nodes: CategoryNode[]): Set<number> => {
    const ids = new Set<number>();

    const walk = (items: CategoryNode[]) => {
        items.forEach((node) => {
            ids.add(node.categoryId);
            if (node.children.length > 0) {
                walk(node.children);
            }
        });
    };

    walk(nodes);
    return ids;
};

export const getDefaultExpandedCategoryIds = (nodes: CategoryNode[]) =>
    new Set(nodes.map((node) => node.categoryId));

export const getRetainedExpandedCategoryIds = (
    previousExpandedIds: Set<number>,
    nodes: CategoryNode[],
) => {
    const validIds = collectCategoryIds(nodes);
    const nextExpandedIds = new Set<number>();

    previousExpandedIds.forEach((categoryId) => {
        if (validIds.has(categoryId)) {
            nextExpandedIds.add(categoryId);
        }
    });

    return nextExpandedIds;
};
