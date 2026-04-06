import { describe, expect, it } from 'vitest';

import {
  getDefaultExpandedCategoryIds,
  getRetainedExpandedCategoryIds,
} from '@/admin/utils/categoryTreeState';
import type { CategoryNode } from '@/common/services/category.service';

const createNode = (
  categoryId: number,
  children: CategoryNode[] = [],
): CategoryNode => ({
  categoryId,
  parentId: null,
  name: `Category ${categoryId}`,
  slug: `category-${categoryId}`,
  description: null,
  imageUrl: null,
  _count: { products: 0 },
  children,
});

describe('categoryTreeState', () => {
  it('expands all root nodes by default on first load', () => {
    const tree = [
      createNode(1, [createNode(11)]),
      createNode(2),
    ];

    expect([...getDefaultExpandedCategoryIds(tree)]).toEqual([1, 2]);
  });

  it('retains only expanded nodes that still exist after refresh', () => {
    const previousExpandedIds = new Set([1, 11, 99]);
    const refreshedTree = [
      createNode(1, [createNode(11), createNode(12)]),
      createNode(2),
    ];

    expect([...getRetainedExpandedCategoryIds(previousExpandedIds, refreshedTree)]).toEqual([1, 11]);
  });

  it('preserves a fully collapsed tree after refresh', () => {
    const refreshedTree = [
      createNode(1, [createNode(11)]),
      createNode(2),
    ];

    expect([...getRetainedExpandedCategoryIds(new Set(), refreshedTree)]).toEqual([]);
  });
});
