
export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: number;
  content: string;
  uploadProgress?: number;
}

export interface ComparisonResult {
  added: string[];
  deleted: string[];
  changed: {
    line: number;
    original: string;
    modified: string;
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
