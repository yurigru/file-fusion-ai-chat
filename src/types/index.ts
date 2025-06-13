export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;
  uploadProgress?: number;
  fileType?: "bom" | "netlist" | "other";
}

export interface ElectronicComponent {
  id: string;
  reference: string;
  value: string;
  footprint?: string;
  quantity: number;
  description?: string;
  manufacturer?: string;
  partNumber?: string;
}

export interface NetlistConnection {
  id: string;
  net: string;
  nodes: string[];
  type?: string;
}

export interface ComparisonResult {
  // Legacy format for text comparisons
  added?: string[] | any[];
  deleted?: string[];
  changed?: any[];
  // Backend BOM response format
  removed?: any[];
  // For BOM specific comparisons - these are the main fields used by BOMCompare
  addedComponents?: ElectronicComponent[];
  deletedComponents?: ElectronicComponent[];
  changedComponents?: {
    reference: string;
    original: Partial<ElectronicComponent>;
    modified: Partial<ElectronicComponent>;
  }[];
  // Enhanced BOM comparison data
  validationWarnings?: string[];
  statistics?: {
    old_components_count?: number;
    new_components_count?: number;
    added_count?: number;
    removed_count?: number;
    changed_count?: number;
    total_changes?: number;
  };
  // For Netlist specific comparisons
  addedConnections?: NetlistConnection[];
  deletedConnections?: NetlistConnection[];
  changedConnections?: {
    id: string;
    original: Partial<NetlistConnection>;
    modified: Partial<NetlistConnection>;
  }[];
}

export interface ComparisonFiles {
  file1: UploadedFile | null;
  file2: UploadedFile | null;
  result: ComparisonResult | null;
}

export type OllamaModel = 
  | "llama3"
  | "llama3:8b"
  | "llama3:70b"
  | "mistral"
  | "mixtral"
  | "phi3"
  | "codellama"
  | "gemma"
  | string; // Allow any string for custom models

export interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
  modified_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}

// MCP (Model Context Protocol) related types
export type MCPServerType = "local" | "remote" | "custom";

export interface MCPTool {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface MCPServerConfig {
  url: string;
  apiKey?: string;
  serverType: MCPServerType;
  contextSize?: number;
  maxTokens?: number;
  tools: MCPTool[];
}

export interface ServerConfig {
  type: "ollama" | "mcp";
  modelName: string;
  mcpConfig?: MCPServerConfig;
  ollamaUrl?: string;
}

export interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  serverConfig: ServerConfig;
  onServerConfigChange: (config: ServerConfig) => void;
}
