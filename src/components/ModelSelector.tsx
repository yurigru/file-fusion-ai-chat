import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Server, Wrench, Plus, Trash, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { OllamaService } from "@/services/ollamaService";
import type { 
  OllamaModelInfo, 
  ModelSelectorProps, 
  MCPServerConfig, 
  MCPServerType 
} from "@/types";

// Default MCP tools configuration
const defaultTools = [
  { id: "file_operations", name: "File Operations", description: "Read and write files", enabled: true },
  { id: "web_search", name: "Web Search", description: "Search the web", enabled: true },
  { id: "code_analysis", name: "Code Analysis", description: "Analyze code", enabled: true },
  { id: "data_processing", name: "Data Processing", description: "Process data", enabled: true }
];

// Static model list for fallback
const staticOllamaModels = [
  { name: "llama3.2:latest", value: "llama3.2:latest", displayName: "Llama 3.2 (Latest)", description: "Most recent Llama 3.2 model" },
  { name: "llama3.2", value: "llama3.2", displayName: "Llama 3.2", description: "Latest Llama 3.2 release" },
  { name: "llama3.1:latest", value: "llama3.1:latest", displayName: "Llama 3.1 (Latest)", description: "Most recent Llama 3.1 model" },
  { name: "llama3.1", value: "llama3.1", displayName: "Llama 3.1", description: "Latest Llama 3.1 release" },
  { name: "llama3:latest", value: "llama3:latest", displayName: "Llama 3 (Latest)", description: "Most recent Llama 3 model" },
  { name: "llama3", value: "llama3", displayName: "Llama 3", description: "Latest Llama 3 release" },
  { name: "codellama:latest", value: "codellama:latest", displayName: "Code Llama (Latest)", description: "Code-focused Llama model" },
  { name: "codellama", value: "codellama", displayName: "Code Llama", description: "Code generation model" },
];

// MCP Server types
const mcpServerTypes = [
  { value: "local", label: "Local MCP Server", description: "Run MCP server locally" },
  { value: "remote", label: "Remote MCP Server", description: "Connect to remote MCP server" },
  { value: "custom", label: "Custom Configuration", description: "Custom MCP setup" },
];

