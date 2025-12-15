import React, { useState, useEffect } from 'react';
import { ColumnConfiguration } from '../../types';
import { getByPath } from '../../utils/treeHelpers';
import clsx from 'clsx';

interface TreeCellProps {
  row: any;
  column: ColumnConfiguration;
  subColumn?: { label: string; value: any };
  isBulk?: boolean;
  onChange: (field: string, value: any) => void;
}

export const TreeCell: React.FC<TreeCellProps> = ({ row, column, subColumn, isBulk, onChange }) => {
  const value = getByPath(row, column.field);
  
  // Local state for text/number inputs to prevent spamming updates
  const [localValue, setLocalValue] = useState<string>(
    value === undefined || value === null ? '' : String(value)
  );

  useEffect(() => {
    setLocalValue(value === undefined || value === null ? '' : String(value));
  }, [value]);

  const handleBlur = () => {
    if (column.type === 'number') {
      const num = parseFloat(localValue);
      // Only update if valid number and changed
      if (!isNaN(num)) {
        if (num !== value) onChange(column.field, num);
      } else if (localValue === '' && value !== null && value !== undefined) {
         onChange(column.field, null);
      }
    } else {
      if (localValue !== (value || '')) {
         onChange(column.field, localValue);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && column.type !== 'multiline-text') {
      e.currentTarget.blur();
    }
  };

  // --- Split Column Logic ---
  if (column.type === 'multi-select-split') {
    const selectedValues: any[] = Array.isArray(value) ? value : [];
    
    if (isBulk) {
       // Bulk Select Column
       const allOptions = column.options?.map(o => o.value) || [];
       const isFull = allOptions.every(opt => selectedValues.includes(opt));
       const isPartial = !isFull && selectedValues.length > 0;
       
       const handleBulkClick = () => {
         if (isFull || isPartial) {
           // Deselect All
           onChange(column.field, []);
         } else {
           // Select All
           onChange(column.field, allOptions);
         }
       };

       return (
         <td className="border-b border-r px-2 py-2 text-center bg-gray-50/30 cursor-pointer hover:bg-blue-50" onClick={handleBulkClick}>
            <div className={clsx(
              "w-4 h-4 mx-auto rounded border flex items-center justify-center transition-colors",
              isFull ? "bg-blue-600 border-blue-600" : isPartial ? "bg-blue-200 border-blue-400" : "border-gray-300 bg-white"
            )}>
              {isFull && <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>}
              {isPartial && <div className="w-2 h-0.5 bg-blue-600"></div>}
            </div>
         </td>
       );
    }

    // Individual Split Column
    const isChecked = selectedValues.includes(subColumn?.value);
    const handleToggle = () => {
      const newVal = isChecked
        ? selectedValues.filter(v => v !== subColumn?.value)
        : [...selectedValues, subColumn?.value];
      onChange(column.field, newVal);
    };

    return (
      <td className="border-b border-r px-2 py-2 text-center cursor-pointer hover:bg-gray-50" onClick={handleToggle}>
         <input 
           type="checkbox" 
           checked={isChecked} 
           onChange={() => {}} // Handled by TD click
           className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 pointer-events-none"
         />
      </td>
    );
  }

  if (column.type === 'single-select-split') {
    const isChecked = value === subColumn?.value;
    const handleSelect = () => {
      onChange(column.field, subColumn?.value);
    };

    return (
      <td className="border-b border-r px-2 py-2 text-center cursor-pointer hover:bg-gray-50" onClick={handleSelect}>
        <div className={clsx(
          "w-4 h-4 mx-auto rounded-full border flex items-center justify-center",
          isChecked ? "border-blue-600" : "border-gray-300"
        )}>
          {isChecked && <div className="w-2 h-2 rounded-full bg-blue-600" />}
        </div>
      </td>
    );
  }

  // --- Standard Inputs ---
  
  if (column.type === 'number') {
    return (
      <td className="border-b border-r p-0">
        <input 
          type="number"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="w-full h-full px-3 py-2 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 bg-transparent text-right"
        />
      </td>
    );
  }

  if (column.type === 'multiline-text') {
    return (
      <td className="border-b border-r p-0 min-w-[200px]">
        <textarea 
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          onBlur={handleBlur}
          // We don't handle enter for textarea
          rows={1}
          className="w-full h-full px-3 py-2 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 bg-transparent resize-none overflow-hidden"
          style={{ minHeight: '38px' }}
        />
      </td>
    );
  }

  // Default Text
  return (
    <td className="border-b border-r p-0 min-w-[150px]">
      <input 
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-3 py-2 border-none focus:ring-inset focus:ring-2 focus:ring-blue-500 bg-transparent"
      />
    </td>
  );
};