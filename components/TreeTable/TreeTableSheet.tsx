import React, { useState, useEffect, useMemo, useRef, useCallback, useImperativeHandle } from 'react';
import { 
  TreeTableSheetProps, 
  TreeTableEvent, 
  TreeTableRef, 
  TreeNode, 
  ColumnConfiguration,
  TreeTableSnapshot 
} from '../../types';
import { buildTree, flattenVisibleTree, findAllDescendants, setByPath, getByPath } from '../../utils/treeHelpers';
import { ChevronRight, ChevronDown, Plus, Download, Upload, Trash2, Columns, RotateCcw } from 'lucide-react';
import clsx from 'clsx';
import { v4 as uuidv4 } from 'uuid';

// Sub-components
import { TreeRow } from './TreeRow';
import { ColumnConfigPanel } from './ColumnConfigPanel';

const TreeTableSheet = React.forwardRef<TreeTableRef, TreeTableSheetProps>((props, ref) => {
  const { 
    data: initialData, 
    columns: initialColumns = [], 
    onEvent, 
    rowKey = 'id',
    mode,
    enableDragAndDrop = true,
    enableDelete = true,
    enableImportExport = true
  } = props;

  // --- State ---
  const [items, setItems] = useState<any[]>(initialData);
  const [columns, setColumns] = useState<ColumnConfiguration[]>(initialColumns);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  
  // Drag State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | null>(null);

  // Sync initial data if it changes significantly (optional based on usage)
  useEffect(() => {
    // In a real app, we might need a deep compare here or just rely on the parent 
    // to not pass new references constantly. For now, we respect the initial load.
    // However, if the parent drives the data, we should sync.
    // For this demo, we'll assume the component manages state optimistically 
    // and this effect is for hard-resets.
    if (initialData.length !== items.length) {
        // Simple heuristic to detect external reset
       setItems(initialData); 
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // --- Derived Data ---
  const tree = useMemo(() => buildTree(items), [items]);
  const visibleRows = useMemo(() => flattenVisibleTree(tree, expandedIds), [tree, expandedIds]);

  // --- Actions ---

  const dispatchEvent = useCallback((type: TreeTableEvent['type'], payload: any) => {
    const event: TreeTableEvent = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      type,
      payload
    };

    onEvent(event);

    // Optimistic Updates
    switch (type) {
      case 'NODE_DATA_UPDATED': {
        const { nodeId, field, newValue } = payload;
        setItems(prev => prev.map(item => {
          if (item[rowKey] === nodeId) {
            return setByPath(item, field, newValue);
          }
          return item;
        }));
        break;
      }
      case 'NODE_MOVED': {
        const { nodeId, newParentId, newIndex } = payload;
        setItems(prev => {
          const movedItem = prev.find(i => i[rowKey] === nodeId);
          if (!movedItem) return prev;
          
          // Remove from old pos
          let rest = prev.filter(i => i[rowKey] !== nodeId);
          
          // Update parent
          const updatedItem = { ...movedItem, parentId: newParentId };
          
          // Insert at new pos
          // This is tricky for a flat list without sorting logic. 
          // We usually just update parentId and rely on a 'sortOrder' field if strict ordering is needed.
          // For this spec, we will append or rely on the buildTree order if we don't have a sort field.
          // If we want to support visual reordering, we need to manipulate the array order of siblings.
          
          // Strategy: Find all siblings of newParent, insert at index.
          const siblings = rest.filter(i => i.parentId === newParentId);
          // Reconstruct array: items before parent's block + siblings before + item + siblings after + rest...
          // This is complex on a flat array. 
          // SIMPLIFICATION: We will just update parentId. Reordering within siblings 
          // requires a 'sortOrder' field which isn't explicitly in the generic T.
          // However, if we assume the array order MATTERS, we can splice.
          
          // Let's implement array splicing for visual consistency.
          const siblingsIndices = rest
            .map((item, idx) => ({ item, idx, isSibling: item.parentId === newParentId }))
            .filter(x => x.isSibling);
          
          if (siblingsIndices.length === 0) {
            // No siblings, just push to end or maintain relative pos
            return [...rest, updatedItem];
          }

          // In a flat list, inserting "at index 2 of siblings" means finding the global index of the 2nd sibling.
          const insertIndex = newIndex >= siblingsIndices.length 
            ? siblingsIndices[siblingsIndices.length - 1].idx + 1
            : siblingsIndices[newIndex].idx;
          
          const newItems = [...rest];
          newItems.splice(insertIndex, 0, updatedItem);
          return newItems;
        });
        break;
      }
      case 'NODE_CREATED': {
        const { nodeId, parentId, initialData } = payload;
        setItems(prev => [...prev, { ...initialData, [rowKey]: nodeId, parentId }]);
        // Auto expand parent
        if (parentId) {
            setExpandedIds(prev => new Set(prev).add(parentId));
        }
        break;
      }
      case 'NODE_DELETED': {
        const { allRemovedNodeIds } = payload;
        setItems(prev => prev.filter(i => !allRemovedNodeIds.includes(i[rowKey])));
        break;
      }
      case 'COLUMN_CONFIG_UPDATED': {
        setColumns(payload.newConfig);
        break;
      }
      case 'IMPORT_COMPLETED': {
        setItems(payload.data);
        if (payload.config) setColumns(payload.config);
        break;
      }
    }
  }, [onEvent, rowKey]);

  // --- Handlers ---

  const handleToggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCellChange = (nodeId: string, field: string, value: any) => {
    const item = items.find(i => i[rowKey] === nodeId);
    const oldValue = item ? getByPath(item, field) : undefined;
    
    dispatchEvent('NODE_DATA_UPDATED', {
      nodeId,
      field,
      oldValue,
      newValue: value
    });
  };

  const handleDelete = (nodeId: string) => {
    const descendants = findAllDescendants(items, nodeId);
    const allRemoved = [nodeId, ...descendants];
    dispatchEvent('NODE_DELETED', {
      targetNodeId: nodeId,
      allRemovedNodeIds: allRemoved
    });
  };

  const handleAddNode = () => {
    const id = uuidv4();
    dispatchEvent('NODE_CREATED', {
      nodeId: id,
      parentId: null,
      initialData: { name: 'New Node' } // Default stub
    });
  };

  const handleAddChild = (parentId: string) => {
    const id = uuidv4();
    dispatchEvent('NODE_CREATED', {
      nodeId: id,
      parentId: parentId,
      initialData: { name: 'New Child' }
    });
    // Ensure parent is expanded so we see the new child
    setExpandedIds(prev => new Set(prev).add(parentId));
  };

  const handleAddSibling = (referenceId: string) => {
    const refNode = items.find(i => i[rowKey] === referenceId);
    if (!refNode) return;
    
    const id = uuidv4();
    dispatchEvent('NODE_CREATED', {
      nodeId: id,
      parentId: refNode.parentId,
      initialData: { name: 'New Sibling' }
    });
  };

  const handleSaveColumns = (newColumns: ColumnConfiguration[]) => {
    dispatchEvent('COLUMN_CONFIG_UPDATED', {
      newConfig: newColumns
    });
  };

  // --- Drag & Drop Handlers ---

  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (!enableDragAndDrop) return;
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    // Firefox requires data to be set
    e.dataTransfer.setData('application/json', JSON.stringify({ id }));
    
    // Create ghost image if needed, or rely on browser default
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    // Check if dragging parent into child (Cycle detection)
    const descendants = findAllDescendants(items, draggedId);
    if (descendants.includes(targetId)) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    // Adjusted Logic: Minimize "Inside" zone to prevent accidental reparenting while sorting.
    // Top 35% = Before
    // Bottom 35% = After
    // Middle 30% = Inside
    if (y < height * 0.35) {
      setDropPosition('before');
      setDropTargetId(targetId);
    } else if (y > height * 0.65) {
      setDropPosition('after');
      setDropTargetId(targetId);
    } else {
      setDropPosition('inside');
      setDropTargetId(targetId);
    }
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDropTargetId(null);
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || !dropPosition) return;
    
    // Calculate new parent and index
    const targetNode = items.find(i => i[rowKey] === targetId);
    const draggedNode = items.find(i => i[rowKey] === draggedId);
    if (!targetNode || !draggedNode) return;

    let newParentId = targetNode.parentId;
    let newIndex = 0; // Simplified. Real calculation requires finding index in siblings.

    if (dropPosition === 'inside') {
      newParentId = targetId;
      // Append to end of children
      const children = items.filter(i => i.parentId === targetId);
      newIndex = children.length;
    } else {
      // Before or After targetId
      // Find siblings
      const siblings = items.filter(i => i.parentId === targetNode.parentId);
      // We need strict sorting to determine index. For now using array index.
      const targetIndex = siblings.findIndex(s => s[rowKey] === targetId);
      newIndex = dropPosition === 'before' ? targetIndex : targetIndex + 1;
    }

    dispatchEvent('NODE_MOVED', {
      nodeId: draggedId,
      oldParentId: draggedNode.parentId,
      newParentId,
      newIndex
    });

    // If dropped inside, expand target
    if (dropPosition === 'inside') {
      setExpandedIds(prev => new Set(prev).add(targetId));
    }

    handleDragEnd();
  };

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({
    getData: () => items,
    getSnapshot: () => ({
      meta: { version: '1.0.0', generatedAt: new Date().toISOString() },
      config: columns,
      data: items
    }),
    openImportDialog: () => alert('Import dialog placeholder'),
    triggerExport: (format) => {
      const dataStr = JSON.stringify({ meta: {}, config: columns, data: items }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    }
  }));

  // --- Render Helpers ---

  // Flatten columns for rendering (handle split columns)
  const renderColumns = useMemo(() => {
    const flat: { 
      config: ColumnConfiguration; 
      subColumn?: { label: string; value: any }; 
      isBulk?: boolean; 
      key: string 
    }[] = [];

    columns.forEach(col => {
      if (col.type === 'multi-select-split' || col.type === 'single-select-split') {
        if (col.enableRowBulkSelect && col.type === 'multi-select-split') {
           flat.push({ config: col, isBulk: true, key: `${col.id}-bulk` });
        }
        col.options?.forEach(opt => {
          flat.push({ config: col, subColumn: opt, key: `${col.id}-${opt.value}` });
        });
      } else {
        flat.push({ config: col, key: col.id });
      }
    });
    return flat;
  }, [columns]);

  return (
    <div className="flex flex-col h-full bg-white border rounded-lg shadow-sm overflow-hidden font-sans relative">
      
      {/* Config Panel Modal */}
      <ColumnConfigPanel 
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
        currentColumns={columns}
        onSave={handleSaveColumns}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b bg-gray-50">
        <div className="flex items-center gap-2">
           <button onClick={handleAddNode} className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors">
             <Plus className="w-4 h-4" /> Add Node
           </button>
           <div className="h-6 w-px bg-gray-300 mx-2" />
           <span className="text-sm text-gray-500 font-medium">
             {items.length} Nodes • {visibleRows.length} Visible
           </span>
        </div>
        
        {enableImportExport && (
          <div className="flex items-center gap-2">
            <button onClick={() => ref && (ref as any).current?.triggerExport('json')} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Export JSON">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => alert("Drag file to window to import (not implemented in demo)")} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Import">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={() => setIsConfigPanelOpen(true)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Columns">
              <Columns className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Main Split View Area */}
      {/* We use a single Grid to maintain row sync perfectly. */}
      {/* Column 1 is sticky tree. Rest are data. */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
            <tr>
              {/* Tree Column Header */}
              <th className="sticky left-0 z-40 bg-gray-50 border-b border-r px-4 py-2 text-left font-semibold text-gray-700 w-80 min-w-[300px] shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                Structure
              </th>
              
              {/* Dynamic Headers */}
              {columns.map(col => {
                // Determine colSpan for split columns
                let span = 1;
                if (col.type === 'multi-select-split' || col.type === 'single-select-split') {
                  span = (col.options?.length || 0) + (col.enableRowBulkSelect ? 1 : 0);
                }

                return (
                  <th 
                    key={col.id} 
                    colSpan={span}
                    className="border-b border-r px-2 py-2 text-center font-semibold text-gray-700 min-w-[100px] group relative"
                  >
                    <div className="flex items-center justify-center gap-1">
                      {col.label}
                      {/* Optional column menu trigger could go here */}
                    </div>
                  </th>
                );
              })}
            </tr>
            {/* Sub-header row for split columns */}
            {renderColumns.some(rc => rc.subColumn || rc.isBulk) && (
              <tr>
                <th className="sticky left-0 z-40 bg-gray-50 border-b border-r shadow-[1px_0_0_0_rgba(0,0,0,0.1)]"></th>
                {renderColumns.map((rc) => (
                  <th key={rc.key} className="border-b border-r px-2 py-1 text-xs text-gray-500 bg-gray-50 font-medium text-center">
                    {rc.isBulk ? 'All' : rc.subColumn?.label || ''}
                  </th>
                ))}
              </tr>
            )}
          </thead>

          <tbody className="bg-white divide-y divide-gray-100">
            {visibleRows.map((row) => (
              <TreeRow
                key={row[rowKey]}
                row={row}
                rowKey={rowKey}
                columns={columns}
                renderColumns={renderColumns}
                level={row.depth || 0}
                isExpanded={expandedIds.has(row[rowKey])}
                onToggleExpand={() => handleToggleExpand(row[rowKey])}
                onCellChange={(field, val) => handleCellChange(row[rowKey], field, val)}
                onDelete={() => handleDelete(row[rowKey])}
                onAddChild={() => handleAddChild(row[rowKey])}
                onAddSibling={() => handleAddSibling(row[rowKey])}
                
                // Drag Props
                isDraggable={enableDragAndDrop && mode === 'edit'}
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                dropPosition={dropPosition}
                onDragStart={(e) => handleDragStart(e, row[rowKey])}
                onDragOver={(e) => handleDragOver(e, row[rowKey])}
                onDrop={(e) => handleDrop(e, row[rowKey])}
                onDragEnd={handleDragEnd}
              />
            ))}
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={renderColumns.length + 1} className="py-10 text-center text-gray-400 italic">
                  No items found. Click "Add Node" to start.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

export default TreeTableSheet;