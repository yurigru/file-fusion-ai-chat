// Ollama API service for connecting to local Ollama instance
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

export interface OllamaResponse {
  models: OllamaModelInfo[];
}

export interface OllamaGenerateRequest {
  model: string;
  prompt: string;
  stream?: boolean;
  context?: number[];
  options?: {
    temperature?: number;
    top_p?: number;
    top_k?: number;
    repeat_penalty?: number;
    seed?: number;
    num_ctx?: number;
    num_predict?: number;
  };
}

export interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Validate Ollama URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Check if Ollama server is running and accessible
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for remote servers
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Ollama server connection timeout:', this.baseUrl);
        } else {
          console.error('Error checking Ollama server:', error.message);
        }
      }
      return false;
    }
  }

  /**
   * Get list of available models from Ollama
   */
  async getModels(): Promise<OllamaModelInfo[]> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for model fetching
      
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
      }

      const data: OllamaResponse = await response.json();
      return data.models || [];
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('Timeout fetching Ollama models from:', this.baseUrl);
          throw new Error('Connection timeout - check if the remote Ollama server is accessible');
        }
        console.error('Error fetching Ollama models:', error.message);
        throw new Error(`Failed to fetch models: ${error.message}`);
      }
      throw new Error('Failed to fetch models from Ollama server');
    }
  }

  /**
   * Generate response from Ollama model
   */
  async generateResponse(request: OllamaGenerateRequest): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: false, // We'll use non-streaming for simplicity
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: OllamaGenerateResponse = await response.json();
      return data.response;
    } catch (error) {
      console.error('Error generating Ollama response:', error);
      throw new Error('Failed to generate response from Ollama');
    }
  }

  /**
   * Generate streaming response from Ollama model
   */
  async generateStreamingResponse(
    request: OllamaGenerateRequest,
    onChunk: (chunk: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void
  ): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...request,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body reader available');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim());

        for (const line of lines) {
          try {
            const data: OllamaGenerateResponse = JSON.parse(line);
            if (data.response) {
              onChunk(data.response);
            }
            if (data.done) {
              onComplete();
              return;
            }
          } catch (parseError) {
            console.warn('Failed to parse chunk:', line);
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming response:', error);
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Check if a specific model is available
   */
  async isModelAvailable(modelName: string): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.some(model => model.name === modelName);
    } catch (error) {
      console.error('Error checking model availability:', error);
      return false;
    }
  }

  /**
   * Pull/download a model from Ollama registry
   */
  async pullModel(modelName: string, onProgress?: (progress: string) => void): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: modelName,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (onProgress) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
              try {
                const data = JSON.parse(line);
                if (data.status) {
                  onProgress(data.status);
                }
              } catch (parseError) {
                // Ignore parse errors in progress updates
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error pulling model:', error);
      throw new Error(`Failed to pull model: ${modelName}`);
    }
  }
}
