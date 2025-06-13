
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, RefreshCw, Server, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ModelSelector from "./ModelSelector";
import { OllamaModel, ChatMessage, ComparisonResult, UploadedFile, ServerConfig, MCPTool } from "@/types";
import { toast } from "@/components/ui/sonner";
import { ChatService } from "@/services/chatService";

interface AIChatProps {
  selectedFile: UploadedFile | null;
  comparisonResult: ComparisonResult | null;
  comparedFiles: { file1: UploadedFile | null; file2: UploadedFile | null };
}

const AIChat = ({ selectedFile, comparisonResult, comparedFiles }: AIChatProps) => {
  const [model, setModel] = useState<OllamaModel | string>("llama3.2");  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: `welcome-${Date.now()}`,
      role: "assistant",
      content: "👋 Hi! I'm your AI assistant powered by Ollama. I can help you with:\n\n• 📁 Analyzing uploaded files (BOMs, netlists, etc.)\n• 🔍 Comparing file differences\n• 💡 Explaining technical concepts\n• 🤔 Answering questions on any topic\n\nI'm available even without uploading files! You can select different AI models from the dropdown above. What would you like to know?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    type: "ollama",
    modelName: "llama3.2",
    ollamaUrl: "http://localhost:11434",
    mcpConfig: {
      url: "http://localhost:8080",
      serverType: "local",
      contextSize: 4096,
      maxTokens: 1024,
      tools: [
        { 
          id: "web-search", 
          name: "Web Search", 
          description: "Search the web for information", 
          enabled: true 
        },
        { 
          id: "file-analyzer", 
          name: "File Analyzer", 
          description: "Analyze BOM and netlist files", 
          enabled: true 
        },
        { 
          id: "schema-validator", 
          name: "Schema Validator", 
          description: "Validate electronic schematics", 
          enabled: false 
        },
        { 
          id: "component-lookup", 
          name: "Component Lookup", 
          description: "Look up electronic component information", 
          enabled: false 
        },
      ]
    }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add a system message when files are selected or compared
    if (selectedFile || (comparedFiles.file1 && comparedFiles.file2)) {
      let systemMessage = "";
      
      if (selectedFile) {
        systemMessage = `Analyzing file: ${selectedFile.name}`;
      } else if (comparedFiles.file1 && comparedFiles.file2) {
        systemMessage = `Comparing files: ${comparedFiles.file1.name} and ${comparedFiles.file2.name}`;
      }
      
      if (systemMessage) {
        setMessages([
          {
            id: `system-${Date.now()}`,
            role: "system",
            content: systemMessage,
            timestamp: Date.now()
          }
        ]);
      }
    }
  }, [selectedFile, comparedFiles.file1, comparedFiles.file2]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };  const handleModelChange = (newModel: OllamaModel | string) => {
    setModel(newModel);
    // Update serverConfig when model changes
    const modelName = typeof newModel === 'string' ? newModel : String(newModel);
    setServerConfig(prev => ({
      ...prev,
      modelName
    }));
  };
  const handleServerConfigChange = (config: ServerConfig) => {
    setServerConfig(config);
    // Also update the model state when server config changes
    if (config.modelName && config.modelName !== model) {
      setModel(config.modelName);
    }
  };
  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input,
      timestamp: Date.now()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Prepare context for AI
      let contextualPrompt = input;
        // Add file context if available (but AI should work without files too)
      if (selectedFile) {
        contextualPrompt = `I'm analyzing a file: ${selectedFile.name}. ${input}`;
      } else if (comparedFiles?.file1 && comparedFiles?.file2) {
        contextualPrompt = `I'm comparing two files: ${comparedFiles.file1.name} and ${comparedFiles.file2.name}. ${input}`;
          // Add comparison results if available - with proper array checks
        if (comparisonResult) {
          const addedCount = Array.isArray(comparisonResult.added) ? comparisonResult.added.length : 0;
          const removedCount = Array.isArray(comparisonResult.removed) ? comparisonResult.removed.length : 0;
          const changedCount = Array.isArray(comparisonResult.changed) ? comparisonResult.changed.length : 0;
          
          const summary = `Comparison shows: ${addedCount} added components, ${removedCount} removed components, ${changedCount} changed components.`;
          contextualPrompt = `${contextualPrompt}\n\nComparison results: ${summary}`;
        }
      }
      // If no files, just use the input as-is (AI assistant works standalone)      // Use real AI service
      if (serverConfig.type === "ollama") {
        // Create chat service instance with the correct Ollama URL
        const ollamaBaseUrl = `${serverConfig.ollamaUrl || "http://localhost:11434"}/v1`;
        const chatService = new ChatService(ollamaBaseUrl);
        
        // Ensure we have valid messages array and combine with current user message
        const currentMessages = Array.isArray(messages) ? messages : [];
        const allMessages = [...currentMessages, { ...userMessage, content: contextualPrompt }];
        
        const response = await chatService.sendMessage(allMessages, serverConfig);
        
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response?.choices?.[0]?.message?.content || "Sorry, I couldn't process your request.",
          timestamp: Date.now()
        };        setMessages((prev) => {
          const prevMessages = Array.isArray(prev) ? prev : [];
          return [...prevMessages, assistantMessage];
        });
        toast("Response received from AI");} else {
        // MCP fallback (simulated for now)
        const activeTools = Array.isArray(serverConfig.mcpConfig?.tools) ? 
          serverConfig.mcpConfig.tools.filter(t => t.enabled) : [];
        
        const responseText = `[MCP: ${serverConfig.mcpConfig?.serverType}] This is a simulated response using the MCP server at ${serverConfig.mcpConfig?.url}. Using ${activeTools.length} active tools: ${activeTools.map(t => t.name).join(", ")}.

Your query: "${input}"

This would be processed by the MCP server with the available tools.`;

        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: responseText,
          timestamp: Date.now()
        };        setMessages((prev) => {
          const prevMessages = Array.isArray(prev) ? prev : [];
          return [...prevMessages, assistantMessage];
        });
        toast("MCP response (simulated)");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}. Please make sure Ollama is running and try again.`,
        timestamp: Date.now()
      };      setMessages((prev) => {
        const prevMessages = Array.isArray(prev) ? prev : [];
        return [...prevMessages, errorMessage];
      });
      toast(`Failed to get AI response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };  const resetChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: "👋 Hi! I'm your AI assistant powered by Ollama. I can help you with:\n\n• 📁 Analyzing uploaded files (BOMs, netlists, etc.)\n• 🔍 Comparing file differences\n• 💡 Explaining technical concepts\n• 🤔 Answering questions on any topic\n\nI'm available even without uploading files! You can select different AI models from the dropdown above. What would you like to know?",
        timestamp: Date.now()
      }
    ]);
    toast.success("Chat history cleared");
  };

  const getActiveTools = (): MCPTool[] => {
    if (serverConfig.type !== "mcp" || !serverConfig.mcpConfig) return [];
    return serverConfig.mcpConfig.tools.filter(tool => tool.enabled);
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="px-4 py-3 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center">
            <Bot className="mr-2 h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setShowSettings(!showSettings)}
              className={showSettings ? "bg-accent" : ""}
            >
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={resetChat}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {showSettings && (
          <div className="mt-2 space-y-2">
            <ModelSelector 
              selectedModel={model} 
              onModelChange={handleModelChange} 
              serverConfig={serverConfig}
              onServerConfigChange={handleServerConfigChange}
            />
            
            {serverConfig.type === "mcp" && getActiveTools().length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {getActiveTools().map(tool => (
                  <Badge key={tool.id} variant="secondary" className="flex items-center">
                    <span className="mr-1">
                      {tool.name}
                    </span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col p-0 flex-1">
        <ScrollArea className="flex-1 p-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-center p-8">
              <div className="space-y-2">
                <Bot className="h-10 w-10 text-primary/40 mx-auto" />
                <h3 className="text-lg font-medium">AI Assistant</h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {selectedFile 
                    ? `Ask questions about the selected file "${selectedFile.name}"` 
                    : comparisonResult 
                      ? "Ask questions about the comparison results"
                      : "Select a file or compare files to start a conversation"}
                </p>
                {serverConfig.type === "mcp" && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    <div className="flex items-center justify-center">
                      <Server className="h-3 w-3 mr-1" />
                      <span>Connected to MCP Server: {serverConfig.mcpConfig?.url}</span>
                    </div>
                    <div className="mt-1">
                      {getActiveTools().length} tools enabled
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : message.role === "system"
                        ? "bg-muted text-muted-foreground text-sm"
                        : "bg-accent text-accent-foreground"
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      {message.role === "user" ? (
                        <User className="h-4 w-4" />
                      ) : message.role === "system" ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.role === "user"
                          ? "You"
                          : message.role === "system"
                          ? "System"
                          : "AI Assistant"}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <div className="text-xs opacity-50 mt-1 text-right">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-accent text-accent-foreground max-w-[80%] px-4 py-3 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <div className="flex space-x-1">
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="h-2 w-2 bg-current rounded-full animate-bounce"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>
        <div className="p-4 border-t mt-auto">
          <div className="flex space-x-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your files..."
              className="resize-none min-h-[60px]"
              disabled={isLoading || (!selectedFile && !comparisonResult)}
            />
            <Button
              size="icon"
              onClick={handleSendMessage}
              disabled={!input.trim() || isLoading || (!selectedFile && !comparisonResult)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIChat;