const ModelSelector = ({ 
  selectedModel, 
  onModelChange, 
  serverConfig, 
  onServerConfigChange 
}: ModelSelectorProps) => {
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState<"ollama" | "mcp">(serverConfig.type);
  
  // Ollama state
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(serverConfig.ollamaUrl || "http://localhost:11434");
  const [ollamaService, setOllamaService] = useState<OllamaService>();
  const [hasAutoSelected, setHasAutoSelected] = useState(false);
  
  const [mcpConfig, setMcpConfig] = useState<MCPServerConfig>(
    serverConfig.mcpConfig || {
      url: "http://localhost:8080",
      serverType: "local",
      contextSize: 4096,
      maxTokens: 1024,
      tools: [...defaultTools]
    }
  );
  
  // Force immediate connection on component mount
  useEffect(() => {
    console.log("ModelSelector mounted, forcing immediate Ollama connection...");
    const service = new OllamaService(ollamaUrl);
    setOllamaService(service);
    checkOllamaConnection(service);
  }, []); // Empty dependency array to run only once on mount

  // Initialize Ollama service when URL changes and auto-connect immediately
  useEffect(() => {
    const service = new OllamaService(ollamaUrl);
    setOllamaService(service);
    // Auto-connect immediately on component mount or URL change
    console.log("Initializing Ollama connection...");
    checkOllamaConnection(service);
  }, [ollamaUrl]);// Auto-select llama3.2 if available and no model is selected or using generic default
  // Only auto-select once on initial load, don't override manual selections
  useEffect(() => {
    if (ollamaConnected && Array.isArray(ollamaModels) && ollamaModels.length > 0 && !hasAutoSelected) {
      // Only auto-select if we don't have a valid selected model from the available models
      const isValidSelectedModel = selectedModel && ollamaModels.find(m => m && m.name === selectedModel);
      
      if (!isValidSelectedModel) {
        // Look for llama3.2 variants in order of preference
        const preferredModel = ollamaModels.find(m => 
          m && m.name && (
            m.name === "llama3.2:latest" ||
            m.name === "llama3.2" || 
            m.name.startsWith("llama3.2:")
          )
        );
          if (preferredModel) {          console.log(`Auto-selecting preferred model: ${preferredModel.name}`);
          onModelChange(preferredModel.name);
          onServerConfigChange({
            ...serverConfig,
            type: "ollama",
            modelName: preferredModel.name,
            ollamaUrl: ollamaUrl
          });
          toast({
            title: "Auto-selected model",
            description: `🤖 Auto-selected model: ${preferredModel.name}`,
          });
          setHasAutoSelected(true);
        } else {
          // Fallback to first available model if llama3.2 not found
          const firstModel = ollamaModels.find(m => m && m.name);
          if (firstModel) {            console.log(`llama3.2 not found, selecting first available: ${firstModel.name}`);
            onModelChange(firstModel.name);
            onServerConfigChange({
              ...serverConfig,
              type: "ollama",
              modelName: firstModel.name,
              ollamaUrl: ollamaUrl
            });
            toast({
              title: "Model selected",
              description: `🤖 Selected first available model: ${firstModel.name}`,
            });
            setHasAutoSelected(true);
          }
        }
      } else {
        // Valid model already selected, mark as auto-selected to prevent future overrides
        setHasAutoSelected(true);
      }
    }
  }, [ollamaConnected, ollamaModels, selectedModel, hasAutoSelected]);
  // Auto-refresh models every 30 seconds when connected (disabled for better UX)
  // useEffect(() => {
  //   if (!ollamaConnected || !ollamaService) return;

  //   const interval = setInterval(() => {
  //     console.log("Auto-refreshing models...");
  //     checkOllamaConnection(ollamaService);
  //   }, 30000); // 30 seconds

  //   return () => clearInterval(interval);
  // }, [ollamaConnected, ollamaService]);
  // Check Ollama connection and fetch models
  const checkOllamaConnection = async (service: OllamaService) => {
    console.log("Checking Ollama connection...");
    setIsLoadingModels(true);
    try {
      console.log("Testing Ollama server at:", ollamaUrl);
      const isRunning = await service.isServerRunning();
      setOllamaConnected(isRunning);
        if (isRunning) {
        console.log("Ollama server is running, fetching models...");
        const models = await service.getModels();
        // Ensure models is always an array
        const safeModels = Array.isArray(models) ? models : [];
        setOllamaModels(safeModels);        console.log(`Successfully found ${safeModels.length} models:`, safeModels.map(m => m?.name || 'unnamed'));
        toast({
          title: "Connected to Ollama",
          description: `✅ Connected to Ollama - Found ${safeModels.length} models`,
        });
      } else {        setOllamaModels([]);
        console.log("Ollama server is not running");
        toast({
          title: "Connection failed",
          description: "❌ Cannot connect to Ollama server. Make sure Ollama is running.",
          variant: "destructive",
        });
      }
    } catch (error) {      console.error("Error connecting to Ollama:", error);
      setOllamaConnected(false);
      setOllamaModels([]);
      toast({
        title: "Connection error",
        description: "❌ Failed to connect to Ollama server",
        variant: "destructive",
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Refresh models
  const refreshOllamaModels = () => {
    if (ollamaService) {
      checkOllamaConnection(ollamaService);
    }  };
  // Helper functions
  const getModelDisplayName = (modelName: string): string => {
    if (!modelName) return "Select model...";
    
    const staticModel = Array.isArray(staticOllamaModels) && staticOllamaModels.find(m => m && m.value === modelName);
    if (staticModel) return staticModel.displayName;
    
    const ollamaModel = Array.isArray(ollamaModels) && ollamaModels.find(m => m && m.name === modelName);
    if (ollamaModel) return ollamaModel.name;
    
    return modelName;
  };

  const formatModelSize = (sizeInBytes: number): string => {
    if (!sizeInBytes || isNaN(sizeInBytes)) return "Unknown size";
    const gb = sizeInBytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const handleTabChange = (value: string) => {
    const tabValue = value as "ollama" | "mcp";
    setSelectedTab(tabValue);
    
    // Update server config when changing tabs
    if (tabValue === "ollama") {
      onServerConfigChange({
        type: "ollama",
        modelName: selectedModel as string,
        ollamaUrl: ollamaUrl
      });
    } else {
      onServerConfigChange({
        type: "mcp",
        modelName: selectedModel as string,
        mcpConfig: mcpConfig
      });
    }
  };

  const handleMCPServerChange = (serverType: MCPServerType) => {
    let newUrl;
    switch (serverType) {
      case "local":
        newUrl = "http://localhost:8080";
        break;
      case "remote":
        newUrl = "https://api.mcp-server.com";
        break;
      case "custom":
        newUrl = mcpConfig.url || "https://";
        break;
      default:
        newUrl = "https://api.mcp-server.com";
    }
    
    const updatedConfig = {
      ...mcpConfig,
      url: newUrl,
      serverType
    };
    
    setMcpConfig(updatedConfig);    
    onServerConfigChange({
      ...serverConfig,
      type: "mcp",
      mcpConfig: updatedConfig
    });
  };

  const toggleTool = (toolId: string) => {
    const updatedTools = mcpConfig.tools.map(tool => 
      tool.id === toolId ? { ...tool, enabled: !tool.enabled } : tool
    );
    
    const updatedConfig = {
      ...mcpConfig,
      tools: updatedTools
    };
    
    setMcpConfig(updatedConfig);
    
    onServerConfigChange({
      ...serverConfig,
      type: "mcp",
      mcpConfig: updatedConfig
    });
  };

  return (
    <div className="space-y-2">
      <Tabs value={selectedTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="ollama">Ollama</TabsTrigger>
          <TabsTrigger value="mcp">MCP Server</TabsTrigger>
        </TabsList>
          <TabsContent value="ollama" className="space-y-4">
          {/* Ollama Model Selection */}
          <div className="space-y-2">
            <Label>Model Selection</Label>
            <Select
              value={selectedModel && selectedTab === "ollama" ? selectedModel : ""}
              onValueChange={(value) => {
                onModelChange(value);
                onServerConfigChange({
                  ...serverConfig,
                  type: "ollama",
                  modelName: value,
                  ollamaUrl: ollamaUrl
                });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select model..." />
              </SelectTrigger>
              <SelectContent>
                {/* Connection Status */}
                <div className="p-2 border-b flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${ollamaConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                    <span className="text-sm">
                      {ollamaConnected ? 'Connected' : 'Disconnected'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshOllamaModels}
                    disabled={isLoadingModels}
                    className="h-6 w-6 p-0"
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                  </Button>
                </div>

                {/* Loading State */}
                {isLoadingModels && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Loading models...
                  </div>
                )}

                {/* Available Models from Ollama Server */}
                {ollamaConnected && Array.isArray(ollamaModels) && ollamaModels.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      Available Models ({ollamaModels.length})
                    </div>
                    {ollamaModels.filter(model => model && model.name).map((model) => (
                      <SelectItem key={model.name} value={model.name}>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {model.size ? formatModelSize(model.size) : 'Unknown size'} • {model.details?.parameter_size || 'Unknown params'} • Modified: {model.modified_at ? new Date(model.modified_at).toLocaleDateString() : 'Unknown date'}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* Fallback Static Models - only show if not connected or no models found */}
                {(!ollamaConnected || !Array.isArray(ollamaModels) || ollamaModels.length === 0) && (
                  <>
                    <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                      Popular Models (Download Required)
                    </div>
                    {Array.isArray(staticOllamaModels) && staticOllamaModels.map((model) => (
                      <SelectItem key={model.value} value={model.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{model.displayName}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </>
                )}

                {/* No Models Available */}
                {!isLoadingModels && (!Array.isArray(ollamaModels) || ollamaModels.length === 0) && (!Array.isArray(staticOllamaModels) || staticOllamaModels.length === 0) && (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No models found
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
            {/* Ollama Server Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ollama-url">Ollama Server URL</Label>              <div className="flex space-x-2">
                <Input
                  id="ollama-url"
                  placeholder="http://localhost:11434 or http://192.168.1.100:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  className={!OllamaService.isValidUrl(ollamaUrl) && ollamaUrl.length > 0 ? "border-red-500" : ""}
                />
                <Button
                  variant="outline"
                  onClick={() => {                    if (!OllamaService.isValidUrl(ollamaUrl)) {
                      toast({
                        title: "Invalid URL",
                        description: "Please enter a valid URL (e.g., http://192.168.1.100:11434)",
                        variant: "destructive",
                      });
                      return;
                    }
                    onServerConfigChange({
                      ...serverConfig,
                      ollamaUrl: ollamaUrl
                    });
                    if (ollamaService) {
                      checkOllamaConnection(ollamaService);
                    }
                  }}
                  disabled={isLoadingModels}
                >
                  {isLoadingModels ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Connect"}
                </Button>
              </div>
              <div className="text-xs text-muted-foreground">
                Examples: <br />
                • Local: http://localhost:11434 <br />
                • Remote IP: http://192.168.1.100:11434 <br />
                • Remote hostname: http://my-ollama-server:11434
              </div>
            </div>

            {/* Connection Status Alert */}
            {!ollamaConnected && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Cannot connect to Ollama server. Make sure Ollama is installed and running.
                  <br />
                  <a 
                    href="https://ollama.ai" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-500 underline mt-1 inline-block"
                  >
                    Download Ollama
                  </a>
                </AlertDescription>
              </Alert>
            )}

            {/* Model Download Suggestion */}
            {ollamaConnected && ollamaModels.length > 0 && !ollamaModels.find(m => m.name.startsWith("llama3.2")) && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Llama 3.2 not found. To download it, run in terminal:
                  <br />
                  <code className="bg-muted px-1 py-0.5 rounded text-sm">ollama pull llama3.2</code>
                  <br />
                  <span className="text-xs text-muted-foreground">Or try: llama3.2:3b (smaller), llama3.2:1b (fastest)</span>
                </AlertDescription>
              </Alert>
            )}

            {/* No Models Available */}
            {ollamaConnected && ollamaModels.length === 0 && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  No models found. Download a model to get started:
                  <br />
                  <code className="bg-muted px-1 py-0.5 rounded text-sm">ollama pull llama3.2</code>
                  <br />
                  <span className="text-xs text-muted-foreground">Other options: mistral, codellama, phi3</span>
                </AlertDescription>
              </Alert>            )}            {/* Custom System Prompt */}
            <div className="space-y-2">
              <Label htmlFor="system-prompt">
                Custom System Prompt 
                <span className="text-green-600 font-medium"> (Enhanced BOM Analysis Active)</span>
              </Label>
              <textarea
                id="system-prompt"
                className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Enhanced BOM Analysis prompt is active by default. Modify here to customize AI behavior..."
                value={serverConfig.customSystemPrompt || ""}
                onChange={(e) => {
                  onServerConfigChange({
                    ...serverConfig,
                    customSystemPrompt: e.target.value
                  });
                }}
              />
              <div className="text-xs text-muted-foreground">
                ✅ <strong>Enhanced BOM Analysis</strong> is enabled by default for better component queries. 
                Modify above to customize, or use presets below.
              </div>
              
              {/* Preset System Prompts */}
              <div className="space-y-1">
                <Label className="text-xs">Quick Presets:</Label>
                <div className="flex flex-wrap gap-1">                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 border-green-500 text-green-600"
                    onClick={() => {                      const enhancedBOMPrompt = `You are a knowledgeable electronics engineer and BOM (Bill of Materials) analyst. You have access to detailed component information from uploaded BOMs.

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
- Be precise about technical specifications`;
                      onServerConfigChange({
                        ...serverConfig,
                        customSystemPrompt: enhancedBOMPrompt
                      });
                    }}
                  >
                    📋 Enhanced BOM Analysis (Default)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      onServerConfigChange({
                        ...serverConfig,
                        customSystemPrompt: "You are a helpful AI assistant focused on technical documentation analysis and electronic design."
                      });
                    }}
                  >
                    🔧 Technical Assistant
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    onClick={() => {
                      onServerConfigChange({
                        ...serverConfig,
                        customSystemPrompt: ""
                      });
                    }}
                  >
                    🗑️ Clear
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
          <TabsContent value="mcp" className="space-y-4">
          {/* MCP Server Selection */}
          <div className="space-y-2">
            <Label>MCP Server Type</Label>
            <Select
              value={mcpConfig.serverType}
              onValueChange={(value) => handleMCPServerChange(value as MCPServerType)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select MCP server..." />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1 text-xs font-medium text-muted-foreground">
                  MCP Servers
                </div>
                {mcpServerTypes.map((server) => (
                  <SelectItem key={server.value} value={server.value}>
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{server.label}</span>
                      <span className="text-xs text-muted-foreground">{server.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* MCP Server Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mcp-url">MCP Server URL</Label>
              <Input
                id="mcp-url"
                placeholder="http://localhost:8080"
                value={mcpConfig.url}
                onChange={(e) => {
                  const updatedConfig = {
                    ...mcpConfig,
                    url: e.target.value
                  };
                  setMcpConfig(updatedConfig);
                  onServerConfigChange({
                    ...serverConfig,
                    mcpConfig: updatedConfig
                  });
                }}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="context-size">Context Size</Label>
                <Input
                  id="context-size"
                  type="number"
                  value={mcpConfig.contextSize}
                  onChange={(e) => {
                    const updatedConfig = {
                      ...mcpConfig,
                      contextSize: parseInt(e.target.value) || 4096
                    };
                    setMcpConfig(updatedConfig);
                    onServerConfigChange({
                      ...serverConfig,
                      mcpConfig: updatedConfig
                    });
                  }}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  value={mcpConfig.maxTokens}
                  onChange={(e) => {
                    const updatedConfig = {
                      ...mcpConfig,
                      maxTokens: parseInt(e.target.value) || 1024
                    };
                    setMcpConfig(updatedConfig);
                    onServerConfigChange({
                      ...serverConfig,
                      mcpConfig: updatedConfig
                    });
                  }}
                />
              </div>
            </div>
            
            {/* Tools Configuration */}
            <div className="space-y-2">
              <Label>Available Tools</Label>
              <div className="space-y-2 max-h-32 overflow-y-auto border rounded p-2">
                {mcpConfig.tools.map((tool) => (
                  <div key={tool.id} className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{tool.name}</span>
                      <span className="text-xs text-muted-foreground">{tool.description}</span>
                    </div>
                    <Switch
                      checked={tool.enabled}
                      onCheckedChange={() => toggleTool(tool.id)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelSelector;
