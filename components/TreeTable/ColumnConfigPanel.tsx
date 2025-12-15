import React, { useState } from 'react';
import { ColumnConfiguration, ColumnType } from '../../types';
import { X, Plus, Trash2, GripVertical, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface ColumnConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentColumns: ColumnConfiguration[];
  onSave: (newColumns: ColumnConfiguration[]) => void;
}

const COLUMN_TYPES: { type: ColumnType; label: string }[] = [
  { type: 'text', label: 'Text' },
  { type: 'multiline-text', label: 'Long Text' },
  { type: 'number', label: 'Number' },
  { type: 'single-select-split', label: 'Single Select (Split)' },
  { type: 'multi-select-split', label: 'Multi Select (Split)' },
];

export const ColumnConfigPanel: React.FC<ColumnConfigPanelProps> = ({
  isOpen,
  onClose,
  currentColumns,
  onSave,
}) => {
  const [columns, setColumns] = useState<ColumnConfiguration[]>(currentColumns);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);

  // Sync state when opening
  React.useEffect(() => {
    if (isOpen) {
      setColumns(JSON.parse(JSON.stringify(currentColumns)));
      setEditingId(null);
      setDraggedColId(null);
    }
  }, [isOpen, currentColumns]);

  if (!isOpen) return null;

  const handleAddColumn = () => {
    const newCol: ColumnConfiguration = {
      id: uuidv4(),
      field: 'new_field_' + Math.floor(Math.random() * 1000),
      label: 'New Column',
      type: 'text',
      width: 150,
    };
    setColumns([...columns, newCol]);
    setEditingId(newCol.id);
  };

  const handleRemoveColumn = (id: string) => {
    setColumns(columns.filter(c => c.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const handleUpdateColumn = (id: string, updates: Partial<ColumnConfiguration>) => {
    setColumns(columns.map(c => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleSave = () => {
    onSave(columns);
    onClose();
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedColId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id); // Firefox requirement
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Allow drop
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedColId || draggedColId === targetId) return;

    const fromIndex = columns.findIndex(c => c.id === draggedColId);
    const toIndex = columns.findIndex(c => c.id === targetId);

    if (fromIndex === -1 || toIndex === -1) return;

    const newColumns = [...columns];
    const [movedCol] = newColumns.splice(fromIndex, 1);
    newColumns.splice(toIndex, 0, movedCol);

    setColumns(newColumns);
    setDraggedColId(null);
  };

  const editingColumn = columns.find(c => c.id === editingId);

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-800">Manage Columns</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 min-h-0">
          
          {/* List Sidebar */}
          <div className="w-1/3 border-r bg-gray-50 flex flex-col">
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {columns.map((col) => (
                <div
                  key={col.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, col.id)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                  onClick={() => setEditingId(col.id)}
                  className={`flex items-center gap-2 p-3 rounded-md cursor-grab active:cursor-grabbing border transition-colors ${
                    editingId === col.id
                      ? 'bg-blue-50 border-blue-200 shadow-sm'
                      : 'bg-white border-gray-200 hover:border-blue-300'
                  } ${draggedColId === col.id ? 'opacity-40' : ''}`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0 pointer-events-none">
                    <div className="font-medium text-sm text-gray-900 truncate">{col.label}</div>
                    <div className="text-xs text-gray-500 truncate font-mono">{col.field}</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveColumn(col.id);
                    }}
                    className="p-1 text-gray-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {columns.length === 0 && (
                <div className="text-center p-4 text-gray-400 text-sm italic">
                  No columns defined.
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-white">
              <button
                onClick={handleAddColumn}
                className="w-full flex items-center justify-center gap-2 bg-white border border-dashed border-gray-300 text-gray-600 hover:border-blue-400 hover:text-blue-600 font-medium py-2 rounded-md transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Column
              </button>
            </div>
          </div>

          {/* Editor Area */}
          <div className="w-2/3 p-6 overflow-y-auto bg-white">
            {editingColumn ? (
              <div className="space-y-6 max-w-lg mx-auto">
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider border-b pb-2 mb-4">
                    Column Settings
                  </h3>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                    <input
                      type="text"
                      value={editingColumn.label}
                      onChange={(e) => handleUpdateColumn(editingColumn.id, { label: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data Field Key <span className="text-gray-400 text-xs font-normal">(path in JSON object)</span>
                    </label>
                    <input
                      type="text"
                      value={editingColumn.field}
                      onChange={(e) => handleUpdateColumn(editingColumn.id, { field: e.target.value })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-white text-gray-900"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select
                      value={editingColumn.type}
                      onChange={(e) => handleUpdateColumn(editingColumn.id, { type: e.target.value as ColumnType })}
                      className="w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                    >
                      {COLUMN_TYPES.map(t => (
                        <option key={t.type} value={t.type}>{t.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Conditional Options Editor for Split Types */}
                {(editingColumn.type === 'single-select-split' || editingColumn.type === 'multi-select-split') && (
                  <div className="pt-4 border-t">
                    <div className="flex items-center justify-between mb-2">
                       <h4 className="text-sm font-semibold text-gray-900">Options</h4>
                       <button 
                         onClick={() => {
                           const newOpts = [...(editingColumn.options || [])];
                           newOpts.push({ label: 'New Option', value: 'value_' + Date.now() });
                           handleUpdateColumn(editingColumn.id, { options: newOpts });
                         }}
                         className="text-xs text-blue-600 hover:underline font-medium"
                       >
                         + Add Option
                       </button>
                    </div>
                    
                    <div className="space-y-2 bg-gray-50 p-3 rounded-md border">
                       {(editingColumn.options || []).length === 0 && (
                         <div className="text-xs text-gray-400 text-center py-2">No options defined.</div>
                       )}
                       {editingColumn.options?.map((opt, idx) => (
                         <div key={idx} className="flex gap-2">
                            <input 
                              placeholder="Label"
                              value={opt.label}
                              onChange={(e) => {
                                const newOpts = [...(editingColumn.options || [])];
                                newOpts[idx] = { ...newOpts[idx], label: e.target.value };
                                handleUpdateColumn(editingColumn.id, { options: newOpts });
                              }}
                              className="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 bg-white text-gray-900"
                            />
                            <input 
                              placeholder="Value"
                              value={opt.value}
                              onChange={(e) => {
                                const newOpts = [...(editingColumn.options || [])];
                                newOpts[idx] = { ...newOpts[idx], value: e.target.value };
                                handleUpdateColumn(editingColumn.id, { options: newOpts });
                              }}
                              className="flex-1 px-2 py-1 text-sm border rounded focus:ring-1 focus:ring-blue-500 font-mono bg-white text-gray-900"
                            />
                            <button 
                              onClick={() => {
                                const newOpts = editingColumn.options?.filter((_, i) => i !== idx);
                                handleUpdateColumn(editingColumn.id, { options: newOpts });
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                            >
                              <X className="w-4 h-4" />
                            </button>
                         </div>
                       ))}
                    </div>

                    {editingColumn.type === 'multi-select-split' && (
                       <div className="mt-3 flex items-center gap-2">
                         <input 
                           type="checkbox"
                           id="bulkSelect"
                           checked={editingColumn.enableRowBulkSelect || false}
                           onChange={(e) => handleUpdateColumn(editingColumn.id, { enableRowBulkSelect: e.target.checked })}
                           className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 bg-white"
                         />
                         <label htmlFor="bulkSelect" className="text-sm text-gray-700">Enable "Select All" column</label>
                       </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <p>Select a column to edit details</p>
                <p className="text-sm">or create a new one</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border rounded-md shadow-sm hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-sm flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};