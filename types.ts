// --- Event Architecture ---

export type TreeTableEventType = 
  | 'NODE_DATA_UPDATED'      
  | 'NODE_MOVED'             
  | 'NODE_CREATED'           
  | 'NODE_DELETED'           
  | 'COLUMN_CONFIG_UPDATED'  
  | 'IMPORT_COMPLETED';      

export interface NodeDataUpdatedPayload {
  nodeId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

export interface NodeMovedPayload {
  nodeId: string;
  oldParentId: string | null;
  newParentId: string | null;
  newIndex: number;
}

export interface NodeCreatedPayload {
  nodeId: string;
  parentId: string | null;
  initialData: any;
}

export interface NodeDeletedPayload {
  targetNodeId: string;
  allRemovedNodeIds: string[];
}

export interface TreeTableEvent {
  id: string;
  timestamp: string;
  type: TreeTableEventType;
  payload: NodeDataUpdatedPayload | NodeMovedPayload | NodeCreatedPayload | NodeDeletedPayload | any;
  meta?: Record<string, any>;
}

// --- Configuration ---

export type ColumnType = 'text' | 'multiline-text' | 'number' | 'single-select-split' | 'multi-select-split';

export interface ColumnConfiguration {
  id: string;
  field: string;
  label: string;
  type: ColumnType;
  width?: number;
  editable?: boolean;
  options?: {
    label: string;
    value: string | number;
  }[];
  enableRowBulkSelect?: boolean; 
}

export interface TreeTableSnapshot {
  meta: { version: string; generatedAt: string };
  config: ColumnConfiguration[];
  data: any[];
}

// --- Component Props ---

export interface TreeTableSheetProps<T = any> {
  data: T[];
  columns?: ColumnConfiguration[];
  rowKey?: string; // default: "id"
  mode: 'read-only' | 'edit';
  enableDragAndDrop?: boolean;
  enableDelete?: boolean;
  enableImportExport?: boolean;
  onEvent: (event: TreeTableEvent) => void;
  onDataChange?: (data: T[]) => void;
  onConfigurationChange?: (newConfigs: ColumnConfiguration[]) => void;
  onImport?: (snapshot: TreeTableSnapshot) => void;
  onExport?: (snapshot: TreeTableSnapshot) => void;
}

export interface TreeTableRef {
  getData: () => any[];
  getSnapshot: () => TreeTableSnapshot;
  openImportDialog: () => void;
  triggerExport: (format: 'json' | 'csv') => void;
}

// --- Internal Data Helpers ---

export interface TreeNode extends Record<string, any> {
  id: string;
  parentId: string | null;
  children?: TreeNode[];
  depth?: number;
}
