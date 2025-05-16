
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
  added: string[];
  deleted: string[];
  changed: {
    line: number;
    original: string;
    modified: string;
  }[];
  // For BOM specific comparisons
  addedComponents?: ElectronicComponent[];
  deletedComponents?: ElectronicComponent[];
  changedComponents?: {
    id: string;
    reference: string;
    original: Partial<ElectronicComponent>;
    modified: Partial<ElectronicComponent>;
  }[];
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
  | "gemma";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
}
