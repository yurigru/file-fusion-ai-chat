// Chat service for handling AI conversations
import { ChatMessage, ServerConfig } from "@/types";

export interface ChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content: string;
  }>;
  stream?: boolean;
  max_tokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ChatService {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:11434/v1') {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  /**
   * Send a chat message and get a response
   */  async sendMessage(
    messages: ChatMessage[],
    serverConfig: ServerConfig
  ): Promise<ChatResponse> {
    try {
      // Validate inputs
      if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
      }
      
      if (!serverConfig?.modelName) {
        throw new Error('No model specified in server config');
      }      const requestData = {
        model: serverConfig.modelName,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: false
      };console.log('Sending chat request:', requestData);

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
      }

      const data: ChatResponse = await response.json();
      console.log('Received chat response:', data);
      
      if (!data?.choices?.length) {
        throw new Error('No response choices received from server');
      }
      
      return data;
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw new Error(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send a streaming chat message
   */
  async sendStreamingMessage(
    messages: ChatMessage[],
    serverConfig: ServerConfig,
    onChunk: (content: string) => void,
    onComplete: () => void,
    onError: (error: Error) => void  ): Promise<void> {
    try {
      // Create dynamic URL based on server config
      const ollamaBaseUrl = `${serverConfig.ollamaUrl || "http://localhost:11434"}/v1`;
      
      const requestData = {
        model: serverConfig.modelName || "llama3",
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        stream: true
      };

      const response = await fetch(`${ollamaBaseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          onComplete();
          break;
        }

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onComplete();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                onChunk(content);
              }
            } catch (e) {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming chat:', error);
      onError(error instanceof Error ? error : new Error('Unknown streaming error'));
    }
  }

  /**
   * Check if Ollama is available through the backend
   */
  async checkOllamaStatus(ollamaUrl: string = "http://localhost:11434"): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/ollama/status?ollama_url=${encodeURIComponent(ollamaUrl)}`);
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      return data.status === 'connected';
    } catch (error) {
      console.error('Error checking Ollama status:', error);
      return false;
    }
  }
  /**
   * Get available models from Ollama v1 API
   */
  async getAvailableModels(ollamaUrl: string = "http://localhost:11434"): Promise<any[]> {
    try {
      const v1Url = `${ollamaUrl}/v1/models`;
      const response = await fetch(v1Url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }
      
      const data = await response.json();
      return data.data || []; // v1 API returns models in 'data' field
    } catch (error) {
      console.error('Error fetching models:', error);
      throw error;
    }
  }

  /**
   * Single-turn text completion using Ollama v1 API
   */
  async getCompletion(
    prompt: string,
    model: string,
    ollamaUrl: string = "http://localhost:11434"
  ): Promise<any> {
    try {
      const v1Url = `${ollamaUrl}/v1/completions`;
      const requestData = {
        model,
        prompt,
        max_tokens: 1000,
        temperature: 0.7
      };

      const response = await fetch(v1Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting completion:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings using Ollama v1 API
   */
  async getEmbeddings(
    input: string | string[],
    model: string,
    ollamaUrl: string = "http://localhost:11434"
  ): Promise<any> {
    try {
      const v1Url = `${ollamaUrl}/v1/embeddings`;
      const requestData = {
        model,
        input
      };

      const response = await fetch(v1Url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting embeddings:', error);
      throw error;
    }
  }
}

// Export a default instance
export const chatService = new ChatService();
