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
  
  // File Input Ref for Import
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Drag State
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | null>(null);

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
          
          let rest = prev.filter(i => i[rowKey] !== nodeId);
          const updatedItem = { ...movedItem, parentId: newParentId };
          const siblings = rest.filter(i => i.parentId === newParentId);
          
          const siblingsIndices = rest
            .map((item, idx) => ({ item, idx, isSibling: item.parentId === newParentId }))
            .filter(x => x.isSibling);
          
          if (siblingsIndices.length === 0) {
            return [...rest, updatedItem];
          }

          const safeIndex = Math.max(0, Math.min(newIndex, siblingsIndices.length));
          const insertIndex = safeIndex >= siblingsIndices.length 
            ? siblingsIndices[siblingsIndices.length - 1].idx + 1
            : siblingsIndices[safeIndex].idx;
          
          const newItems = [...rest];
          newItems.splice(insertIndex, 0, updatedItem);
          return newItems;
        });
        break;
      }
      case 'NODE_CREATED': {
        const { nodeId, parentId, initialData } = payload;
        setItems(prev => [...prev, { ...initialData, [rowKey]: nodeId, parentId }]);
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

  const internalDelete = (nodeId: string) => {
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
      initialData: { name: 'New Node' }
    });
  };

  // --- Imperative Handle ---
  useImperativeHandle(ref, () => ({
    getData: () => items,
    getColumns: () => columns,
    getSnapshot: () => ({
      meta: { version: '1.0.0', generatedAt: new Date().toISOString() },
      config: columns,
      data: items
    }),
    openImportDialog: () => fileInputRef.current?.click(),
    triggerExport: (format) => {
      const dataStr = JSON.stringify({ meta: {}, config: columns, data: items }, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      const link = document.createElement('a');
      link.setAttribute('href', dataUri);
      link.setAttribute('download', `export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    },
    // AI Operations - Nodes
    addNode: (parentId, data) => {
      const id = uuidv4();
      dispatchEvent('NODE_CREATED', { nodeId: id, parentId, initialData: data || { name: 'New Node' } });
    },
    updateNode: (nodeId, field, value) => {
      handleCellChange(nodeId, field, value);
    },
    moveNode: (nodeId, newParentId, newIndex) => {
      const node = items.find(i => i[rowKey] === nodeId);
      if (!node) return;
      dispatchEvent('NODE_MOVED', {
        nodeId,
        oldParentId: node.parentId,
        newParentId,
        newIndex
      });
    },
    deleteNode: (nodeId) => {
      internalDelete(nodeId);
    },
    // AI Operations - Columns
    addColumn: (config) => {
      const newCols = [...columns, { ...config, id: uuidv4() }];
      dispatchEvent('COLUMN_CONFIG_UPDATED', { newConfig: newCols });
    },
    updateColumn: (columnId, config) => {
      const newCols = columns.map(c => c.id === columnId ? { ...c, ...config } : c);
      dispatchEvent('COLUMN_CONFIG_UPDATED', { newConfig: newCols });
    },
    deleteColumn: (columnId) => {
      const newCols = columns.filter(c => c.id !== columnId);
      dispatchEvent('COLUMN_CONFIG_UPDATED', { newConfig: newCols });
    }
  }));

  // --- Render Helpers ---
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
      <input type="file" ref={fileInputRef} onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (re) => {
          try {
            const json = JSON.parse(re.target?.result as string);
            if (json.data && Array.isArray(json.data)) {
                 dispatchEvent('IMPORT_COMPLETED', { data: json.data, config: json.config || columns });
            }
          } catch(err) {}
        };
        reader.readAsText(file);
      }} className="hidden" accept=".json" />

      <ColumnConfigPanel 
        isOpen={isConfigPanelOpen}
        onClose={() => setIsConfigPanelOpen(false)}
        currentColumns={columns}
        onSave={(newCols) => dispatchEvent('COLUMN_CONFIG_UPDATED', { newConfig: newCols })}
      />

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
            <button onClick={() => (ref as any).current?.triggerExport('json')} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Export JSON">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Import JSON">
              <Upload className="w-4 h-4" />
            </button>
            <button onClick={() => setIsConfigPanelOpen(true)} className="p-2 text-gray-600 hover:bg-gray-200 rounded-md" title="Columns">
              <Columns className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto relative">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-gray-50 sticky top-0 z-30 shadow-sm">
            <tr>
              <th className="sticky left-0 z-40 bg-gray-50 border-b border-r px-4 py-2 text-left font-semibold text-gray-700 w-80 min-w-[300px] shadow-[1px_0_0_0_rgba(0,0,0,0.1)]">
                Structure
              </th>
              {columns.map(col => {
                let span = 1;
                if (col.type === 'multi-select-split' || col.type === 'single-select-split') {
                  span = (col.options?.length || 0) + (col.enableRowBulkSelect ? 1 : 0);
                }
                return (
                  <th key={col.id} colSpan={span} className="border-b border-r px-2 py-2 text-center font-semibold text-gray-700 min-w-[100px]">
                    {col.label}
                  </th>
                );
              })}
            </tr>
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
                onDelete={() => internalDelete(row[rowKey])}
                onAddChild={() => {
                   const id = uuidv4();
                   dispatchEvent('NODE_CREATED', { nodeId: id, parentId: row[rowKey], initialData: { name: 'New Child' } });
                }}
                onAddSibling={() => {
                   const id = uuidv4();
                   dispatchEvent('NODE_CREATED', { nodeId: id, parentId: row.parentId, initialData: { name: 'New Sibling' } });
                }}
                isDraggable={enableDragAndDrop && mode === 'edit'}
                draggedId={draggedId}
                dropTargetId={dropTargetId}
                dropPosition={dropPosition}
                onDragStart={(e) => {
                  setDraggedId(row[rowKey]);
                  e.dataTransfer.setData('application/json', JSON.stringify({ id: row[rowKey] }));
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (!draggedId || draggedId === row[rowKey]) return;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const height = rect.height;
                  if (y < height * 0.35) setDropPosition('before');
                  else if (y > height * 0.65) setDropPosition('after');
                  else setDropPosition('inside');
                  setDropTargetId(row[rowKey]);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (!draggedId || !dropPosition) return;
                  let newParentId = row.parentId;
                  let newIndex = 0;
                  if (dropPosition === 'inside') {
                    newParentId = row[rowKey];
                    newIndex = items.filter(i => i.parentId === row[rowKey]).length;
                  } else {
                    const siblings = items.filter(i => i.parentId === row.parentId);
                    const idx = siblings.findIndex(s => s[rowKey] === row[rowKey]);
                    newIndex = dropPosition === 'before' ? idx : idx + 1;
                  }
                  dispatchEvent('NODE_MOVED', { nodeId: draggedId, oldParentId: items.find(i => i[rowKey] === draggedId)?.parentId, newParentId, newIndex });
                  setDraggedId(null); setDropTargetId(null); setDropPosition(null);
                }}
                onDragEnd={() => { setDraggedId(null); setDropTargetId(null); setDropPosition(null); }}
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