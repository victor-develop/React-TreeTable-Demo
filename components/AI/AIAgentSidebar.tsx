
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { TreeTableRef } from '../../types';
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react';

interface AIAgentSidebarProps {
  tableRef: React.RefObject<TreeTableRef>;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const tableTools: FunctionDeclaration[] = [
  {
    name: 'addNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Add a new node to the tree table.',
      properties: {
        parentId: { type: Type.STRING, description: 'The ID of the parent node. Pass null for a root node.' },
        data: { 
          type: Type.OBJECT, 
          description: 'The initial data for the node (e.g., { name: "New Task", budget: 100 }).',
          properties: {
            name: { type: Type.STRING },
            status: { type: Type.STRING },
            budget: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          }
        },
      },
    },
  },
  {
    name: 'updateNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Update a specific field of a node.',
      properties: {
        nodeId: { type: Type.STRING, description: 'The ID of the node to update.' },
        field: { type: Type.STRING, description: 'The field name to update (e.g., "name", "status", "budget").' },
        value: { type: Type.STRING, description: 'The new value for the field.' },
      },
      required: ['nodeId', 'field', 'value'],
    },
  },
  {
    name: 'moveNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Move a node to a different position in the hierarchy (re-organize).',
      properties: {
        nodeId: { type: Type.STRING, description: 'The ID of the node to move.' },
        newParentId: { type: Type.STRING, description: 'The ID of the new parent node. Pass null to make it a root node.' },
        newIndex: { type: Type.NUMBER, description: 'The zero-based index position among siblings. Use 0 to place at the start.' },
      },
      required: ['nodeId', 'newParentId', 'newIndex'],
    },
  },
  {
    name: 'deleteNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Delete a node and all its descendants.',
      properties: {
        nodeId: { type: Type.STRING, description: 'The ID of the node to delete.' },
      },
      required: ['nodeId'],
    },
  },
  {
    name: 'getTableData',
    parameters: {
      type: Type.OBJECT,
      description: 'Get the current state of the table (nodes and columns) to understand the hierarchy and data.',
      properties: {},
    },
  },
  {
    name: 'addColumn',
    parameters: {
      type: Type.OBJECT,
      description: 'Add a new column to the table.',
      properties: {
        label: { type: Type.STRING, description: 'Display label for the column.' },
        field: { type: Type.STRING, description: 'JSON field path (e.g. "status", "metadata.priority").' },
        type: { 
          type: Type.STRING, 
          description: 'The type of column.',
          enum: ['text', 'multiline-text', 'number', 'single-select-split', 'multi-select-split']
        },
        options: {
            type: Type.ARRAY,
            description: 'Optional options for select types.',
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING },
                    value: { type: Type.STRING }
                }
            }
        }
      },
      required: ['label', 'field', 'type'],
    },
  },
  {
    name: 'updateColumn',
    parameters: {
      type: Type.OBJECT,
      description: 'Update an existing column configuration.',
      properties: {
        columnId: { type: Type.STRING, description: 'The ID of the column to update.' },
        label: { type: Type.STRING },
        field: { type: Type.STRING },
        type: { 
          type: Type.STRING, 
          enum: ['text', 'multiline-text', 'number', 'single-select-split', 'multi-select-split']
        },
      },
      required: ['columnId'],
    },
  },
  {
    name: 'deleteColumn',
    parameters: {
      type: Type.OBJECT,
      description: 'Remove a column from the table.',
      properties: {
        columnId: { type: Type.STRING, description: 'The ID of the column to remove.' },
      },
      required: ['columnId'],
    },
  },
];

