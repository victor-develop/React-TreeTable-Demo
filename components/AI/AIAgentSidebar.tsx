
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type, FunctionDeclaration, GenerateContentResponse } from '@google/genai';
import { TreeTableRef } from '../../types';
import { Send, Bot, User, Loader2, Sparkles, Activity, CheckCircle2, ChevronRight, RotateCcw } from 'lucide-react';

interface AIAgentSidebarProps {
  tableRef: React.RefObject<TreeTableRef>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isThought?: boolean;
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
          description: 'The initial data for the node.',
          properties: {
            name: { type: Type.STRING },
            status: { type: Type.STRING },
            budget: { type: Type.NUMBER },
            notes: { type: Type.STRING }
          }
        },
      },
      required: ['data']
    },
  },
  {
    name: 'updateNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Update a specific field of a node.',
      properties: {
        nodeId: { type: Type.STRING, description: 'The ID of the node to update.' },
        field: { type: Type.STRING, description: 'The field name to update.' },
        value: { type: Type.STRING, description: 'The new value for the field.' },
      },
      required: ['nodeId', 'field', 'value'],
    },
  },
  {
    name: 'moveNode',
    parameters: {
      type: Type.OBJECT,
      description: 'Move a node to a different position in the hierarchy.',
      properties: {
        nodeId: { type: Type.STRING, description: 'The ID of the node to move.' },
        newParentId: { type: Type.STRING, description: 'The ID of the new parent node. Pass null for root.' },
        newIndex: { type: Type.NUMBER, description: 'The zero-based index position among siblings.' },
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
    name: 'getTableSnapshot',
    parameters: {
      type: Type.OBJECT,
      description: 'Get the full current state of the table (nodes and columns) to understand the current hierarchy and data.',
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
        field: { type: Type.STRING, description: 'JSON field path.' },
        type: { 
          type: Type.STRING, 
          enum: ['text', 'multiline-text', 'number', 'single-select-split', 'multi-select-split']
        },
        options: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: { label: { type: Type.STRING }, value: { type: Type.STRING } }
            }
        }
      },
      required: ['label', 'field', 'type'],
    },
  },
];

