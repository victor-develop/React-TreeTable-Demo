import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, GripVertical, Trash2, Folder, File } from 'lucide-react';
import { ColumnConfiguration, TreeNode } from '../../types';
import clsx from 'clsx';
import { TreeCell } from './TreeCell';

interface TreeRowProps {
  row: TreeNode;
  rowKey: string;
  columns: ColumnConfiguration[];
  renderColumns: any[];
  level: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onCellChange: (field: string, value: any) => void;
  onDelete: () => void;

  isDraggable: boolean;
  draggedId: string | null;
  dropTargetId: string | null;
  dropPosition: 'before' | 'inside' | 'after' | null;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export const TreeRow: React.FC<TreeRowProps> = ({
  row,
  rowKey,
  renderColumns,
  level,
  isExpanded,
  onToggleExpand,
  onCellChange,
  onDelete,
  isDraggable,
  draggedId,
  dropTargetId,
  dropPosition,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd
}) => {
  const isTarget = dropTargetId === row[rowKey];
  const isDragged = draggedId === row[rowKey];
  const hasChildren = row.children && row.children.length > 0;

  // Local state for Name input to prevent excessive events
  const [localName, setLocalName] = useState(row.name || '');

  useEffect(() => {
    setLocalName(row.name || '');
  }, [row.name]);

  const handleNameBlur = () => {
    if (localName !== (row.name || '')) {
      onCellChange('name', localName);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  // Visual feedback for Drop
  const borderClass = isTarget
    ? dropPosition === 'before'
      ? 'border-t-2 border-t-blue-500'
      : dropPosition === 'after'
      ? 'border-b-2 border-b-blue-500'
      : 'bg-blue-50 ring-2 ring-inset ring-blue-300'
    : 'border-transparent';

  return (
    <tr 
      className={clsx(
        "group hover:bg-gray-50 transition-colors relative",
        isDragged && "opacity-50 grayscale",
        borderClass
      )}
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Sticky Tree Column */}
      <td 
        className="sticky left-0 z-20 bg-white group-hover:bg-gray-50 border-r border-b px-2 py-2 shadow-[1px_0_0_0_rgba(0,0,0,0.1)] whitespace-nowrap"
      >
        <div 
          className="flex items-center gap-1"
          style={{ paddingLeft: `${level * 20}px` }}
        >
          {/* Drag Handle */}
          {isDraggable && (
             <span className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 p-0.5">
               <GripVertical className="w-4 h-4" />
             </span>
          )}

          {/* Expander */}
          <button 
            onClick={onToggleExpand}
            className={clsx(
              "p-0.5 rounded hover:bg-gray-200 text-gray-500 transition-transform",
              !hasChildren && "opacity-0 pointer-events-none"
            )}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Icon based on children */}
          <span className="text-gray-400">
             {hasChildren ? <Folder className="w-4 h-4 text-blue-300" /> : <File className="w-4 h-4" />}
          </span>

          {/* Name/Label Input */}
          <input 
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            onBlur={handleNameBlur}
            onKeyDown={handleNameKeyDown}
            className="ml-1 bg-transparent border-none focus:ring-1 focus:ring-blue-500 rounded px-1 text-sm font-medium text-gray-700 w-full min-w-[120px]"
          />

          {/* Actions */}
          <button onClick={onDelete} className="ml-auto opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 p-1">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>

      {/* Dynamic Data Cells */}
      {renderColumns.map((rc) => (
        <TreeCell 
          key={rc.key}
          row={row}
          column={rc.config}
          subColumn={rc.subColumn}
          isBulk={rc.isBulk}
          onChange={onCellChange}
        />
      ))}
    </tr>
  );
};