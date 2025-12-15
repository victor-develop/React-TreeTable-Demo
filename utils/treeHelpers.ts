import { TreeNode } from '../types';

/**
 * Converts a flat list of items (with id/parentId) into a nested tree structure.
 */
export const buildTree = (items: any[], rootId: string | null = null): TreeNode[] => {
  const itemMap = new Map<string, TreeNode>();
  
  // Clone and initialize
  items.forEach(item => {
    itemMap.set(item.id, { ...item, children: [] });
  });

  const roots: TreeNode[] = [];

  itemMap.forEach(node => {
    if (node.parentId === rootId) {
      roots.push(node);
    } else {
      const parent = itemMap.get(node.parentId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(node);
      } else {
        // Orphaned nodes or root nodes if rootId is null
        if (rootId === null) roots.push(node);
      }
    }
  });

  return roots;
};

/**
 * Flattens a nested tree into a list of visible rows based on expansion state.
 */
export const flattenVisibleTree = (
  nodes: TreeNode[], 
  expandedIds: Set<string>, 
  depth = 0, 
  result: TreeNode[] = []
): TreeNode[] => {
  for (const node of nodes) {
    const nodeWithDepth = { ...node, depth };
    result.push(nodeWithDepth);
    
    if (expandedIds.has(node.id) && node.children && node.children.length > 0) {
      flattenVisibleTree(node.children, expandedIds, depth + 1, result);
    }
  }
  return result;
};

/**
 * Find all descendant IDs for a given node ID (used for cascading delete).
 */
export const findAllDescendants = (items: any[], targetId: string): string[] => {
  const children = items.filter(i => i.parentId === targetId);
  let descendants = children.map(c => c.id);
  
  children.forEach(child => {
    descendants = [...descendants, ...findAllDescendants(items, child.id)];
  });
  
  return descendants;
};

/**
 * Access nested property by string path (e.g., "attributes.status")
 */
export const getByPath = (obj: any, path: string) => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

/**
 * Set nested property by string path, returning a new object (immutable-ish)
 */
export const setByPath = (obj: any, path: string, value: any) => {
  const parts = path.split('.');
  const newObj = { ...obj };
  let current = newObj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = { ...current[parts[i]] };
    current = current[parts[i]];
  }
  
  current[parts[parts.length - 1]] = value;
  return newObj;
};
