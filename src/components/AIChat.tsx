import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, RefreshCw, Server, Settings, Database, Upload, Info, Search, Trash2, AlertCircle, CheckCircle, XCircle, Eye, Loader2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import ModelSelector from "./ModelSelector";
import MarkdownMessage from "./MarkdownMessage";
import { ThemeSelector } from "./ThemeSelector";
import { OllamaModel, ChatMessage, ComparisonResult, UploadedFile, ServerConfig, MCPTool } from "@/types";
import { toast } from "@/components/ui/sonner";
import { ChatService } from "@/services/chatService";
import { ragService, RAGResult } from "@/services/ragService";
import type { RAGStats, RAGStatus } from "@/services/ragService";

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
      content: `# 👋 Welcome to AI Assistant with Enhanced BOM Analysis!

I'm your AI assistant powered by Ollama with **RAG (Retrieval-Augmented Generation)** and **Enhanced BOM Analysis** enabled by default!

## 🚀 What I can help you with:

### 📁 **Smart Component Analysis** (🔥 **Enhanced by Default**)
- **Resistor queries**: "show all resistors in new bom"
- **Capacitor analysis**: "find capacitors from old BOM"
- **IC identification**: "list ICs in a_new.xml"
- **Component comparison**: "compare resistors between old and new"
- **Smart filtering**: Understands component types and source files

### 💡 **Enhanced Features**
- **Markdown support** with syntax highlighting
- **Component type detection** (R=Resistors, C=Capacitors, U=ICs)
- **Source file filtering** (new bom vs old bom)
- **Mismatch explanations** when search results don't match

### 🤔 **General Assistance**
- Analyzing uploaded files (BOMs, netlists, etc.)
- Comparing file differences
- Processing technical documents
- Answering questions on any topic

## 📝 **Try These Enhanced Queries:**

\`\`\`
"show all resistors in new bom"
"find 0402 capacitors"
"list power ICs"
"compare component changes"
\`\`\`

## ⚙️ **Customize System Prompt**

Click the **Settings (⚙️)** button above to:
- View the current **Enhanced BOM Analysis** prompt
- Switch to **Technical Assistant** mode
- Create your own **custom system prompt**

**Enhanced BOM Analysis is active - try asking about components!**`,
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);  const [useRAG, setUseRAG] = useState(true);
  const [ragResults, setRagResults] = useState<RAGResult[]>([]);
  const [showRagResults, setShowRagResults] = useState(false);
  const [isUploadingToKB, setIsUploadingToKB] = useState(false);
  
  // RAG management states
  const [ragStats, setRagStats] = useState<RAGStats | null>(null);
  const [ragStatus, setRagStatus] = useState<RAGStatus | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [isClearingKB, setIsClearingKB] = useState(false);
  const [showRagDetails, setShowRagDetails] = useState(false);  const [serverConfig, setServerConfig] = useState<ServerConfig>({
    type: "ollama",
    modelName: "llama3.2",
    ollamaUrl: "http://localhost:11434",    customSystemPrompt: `You are a knowledgeable electronics engineer and BOM (Bill of Materials) analyst. You have access to detailed component information from uploaded BOMs.

COMPONENT TYPE IDENTIFICATION:
- Resistors: REFDES starting with 'R' OR description containing 'RES', 'RESISTOR'
- Capacitors: REFDES starting with 'C' OR description containing 'CAP', 'CAPACITOR' 
- ICs: REFDES starting with 'U' OR description containing 'IC', 'AMPLIFIER', 'BUFFER'
- Transistors: REFDES starting with 'Q' OR description containing 'TRANS', 'MOSFET'
- Diodes: REFDES starting with 'D' OR description containing 'DIODE'

SOURCE FILE FILTERING:
- "new bom" = components from a_new.xml only
- "old bom" = components from a_old.xml only

QUERY INTERPRETATION:
- "show all resistors" = find components with RES/RESISTOR in description OR R prefix
- "resistors in new bom" = resistors from a_new.xml only
- "compare resistors" = show resistor differences between old and new

CHANGE DETECTION QUERIES:
- "changed components" = Look for components that appear in both files but have different values
- "what changed from old to new" = Focus on actual differences, not duplicates
- "component changes" = Suggest using the Compare Files feature for detailed change analysis
- If RAG returns identical components from both files, explain this is NOT a change

RAG LIMITATIONS FOR CHANGES:
- RAG shows individual components, not comparisons
- For detailed change analysis, recommend: "Use the Compare Files feature above"
- Explain when results don't actually show changes

When answering questions:
- Use the provided component data to give accurate, specific responses
- Reference components by their REFDES when relevant
- Include part numbers, descriptions, and package types as appropriate
- If RAG returns wrong component types, explain the mismatch and suggest better search terms
- If asked about changes but RAG shows duplicates, clarify this limitation
- Be precise about technical specifications`,
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
  }, [messages]);  useEffect(() => {
    // Load RAG stats when settings panel is opened
    if (showSettings && !ragStats) {
      loadRagStats();
    }
  }, [showSettings]);

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
  const uploadToKnowledgeBase = async () => {
    if (!selectedFile) {
      toast.error("Please select a file first");
      return;
    }

    setIsUploadingToKB(true);
    try {
      // Convert UploadedFile back to File object for RAG service
      const blob = new Blob([selectedFile.content], { type: selectedFile.type });
      const file = new File([blob], selectedFile.name, {
        type: selectedFile.type,
        lastModified: selectedFile.lastModified
      });
        const result = await ragService.addBOMToKnowledge(file, selectedFile.name);
      toast.success(`Added ${result.component_count} components to knowledge base`);
    } catch (error) {
      console.error("Failed to upload to knowledge base:", error);
      toast.error(`Failed to upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploadingToKB(false);    }  };
  // RAG Management Functions
  const loadRagStats = async () => {
    try {
      const status = await ragService.getRAGStatus();
      // Convert RAGStatus to RAGStats format
      const stats = {
        components: status.database.components,
        patterns: status.database.patterns,
        total: status.database.total_items,
        status: status.status
      };
      setRagStats(stats);
    } catch (error) {
      console.error("Failed to load RAG stats:", error);
    }
  };

  const loadRagStatus = async () => {
    setIsRefreshingStatus(true);
    try {
      const status = await ragService.getRAGStatus();
      setRagStatus(status);
    } catch (error) {
      console.error("Failed to load RAG status:", error);
      toast.error("Failed to load RAG status");
    } finally {
      setIsRefreshingStatus(false);
    }
  };

  const clearKnowledgeBase = async () => {
    if (!confirm("Are you sure you want to clear ALL data from the knowledge base? This action cannot be undone.")) {
      return;
    }

    setIsClearingKB(true);
    try {
      const result = await ragService.clearKnowledgeBase();
      toast.success(`${result.message}`);
      await loadRagStats(); // Refresh stats
      await loadRagStatus(); // Refresh status
    } catch (error) {
      console.error("Failed to clear knowledge base:", error);
      toast.error(`Failed to clear knowledge base: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsClearingKB(false);
    }
  };

  const refreshRAGStatus = async () => {
    await loadRagStatus();
    await loadRagStats();
  };

  const toggleRagDetails = async () => {
    if (!showRagDetails) {
      // Load data when showing details
      await loadRagStats();
      await loadRagStatus();
    }
    setShowRagDetails(!showRagDetails);
  };
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };  const copyRagResults = () => {
    const debugInfo = {
      timestamp: new Date().toISOString(),
      total_results: ragResults.length,
      average_similarity: ragResults.length > 0 ? (ragResults.reduce((sum, r) => sum + r.similarity, 0) / ragResults.length) : 0,
      results: ragResults.map((result, index) => {
        const metadata = result.metadata as any; // Cast to handle dynamic structure
        return {
          index: index + 1,
          similarity: result.similarity,
          component: {
            // Handle both new and legacy field names
            part_number: metadata.part_number || metadata['PART-NUM'] || '',
            component_ref: metadata.component_ref || metadata['REFDES'] || '',
            description: metadata.description || metadata['DESCRIPTION'] || '',
            value: metadata.value || metadata['PART-NAME'] || '',
            package: metadata.package || metadata['PACKAGE'] || '',
            type: metadata.type || metadata['OPT'] || 'component',
            quantity: metadata['QTY'] || '',
            // Include all raw metadata for debugging
            raw_metadata: metadata
          },
          source_file: metadata.source_file || metadata.source || metadata['source'] || '',
          retrieved_content: (result as any).document || (result as any).content || 'No content available',
          data_format: metadata['REFDES'] ? 'backend_format' : 'frontend_format'
        };
      })
    };
    
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    toast.success("RAG debug info copied to clipboard");
  };

  const handleModelChange = (newModel: OllamaModel | string) => {
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
  };  const handleSendMessage = async () => {
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
      // If no files, just use the input as-is (AI assistant works standalone)

      // Use real AI service
      if (serverConfig.type === "ollama") {
        const ollamaBaseUrl = `${serverConfig.ollamaUrl || "http://localhost:11434"}/v1`;
        const currentMessages = Array.isArray(messages) ? messages : [];
        const allMessages = [...currentMessages, { ...userMessage, content: contextualPrompt }];
        
        let response: any;
        let ragResultsForMessage: RAGResult[] = [];
          // Use RAG if available and enabled
        if (useRAG) {
          // Try RAG-enhanced chat first
          try {            const ragResponse = await ragService.sendRAGMessage({
              model: serverConfig.modelName || "llama3.2",
              messages: allMessages.map(msg => ({
                role: msg.role,
                content: msg.content
              })),
              ollama_url: serverConfig.ollamaUrl || "http://localhost:11434",
              custom_system_prompt: serverConfig.customSystemPrompt
            });
            
            response = ragResponse;
            ragResultsForMessage = ragResponse.rag_results || [];
            setRagResults(ragResultsForMessage);
            
            if (ragResultsForMessage.length > 0) {
              setShowRagResults(true);
              toast.success(`Found ${ragResultsForMessage.length} relevant knowledge items`);
            }
          } catch (ragError) {
            console.warn("RAG chat failed, falling back to direct chat:", ragError);
            // Fall back to direct chat
            const chatService = new ChatService(ollamaBaseUrl);
            response = await chatService.sendMessage(allMessages, serverConfig);
          }
        } else {
          // Direct chat without RAG
          const chatService = new ChatService(ollamaBaseUrl);
          response = await chatService.sendMessage(allMessages, serverConfig);
        }
        
        const assistantMessage: ChatMessage = {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          content: response?.choices?.[0]?.message?.content || response?.content || "Sorry, I couldn't process your request.",
          timestamp: Date.now()
        };

        setMessages((prev) => {
          const prevMessages = Array.isArray(prev) ? prev : [];
          return [...prevMessages, assistantMessage];
        });
        
        if (ragResultsForMessage.length > 0) {
          toast("RAG-enhanced response received");
        } else {
          toast("Response received from AI");
        }
      } else {
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
        };

        setMessages((prev) => {
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
      };

      setMessages((prev) => {
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
        content: "👋 Hi! I'm your AI assistant powered by Ollama with RAG (Retrieval-Augmented Generation). I can help you with:\n\n• 📁 Analyzing uploaded files (BOMs, netlists, etc.)\n• 🔍 Comparing file differences\n• 💡 Explaining technical concepts\n• 🤔 Answering questions on any topic\n• 🧠 Using knowledge from uploaded BOMs for enhanced responses\n\nI'm available even without uploading files! You can select different AI models from the dropdown above. What would you like to know?",
        timestamp: Date.now()
      }
    ]);
    setRagResults([]);
    setShowRagResults(false);
    toast.success("Chat history cleared");
  };

  const getActiveTools = (): MCPTool[] => {
    if (serverConfig.type !== "mcp" || !serverConfig.mcpConfig) return [];
    return serverConfig.mcpConfig.tools.filter(tool => tool.enabled);
  };
  return (
    <div className="h-full flex flex-col space-y-2">
      <Card className="flex-1 flex flex-col">
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Bot className="mr-2 h-5 w-5" />
              AI Assistant
              {useRAG && (
                <Badge variant="secondary" className="ml-2">
                  <Database className="h-3 w-3 mr-1" />
                  RAG
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setShowSettings(!showSettings)}
                      className={showSettings ? "bg-accent" : ""}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Settings</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              
              {selectedFile && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        onClick={uploadToKnowledgeBase}
                        disabled={isUploadingToKB}
                      >
                        {isUploadingToKB ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add to Knowledge Base</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" onClick={resetChat}>
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Chat</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
            {showSettings && (
            <div className="mt-2 space-y-3">
              <ModelSelector 
                selectedModel={model} 
                onModelChange={handleModelChange} 
                serverConfig={serverConfig}
                onServerConfigChange={handleServerConfigChange}
              />
              
              <Separator />
                {/* Application Settings Section */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-sm font-medium flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Application Settings
                  </span>
                </div>
                
                <div className="space-y-3 p-3 border rounded-lg bg-card">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium">General Configuration</h4>
                    <p className="text-xs text-muted-foreground">
                      Application-wide settings and configuration options.
                    </p>
                      <div className="grid grid-cols-1 gap-2 text-xs">
                      <ThemeSelector variant="compact" />
                      
                      <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                        <span className="font-medium">File Auto-Detection</span>
                        <span className="text-green-600 font-medium">✓ Enabled</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                        <span className="font-medium">Export Formats</span>
                        <span className="text-muted-foreground">CSV, JSON, Excel</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                        <span className="font-medium">Max File Size</span>
                        <span className="text-muted-foreground">50 MB</span>
                      </div>
                      
                      <div className="flex justify-between items-center p-2 bg-muted/20 rounded">
                        <span className="font-medium">Auto-Compare</span>
                        <span className="text-green-600 font-medium">✓ Enabled</span>
                      </div>
                    </div>
                    
                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-xs">
                      <div className="font-medium text-blue-700 dark:text-blue-300 mb-1">💡 Quick Tip</div>
                      <div className="text-blue-600 dark:text-blue-400">
                        Upload BOMs to populate the Knowledge Base below for enhanced AI responses with component-specific information.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Enhanced RAG (Knowledge Base) Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium flex items-center">
                    <Database className="h-4 w-4 mr-2" />
                    RAG (Knowledge Base)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setUseRAG(!useRAG)}
                    >
                      {useRAG ? "Enabled" : "Disabled"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleRagDetails}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      {showRagDetails ? "Hide" : "Show"} Details
                    </Button>
                  </div>
                </div>                {/* RAG Quick Stats */}
                {ragStats && (
                  <div className="grid grid-cols-3 gap-2 p-3 bg-muted/30 rounded-lg text-xs">
                    <div className="text-center">
                      <div className="font-bold text-lg">{ragStats.total || 0}</div>
                      <div className="text-muted-foreground">Total Items</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{ragStats.components || 0}</div>
                      <div className="text-muted-foreground">Components</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-lg">{ragStats.patterns || 0}</div>
                      <div className="text-muted-foreground">Patterns</div>
                    </div>
                  </div>
                )}

                {/* Detailed RAG Status */}
                {showRagDetails && (
                  <div className="space-y-3 p-3 border rounded-lg bg-card">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium">System Status</h4>
                      <div className="flex items-center gap-2">
                        {ragStatus && (
                          <Badge 
                            variant={ragStatus.status === 'operational' ? 'default' : 
                                     ragStatus.status === 'degraded' ? 'secondary' : 'destructive'}
                            className="text-xs"
                          >
                            {ragStatus.status || ragStatus.overall_status}
                          </Badge>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={refreshRAGStatus}
                          disabled={isRefreshingStatus}
                        >
                          {isRefreshingStatus ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </div>                    {ragStatus && (
                      <div className="space-y-3 text-sm">
                        {/* Database Status */}
                        <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                          <div className="flex items-center">
                            {ragStatus.database.accessible ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            <span className="font-medium">Database</span>
                          </div>
                          <div className="text-right text-xs">
                            <div>{ragStatus.database.accessible ? 'Connected' : 'Disconnected'}</div>
                            <div className="text-muted-foreground">
                              {ragStatus.database.type || 'memory'} • {ragStatus.database.total_items || 0} items
                            </div>
                          </div>
                        </div>

                        {/* Embedding Service Status */}
                        <div className="flex items-center justify-between p-2 bg-muted/20 rounded">
                          <div className="flex items-center">
                            {ragStatus.embedding_service.accessible ? (
                              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-2 text-red-500" />
                            )}
                            <span className="font-medium">Embedding Service</span>
                          </div>
                          <div className="text-right text-xs">
                            <div>{ragStatus.embedding_service.accessible ? 'Connected' : 'Disconnected'}</div>
                            <div className="text-muted-foreground">
                              {ragStatus.embedding_service.model}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="pt-2 space-y-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={clearKnowledgeBase}
                        disabled={isClearingKB}
                        className="w-full"
                      >
                        {isClearingKB ? (
                          <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3 mr-2" />
                        )}
                        Clear Knowledge Base
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Upload BOM files above to populate the knowledge base.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              {serverConfig.type === "mcp" && getActiveTools().length > 0 && (
                <>
                  <Separator />
                  <div className="flex flex-wrap gap-1">
                    {getActiveTools().map(tool => (
                      <Badge key={tool.id} variant="secondary" className="flex items-center">
                        <span className="mr-1">
                          {tool.name}
                        </span>
                      </Badge>
                    ))}
                  </div>
                </>              )}
            </div>          )}
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
                        </span>                      </div>
                      <div className="message-content">
                        <MarkdownMessage 
                          content={message.content}
                          className={message.role === "system" ? "text-xs" : ""}
                        />
                      </div>
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
          
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="resize-none min-h-[60px]"
                disabled={isLoading}
              />
              <Button
                size="icon"
                onClick={handleSendMessage}
                disabled={!input.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
        {/* Enhanced RAG Results Panel */}
      {ragResults.length > 0 && (
        <Collapsible open={showRagResults} onOpenChange={setShowRagResults}>
          <Card className="border-primary/20 bg-primary/5">
            <CollapsibleTrigger asChild>
              <CardHeader className="px-4 py-3 cursor-pointer hover:bg-accent/50">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center">
                    <Search className="mr-2 h-4 w-4 text-primary" />
                    Knowledge Retrieved ({ragResults.length} items)
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Debug Mode
                    </Badge>
                  </CardTitle>                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" className="text-xs">
                      Avg: {ragResults.length > 0 ? (ragResults.reduce((sum, r) => sum + r.similarity, 0) / ragResults.length * 100).toFixed(1) : 0}%
                    </Badge>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="outline" size="sm" onClick={copyRagResults}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        Copy RAG debug info to clipboard
                      </TooltipContent>
                    </Tooltip>
                    <Button variant="ghost" size="sm">
                      {showRagResults ? "Hide Details" : "Show Details"}
                    </Button>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  RAG retrieved {ragResults.length} relevant chunks from knowledge base to enhance the AI response
                </div>
              </CardHeader>
            </CollapsibleTrigger><CollapsibleContent>
              <CardContent className="px-4 py-2">
                <ScrollArea className="h-64">
                  <div className="space-y-3">
                    {ragResults.map((result, index) => (
                      <div key={index} className="border rounded-lg p-3 bg-card">
                        {/* Header with metadata */}
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              #{index + 1}
                            </Badge>
                            <span className="text-xs font-medium text-muted-foreground">
                              Similarity: {(result.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          <Badge 
                            variant={result.similarity > 0.8 ? "default" : result.similarity > 0.6 ? "secondary" : "outline"}
                            className="text-xs"
                          >
                            {result.similarity > 0.8 ? "High Match" : result.similarity > 0.6 ? "Good Match" : "Low Match"}
                          </Badge>
                        </div>                        {/* Component/Part Information */}
                        <div className="mb-2">
                          <div className="text-sm font-semibold text-foreground">
                            {result.metadata.part_number || 
                             (result.metadata as any)['PART-NUM'] || 
                             result.metadata.component_ref || 
                             (result.metadata as any)['REFDES'] || 
                             "Unknown Component"}
                          </div>
                          {(result.metadata.description || (result.metadata as any)['DESCRIPTION']) && (
                            <div className="text-xs text-muted-foreground">
                              {result.metadata.description || (result.metadata as any)['DESCRIPTION']}
                            </div>
                          )}
                          <div className="flex gap-4 text-xs text-muted-foreground mt-1">
                            {(result.metadata.value || (result.metadata as any)['PART-NAME']) && (
                              <span>Value: {result.metadata.value || (result.metadata as any)['PART-NAME']}</span>
                            )}
                            {(result.metadata.package || (result.metadata as any)['PACKAGE']) && (
                              <span>Package: {result.metadata.package || (result.metadata as any)['PACKAGE']}</span>
                            )}
                            {(result.metadata.type || (result.metadata as any)['OPT']) && (
                              <span>Type: {result.metadata.type || (result.metadata as any)['OPT']}</span>
                            )}
                            {(result.metadata as any)['QTY'] && (
                              <span>Qty: {(result.metadata as any)['QTY']}</span>
                            )}
                          </div>
                        </div>

                        {/* Retrieved Text Content */}
                        <div className="mb-2">
                          <div className="text-xs font-medium text-foreground mb-1">Retrieved Content:</div>
                          <div className="bg-muted/30 rounded p-2 text-xs">
                            {result.document ? (
                              <MarkdownMessage 
                                content={result.document}
                                className="text-xs"
                              />
                            ) : (
                              <div className="text-muted-foreground italic">
                                Raw component data - no formatted content available
                              </div>
                            )}
                          </div>
                        </div>                        {/* Source Information */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>
                            Source: {result.metadata.source_file || 
                                   (result.metadata as any).source || 
                                   (result.metadata as any)['source'] || 
                                   "Unknown"}
                          </span>
                          <span>
                            Component: {result.metadata.component_ref || 
                                      (result.metadata as any)['REFDES'] || 
                                      "N/A"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}    </div>
  );
};

export default AIChat;
