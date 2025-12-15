import React, { useRef, useState } from 'react';
import TreeTableSheet from './components/TreeTable/TreeTableSheet';
import { ColumnConfiguration, TreeTableEvent, TreeTableRef } from './types';
import { Sparkles, Trash2 } from 'lucide-react';

// --- Mock Data ---
const DEMO_DATA = [
  { id: '1', parentId: null, name: 'Project Alpha', status: 'active', budget: 50000, tags: ['urgent', 'backend'] },
  { id: '1-1', parentId: '1', name: 'Design Phase', status: 'completed', budget: 15000, tags: ['frontend'] },
  { id: '1-2', parentId: '1', name: 'Development', status: 'active', budget: 30000, tags: ['backend', 'urgent'] },
  { id: '1-2-1', parentId: '1-2', name: 'API Setup', status: 'active', budget: 5000, tags: ['backend'] },
  { id: '1-2-2', parentId: '1-2', name: 'DB Schema', status: 'pending', budget: 8000, tags: ['backend'] },
  { id: '2', parentId: null, name: 'Marketing Q3', status: 'pending', budget: 20000, tags: [] },
];

const DEMO_COLUMNS: ColumnConfiguration[] = [
  { 
    id: 'status', 
    field: 'status', 
    label: 'Status', 
    type: 'single-select-split',
    options: [
      { label: 'Active', value: 'active' },
      { label: 'Pending', value: 'pending' },
      { label: 'Done', value: 'completed' }
    ]
  },
  { 
    id: 'budget', 
    field: 'budget', 
    label: 'Budget ($)', 
    type: 'number',
    width: 120 
  },
  {
    id: 'tags',
    field: 'tags',
    label: 'Tags',
    type: 'multi-select-split',
    enableRowBulkSelect: true,
    options: [
      { label: 'Urgent', value: 'urgent' },
      { label: 'Frontend', value: 'frontend' },
      { label: 'Backend', value: 'backend' }
    ]
  },
  {
    id: 'notes',
    field: 'notes',
    label: 'Notes',
    type: 'multiline-text',
    width: 300
  }
];

function App() {
  const tableRef = useRef<TreeTableRef>(null);
  const [events, setEvents] = useState<TreeTableEvent[]>([]);
  
  // State for Table Data & Config
  // Start clean (empty) as requested
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnConfiguration[]>([]);
  
  // Key to force re-mount when resetting data
  const [tableVersion, setTableVersion] = useState(0);

  const handleEvent = (event: TreeTableEvent) => {
    // In a real app, you'd send this to your backend
    console.log('[Event Emitted]', event);
    setEvents(prev => [event, ...prev].slice(0, 20)); // Keep last 20
  };

  const handleLoadDemo = () => {
    setTableData(DEMO_DATA);
    setTableColumns(DEMO_COLUMNS);
    setTableVersion(v => v + 1);
    setEvents([]); // Clear log for fresh start
  };

  const handleClear = () => {
    // Removed confirm dialog to ensure consistent behavior
    setTableData([]);
    setTableColumns([]);
    setTableVersion(v => v + 1);
    setEvents([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      {/* Header */}
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Event-Sourced Tree Table</h1>
          <p className="text-sm text-gray-500">React + TypeScript + Tailwind + Event Sourcing</p>
        </div>
        <div className="flex items-center gap-3">
            {tableData.length === 0 ? (
               <button 
                 onClick={handleLoadDemo}
                 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all text-sm font-medium"
               >
                 <Sparkles className="w-4 h-4" /> Load Demo Data
               </button>
            ) : (
               <button 
                 onClick={handleClear}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-all text-sm font-medium"
               >
                 <Trash2 className="w-4 h-4" /> Clear
               </button>
            )}
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            <a href="https://github.com/google-gemini/react-tree-table" target="_blank" rel="noreferrer" className="text-blue-600 text-sm hover:underline">View Spec</a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex p-4 gap-4">
        
        {/* Left: The Component */}
        <div className="flex-1 flex flex-col h-full min-w-0">
          <TreeTableSheet
            key={tableVersion} // Force remount on data reset
            ref={tableRef}
            data={tableData}
            columns={tableColumns}
            mode="edit"
            onEvent={handleEvent}
          />
        </div>

        {/* Right: Event Log (Sidebar) */}
        <div className="w-80 bg-white border rounded-lg shadow-sm flex flex-col overflow-hidden hidden lg:flex">
          <div className="bg-gray-50 px-4 py-3 border-b font-semibold text-gray-700">
            Event Log (Live)
          </div>
          <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50/50">
            {events.length === 0 && <p className="text-gray-400 text-sm italic text-center mt-10">Interact with the table to see events here.</p>}
            {events.map(evt => (
              <div key={evt.id} className="bg-white p-3 rounded border shadow-sm text-xs font-mono">
                <div className="flex justify-between text-gray-500 mb-1">
                  <span className="font-bold text-blue-600">{evt.type}</span>
                  <span>{evt.timestamp.split('T')[1].split('.')[0]}</span>
                </div>
                <div className="overflow-x-auto text-gray-600 whitespace-pre-wrap break-all">
                  {JSON.stringify(evt.payload, null, 2)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}

export default App;