export const AIAgentSidebar: React.FC<AIAgentSidebarProps> = ({ tableRef }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsTyping(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          ...messages.map(m => ({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.content }] })),
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `You are an AI assistant managing a complex project tree table. 
          You can manage nodes (hierarchy/data) and columns (schema). 
          You have full power to re-organize the hierarchy by moving nodes between parents or changing their sort order.
          Always use tools when the user asks for structural or schema changes.
          Current columns: ${JSON.stringify(tableRef.current?.getColumns())}.
          Current full data: ${JSON.stringify(tableRef.current?.getData())}.
          The field names correspond exactly to the keys in the data objects.
          If adding a select type column, make sure to provide reasonable options.`,
          tools: [{ functionDeclarations: tableTools }],
        },
      });

      const calls = response.functionCalls;
      if (calls && calls.length > 0) {
        for (const call of calls) {
          // Fix: cast args to any to prevent TypeScript errors when accessing properties
          const args = call.args as any;
          switch (call.name) {
            case 'getTableData': {
              const data = tableRef.current?.getData();
              const columns = tableRef.current?.getColumns();
              setMessages(prev => [...prev, { role: 'assistant', content: `Analyzed: ${data?.length} nodes and ${columns?.length} columns.` }]);
              break;
            }
            case 'addNode': {
              tableRef.current?.addNode(args.parentId || null, args.data);
              setMessages(prev => [...prev, { role: 'assistant', content: `Added node: ${args.data?.name || 'New Node'}` }]);
              break;
            }
            case 'updateNode': {
              tableRef.current?.updateNode(args.nodeId, args.field, args.value);
              setMessages(prev => [...prev, { role: 'assistant', content: `Updated node ${args.nodeId}: ${args.field} is now "${args.value}"` }]);
              break;
            }
            case 'moveNode': {
              tableRef.current?.moveNode(args.nodeId, args.newParentId || null, args.newIndex);
              setMessages(prev => [...prev, { role: 'assistant', content: `Moved node ${args.nodeId} to parent ${args.newParentId || 'root'} at index ${args.newIndex}.` }]);
              break;
            }
            case 'deleteNode': {
              tableRef.current?.deleteNode(args.nodeId);
              setMessages(prev => [...prev, { role: 'assistant', content: `Deleted node ${args.nodeId} and its children.` }]);
              break;
            }
            case 'addColumn': {
              tableRef.current?.addColumn(args);
              setMessages(prev => [...prev, { role: 'assistant', content: `Added new column: ${args.label} (${args.type})` }]);
              break;
            }
            case 'updateColumn': {
              const { columnId, ...config } = args;
              tableRef.current?.updateColumn(columnId, config as any);
              setMessages(prev => [...prev, { role: 'assistant', content: `Updated configuration for column ${columnId}.` }]);
              break;
            }
            case 'deleteColumn': {
              tableRef.current?.deleteColumn(args.columnId);
              setMessages(prev => [...prev, { role: 'assistant', content: `Removed column ${args.columnId}.` }]);
              break;
            }
          }
        }
      } else if (response.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I encountered an error while processing that." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="w-80 bg-white border-l flex flex-col h-full shadow-lg">
      <div className="p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-bold">AI Project Assistant</h2>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {messages.length === 0 && (
          <div className="text-center mt-10 px-4">
            <Bot className="w-12 h-12 text-blue-200 mx-auto mb-2" />
            <p className="text-gray-400 text-sm italic">
              "Move task 1-2-1 under task 2" or "Add a Priority column".
            </p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
              m.role === 'user' 
                ? 'bg-blue-600 text-white rounded-tr-none' 
                : 'bg-white border shadow-sm text-gray-800 rounded-tl-none'
            }`}>
              <div className="flex items-center gap-2 mb-1 opacity-70 text-[10px] uppercase font-bold">
                {m.role === 'user' ? <><User className="w-3 h-3"/> You</> : <><Bot className="w-3 h-3"/> Assistant</>}
              </div>
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">Processing...</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Hierarchy, data or column commands..."
            className="w-full pl-4 pr-12 py-3 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={isTyping}
            className="absolute right-2 top-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-center">Powered by Gemini AI</p>
      </div>
    </div>
  );
};
