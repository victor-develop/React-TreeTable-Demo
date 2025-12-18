import React, { useRef, useState } from 'react';
import TreeTableSheet from './components/TreeTable/TreeTableSheet';
import { AIAgentSidebar } from './components/AI/AIAgentSidebar';
import { ColumnConfiguration, TreeTableEvent, TreeTableRef } from './types';
import { Sparkles, Trash2, List } from 'lucide-react';

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
  const [showEvents, setShowEvents] = useState(false);
  
  const [tableData, setTableData] = useState<any[]>([]);
  const [tableColumns, setTableColumns] = useState<ColumnConfiguration[]>([]);
  const [tableVersion, setTableVersion] = useState(0);

  const handleEvent = (event: TreeTableEvent) => {
    setEvents(prev => [event, ...prev].slice(0, 20));
  };

  const handleLoadDemo = () => {
    setTableData(DEMO_DATA);
    setTableColumns(DEMO_COLUMNS);
    setTableVersion(v => v + 1);
    setEvents([]);
  };

  const handleClear = () => {
    setTableData([]);
    setTableColumns([]);
    setTableVersion(v => v + 1);
    setEvents([]);
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 font-sans">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between shadow-sm z-10">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Event-Sourced Tree Table</h1>
          <p className="text-sm text-gray-500">AI-Managed Hierarchy & Data</p>
        </div>
        <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowEvents(!showEvents)}
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-all text-sm font-medium border ${
                showEvents ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-white border-gray-200 text-gray-600'
              }`}
              title="Toggle Event Log"
            >
              <List className="w-4 h-4" /> Events
            </button>
            <div className="h-6 w-px bg-gray-200 mx-1"></div>
            {tableData.length === 0 ? (
               <button 
                 onClick={handleLoadDemo}
                 className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-md hover:from-purple-700 hover:to-indigo-700 shadow-sm transition-all text-sm font-medium"
               >
                 <Sparkles className="w-4 h-4" /> Load Demo
               </button>
            ) : (
               <button 
                 onClick={handleClear}
                 className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-md hover:bg-red-50 transition-all text-sm font-medium"
               >
                 <Trash2 className="w-4 h-4" /> Clear
               </button>
            )}
        </div>
      </header>

      <main className="flex-1 overflow-hidden flex">
        <div className="flex-1 flex flex-col h-full min-w-0 p-4">
          <TreeTableSheet
            key={tableVersion}
            ref={tableRef}
            data={tableData}
            columns={tableColumns}
            mode="edit"
            onEvent={handleEvent}
          />
        </div>

        {/* Sidebar container */}
        <div className="flex h-full">
          {showEvents && (
            <div className="w-80 bg-white border-l flex flex-col overflow-hidden animate-in slide-in-from-right duration-300">
              <div className="bg-gray-50 px-4 py-3 border-b font-semibold text-gray-700">
                Live Event Stream
              </div>
              <div className="flex-1 overflow-auto p-4 space-y-3 bg-gray-50/50">
                {events.length === 0 && <p className="text-gray-400 text-sm italic text-center mt-10">No events recorded.</p>}
                {events.map(evt => (
                  <div key={evt.id} className="bg-white p-3 rounded border shadow-sm text-[10px] font-mono">
                    <div className="flex justify-between text-gray-500 mb-1 border-b pb-1">
                      <span className="font-bold text-blue-600 uppercase">{evt.type}</span>
                      <span>{evt.timestamp.split('T')[1].split('.')[0]}</span>
                    </div>
                    <div className="mt-2 overflow-x-auto text-gray-600 whitespace-pre-wrap break-all leading-tight">
                      {JSON.stringify(evt.payload, null, 1)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <AIAgentSidebar tableRef={tableRef} />
        </div>
      </main>
    </div>
  );
}

export default App;