export const AIAgentSidebar: React.FC<AIAgentSidebarProps> = ({ tableRef }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentThought, setCurrentThought] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, currentThought, isProcessing]);

  const executeTool = (name: string, args: any) => {
    if (!tableRef.current) return { error: 'Table not available' };
    
    try {
      switch (name) {
        case 'getTableSnapshot':
          return { 
            data: tableRef.current.getData(), 
            columns: tableRef.current.getColumns() 
          };
        case 'addNode':
          tableRef.current.addNode(args.parentId || null, args.data);
          return { status: 'success', message: `Added node: ${args.data?.name || 'New Node'}` };
        case 'updateNode':
          tableRef.current.updateNode(args.nodeId, args.field, args.value);
          return { status: 'success', message: `Updated ${args.field} for ${args.nodeId}` };
        case 'moveNode':
          tableRef.current.moveNode(args.nodeId, args.newParentId || null, args.newIndex);
          return { status: 'success', message: `Moved node ${args.nodeId}` };
        case 'deleteNode':
          tableRef.current.deleteNode(args.nodeId);
          return { status: 'success', message: `Deleted node ${args.nodeId}` };
        case 'addColumn':
          tableRef.current.addColumn(args);
          return { status: 'success', message: `Added column ${args.label}` };
        default:
          return { error: 'Unknown tool' };
      }
    } catch (err: any) {
      return { error: err.message };
    }
  };

  const resetSession = () => {
    setMessages([]);
    setHistory([]);
    setInput('');
  };

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput('');
    
    const newUserTurn = { role: 'user', parts: [{ text: userText }] };
    let currentHistory = [...history, newUserTurn];
    
    setMessages(prev => [...prev, { role: 'user', content: userText }]);
    setIsProcessing(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `You are a Re-Act (Reason-Act) agent managing a project tree table.
      Your goal is to satisfy user requests by performing a sequence of observations and actions.
      
      WORKFLOW:
      1. THOUGHT: Explain your reasoning for the next step.
      2. ACTION: Call a tool to observe the state or modify the table.
      3. OBSERVATION: Process the result returned from the tool.
      4. REPEAT until the user's request is fully resolved.
      
      CAPABILITIES:
      - You can query the full table state with getTableSnapshot.
      - You can modify nodes, columns, and hierarchy.
      - If a request is vague, ask for clarification.
      - If moving nodes, ensure you have the correct IDs first by querying the state.
      
      Always be helpful and precise. Current date: ${new Date().toLocaleDateString()}.`;

      let loopCount = 0;
      const MAX_LOOPS = 8;

      while (loopCount < MAX_LOOPS) {
        setCurrentThought('Thinking...');
        const response: any = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: currentHistory,
          config: {
            systemInstruction,
            tools: [{ functionDeclarations: tableTools }],
          },
        });

        const candidate = response.candidates[0];
        const content = candidate.content;
        const parts = content.parts;

        // Add model's turn to history
        currentHistory.push({ role: 'model', parts });

        // Extract and show text/thought to user
        const textPart = parts.find((p: any) => p.text);
        const functionCalls = parts.filter((p: any) => p.functionCall).map((p: any) => p.functionCall);

        if (textPart?.text) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: textPart.text, 
            isThought: functionCalls.length > 0 
          }]);
        }

        // If no more tools to call, we are done
        if (functionCalls.length === 0) break;

        // Execute all tools in this turn
        const toolResponses = [];
        for (const call of functionCalls) {
          setCurrentThought(`Executing ${call.name}...`);
          const result = executeTool(call.name, call.args);
          
          setMessages(prev => [...prev, { 
            role: 'system', 
            content: `Action: ${call.name} -> Result: ${result.status || 'Data Received'}` 
          }]);

          toolResponses.push({
            functionResponse: {
              name: call.name,
              id: call.id,
              response: result
            }
          });
        }

        // Add tool responses as a new user turn (observation)
        currentHistory.push({ role: 'user', parts: toolResponses });
        loopCount++;
      }

      setHistory(currentHistory);
      
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error.message}` }]);
    } finally {
      setIsProcessing(false);
      setCurrentThought(null);
    }
  };

  return (
    <div className="w-96 bg-white border-l flex flex-col h-full shadow-2xl z-20 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-500 rounded-lg shadow-inner">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold text-sm leading-tight">Re-Act Agent</h2>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Live Session</span>
            </div>
          </div>
        </div>
        <button 
          onClick={resetSession}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-all"
          title="Clear History"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 no-scrollbar">
        {messages.length === 0 && (
          <div className="text-center py-12 px-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-slate-800 font-bold mb-2">How can I assist?</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              I can manage this project tree. Try: "Move all active tasks to a new root node called Active Portfolio".
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          if (m.role === 'system') {
            return (
              <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-[10px] font-mono text-slate-400 shadow-sm opacity-60">
                <ChevronRight className="w-3 h-3 text-blue-400" />
                <span className="truncate">{m.content}</span>
              </div>
            );
          }

          const isUser = m.role === 'user';
          return (
            <div key={i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[90%] group relative ${isUser ? 'bg-blue-600 text-white shadow-md' : m.isThought ? 'bg-blue-50 border border-blue-100 text-blue-800 italic' : 'bg-white border text-slate-800 shadow-sm'} p-3 rounded-2xl ${isUser ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                <div className={`flex items-center gap-2 mb-1.5 opacity-60 text-[10px] uppercase font-bold tracking-widest ${isUser ? 'justify-end' : ''}`}>
                  {isUser ? <><User className="w-3 h-3"/> User</> : m.isThought ? <><Activity className="w-3 h-3"/> Thought</> : <><Bot className="w-3 h-3"/> Agent</>}
                </div>
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {m.content}
                </div>
              </div>
            </div>
          );
        })}

        {isProcessing && (
          <div className="flex flex-col items-start space-y-3">
            {currentThought && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-full text-xs font-medium animate-pulse border border-blue-100 shadow-sm">
                <Loader2 className="w-3 h-3 animate-spin" />
                {currentThought}
              </div>
            )}
            {!currentThought && (
              <div className="bg-white border p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2 text-slate-400">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                  <span className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.02)]">
        <div className="relative group">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isProcessing}
            placeholder={isProcessing ? "Executing loop..." : "Ask me to reorganize or edit..."}
            className="w-full pl-4 pr-12 py-3.5 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 text-sm transition-all disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={isProcessing || !input.trim()}
            className="absolute right-2 top-2 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-md active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-center gap-4">
           <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
             <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Reasoning Turn
           </div>
           <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
             <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Observation Turn
           </div>
        </div>
      </div>
    </div>
  );
};
