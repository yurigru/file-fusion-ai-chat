export interface RAGQueryRequest {
  query: string;
  n_results?: number;
}

export interface RAGResult {
  document: string;
  metadata: {
    source_file: string;
    component_ref: string;
    part_number: string;
    package: string;
    description: string;
    value: string;
    partname: string;
    type: string;
  };
  similarity: number;
}

export interface RAGQueryResponse {
  results: RAGResult[];
  method: string;
  error?: string;
}

export interface RAGStats {
  components: number;
  patterns: number;
  total: number;
  status: string;
  error?: string;
}

export interface RAGStatus {
  status: string;
  overall_status?: string;
  database: {
    accessible: boolean;
    type?: string;
    components: number;
    patterns: number;
    total_items: number;
  };
  embedding_service: {
    accessible: boolean;
    model: string;
    url: string;
  };
  collections: {
    bom_components: {
      count: number;
      status: string;
    };
    design_patterns: {
      count: number;
      status: string;
    };
  };
  error?: string;
}

export class RAGService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async addBOMToKnowledge(file: File, sourceName: string): Promise<{
    status: string;
    message: string;
    component_count: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('source_name', sourceName);

    const response = await fetch(`${this.baseUrl}/api/rag/add-bom`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to add BOM to knowledge base: ${error}`);
    }

    return await response.json();
  }

  async queryKnowledge(query: string, nResults: number = 5): Promise<RAGQueryResponse> {
    const response = await fetch(`${this.baseUrl}/api/rag/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        n_results: nResults,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Knowledge query failed: ${error}`);
    }

    return await response.json();
  }

  async getKnowledgeStats(): Promise<RAGStats> {
    const response = await fetch(`${this.baseUrl}/api/rag/stats`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get knowledge stats: ${error}`);
    }

    return await response.json();
  }

  async getRAGStatus(): Promise<RAGStatus> {
    const response = await fetch(`${this.baseUrl}/api/rag/status`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get RAG status: ${error}`);
    }

    return await response.json();
  }

  async clearKnowledgeBase(): Promise<{
    status: string;
    message: string;
    components_deleted: number;
    patterns_deleted: number;
  }> {
    const response = await fetch(`${this.baseUrl}/api/rag/clear`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to clear knowledge base: ${error}`);
    }

    return await response.json();
  }
  async sendRAGMessage(request: {
    model: string;
    messages: Array<{ role: string; content: string }>;
    stream?: boolean;
    ollama_url?: string;
    custom_system_prompt?: string;
  }): Promise<any> {
    const response = await fetch(`${this.baseUrl}/api/chat/rag-completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`RAG chat request failed: ${error}`);
    }

    return await response.json();
  }
}

export const ragService = new RAGService();
