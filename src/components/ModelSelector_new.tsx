import { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Server, Wrench, Plus, Trash, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  OllamaModel, 
  OllamaModelInfo,
  ServerConfig, 
  MCPServerType,
  MCPTool,
  MCPServerConfig
} from "@/types";
import { OllamaService } from "@/services/ollamaService";
import { toast } from "@/components/ui/sonner";

interface ModelSelectorProps {
  selectedModel: OllamaModel | string;
  onModelChange: (model: OllamaModel | string) => void;
  serverConfig: ServerConfig;
  onServerConfigChange: (config: ServerConfig) => void;
}

const staticOllamaModels: { value: OllamaModel; label: string; description: string }[] = [
  { value: "llama3", label: "Llama 3", description: "General purpose model by Meta" },
  { value: "llama3:8b", label: "Llama 3 8B", description: "Smaller, faster Llama 3 variant" },
  { value: "llama3:70b", label: "Llama 3 70B", description: "Largest Llama 3 variant with highest capability" },
  { value: "mistral", label: "Mistral", description: "Efficient language model with strong reasoning" },
  { value: "mixtral", label: "Mixtral", description: "Mixture of experts architecture" },
  { value: "codellama", label: "CodeLlama", description: "Specialized for programming tasks" },
  { value: "phi3", label: "Phi-3", description: "Microsoft's compact performant model" },
  { value: "gemma", label: "Gemma", description: "Google's lightweight model" },
];

const mcpServerTypes = [
  { value: "local", label: "Local MCP Server", description: "Connect to MCP server running locally" },
  { value: "remote", label: "Remote MCP Server", description: "Connect to remote MCP server instance" },
  { value: "custom", label: "Custom MCP Server", description: "Connect to custom MCP server configuration" },
];

const defaultTools: MCPTool[] = [
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
];

const ModelSelector = ({ 
  selectedModel, 
  onModelChange, 
  serverConfig, 
  onServerConfigChange 
}: ModelSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"ollama" | "mcp">(serverConfig.type);
  
  // Ollama state
  const [ollamaModels, setOllamaModels] = useState<OllamaModelInfo[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [ollamaConnected, setOllamaConnected] = useState(false);
  const [ollamaUrl, setOllamaUrl] = useState(serverConfig.ollamaUrl || "http://localhost:11434");
  const [ollamaService, setOllamaService] = useState<OllamaService>();
  
  const [mcpConfig, setMcpConfig] = useState<MCPServerConfig>(
    serverConfig.mcpConfig || {
      url: "http://localhost:8080",
      serverType: "local",
      contextSize: 4096,
      maxTokens: 1024,
      tools: [...defaultTools]
    }
  );

  // Initialize Ollama service when URL changes
  useEffect(() => {
    const service = new OllamaService(ollamaUrl);
    setOllamaService(service);
    checkOllamaConnection(service);
  }, [ollamaUrl]);

  // Check Ollama connection and fetch models
  const checkOllamaConnection = async (service: OllamaService) => {
    setIsLoadingModels(true);
    try {
      const isRunning = await service.isServerRunning();
      setOllamaConnected(isRunning);
      
      if (isRunning) {
        const models = await service.getModels();
        setOllamaModels(models);
        toast.success(`Connected to Ollama - Found ${models.length} models`);
      } else {
        setOllamaModels([]);
        toast.error("Cannot connect to Ollama server. Make sure Ollama is running.");
      }
    } catch (error) {
      console.error("Error connecting to Ollama:", error);
      setOllamaConnected(false);
      setOllamaModels([]);
      toast.error("Failed to connect to Ollama server");
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Refresh models
  const refreshOllamaModels = () => {
    if (ollamaService) {
      checkOllamaConnection(ollamaService);
    }
  };

  // Helper functions
  const getModelDisplayName = (modelName: string): string => {
    const staticModel = staticOllamaModels.find(m => m.value === modelName);
    if (staticModel) return staticModel.label;
    
    const ollamaModel = ollamaModels.find(m => m.name === modelName);
    if (ollamaModel) return ollamaModel.name;
    
    return modelName;
  };

  const formatModelSize = (sizeInBytes: number): string => {
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
    
    setOpen(false);
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
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedModel && selectedTab === "ollama"
                  ? getModelDisplayName(selectedModel)
                  : "Select model..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandEmpty>
                  {isLoadingModels ? (
                    <div className="flex items-center justify-center py-4">
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                      Loading models...
                    </div>
                  ) : (
                    "No model found."
                  )}
                </CommandEmpty>
                
                {/* Ollama Connection Status */}
                <div className="p-2 border-b">
                  <div className="flex items-center justify-between">
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
                    >
                      <RefreshCw className={`h-3 w-3 ${isLoadingModels ? 'animate-spin' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Available Models */}
                {ollamaConnected && (
                  <CommandGroup heading="Available Models">
                    {ollamaModels.map((model) => (
                      <CommandItem
                        key={model.name}
                        value={model.name}
                        onSelect={() => {
                          onModelChange(model.name);
                          onServerConfigChange({
                            ...serverConfig,
                            type: "ollama",
                            modelName: model.name,
                            ollamaUrl: ollamaUrl
                          });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedModel === model.name ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex flex-col">
                          <span>{model.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {formatModelSize(model.size)} • {model.details.parameter_size}
                          </span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {/* Fallback Static Models */}
                {!ollamaConnected && (
                  <CommandGroup heading="Popular Models">
                    {staticOllamaModels.map((model) => (
                      <CommandItem
                        key={model.value}
                        value={model.value}
                        onSelect={() => {
                          onModelChange(model.value);
                          onServerConfigChange({
                            ...serverConfig,
                            type: "ollama",
                            modelName: model.value,
                            ollamaUrl: ollamaUrl
                          });
                          setOpen(false);
                        }}
                      >
                        <Check
                          className={`mr-2 h-4 w-4 ${
                            selectedModel === model.value ? "opacity-100" : "opacity-0"
                          }`}
                        />
                        <div className="flex flex-col">
                          <span>{model.label}</span>
                          <span className="text-xs text-muted-foreground">{model.description}</span>
                        </div>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
              </Command>
            </PopoverContent>
          </Popover>
          
          {/* Ollama Server Configuration */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ollama-url">Ollama Server URL</Label>
              <div className="flex space-x-2">
                <Input
                  id="ollama-url"
                  placeholder="http://localhost:11434"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    onServerConfigChange({
                      ...serverConfig,
                      ollamaUrl: ollamaUrl
                    });
                    if (ollamaService) {
                      checkOllamaConnection(ollamaService);
                    }
                  }}
                >
                  Connect
                </Button>
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
          </div>
        </TabsContent>
        
        <TabsContent value="mcp" className="space-y-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                className="w-full justify-between"
              >
                {mcpConfig.serverType
                  ? mcpServerTypes.find((server) => server.value === mcpConfig.serverType)?.label || "Select MCP server..."
                  : "Select MCP server..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search MCP servers..." />
                <CommandEmpty>No MCP server found.</CommandEmpty>
                <CommandGroup>
                  {mcpServerTypes.map((server) => (
                    <CommandItem
                      key={server.value}
                      value={server.value}
                      onSelect={() => handleMCPServerChange(server.value as MCPServerType)}
                    >
                      <Check
                        className={`mr-2 h-4 w-4 ${
                          mcpConfig.serverType === server.value ? "opacity-100" : "opacity-0"
                        }`}
                      />
                      <div className="flex flex-col">
                        <span>{server.label}</span>
                        <span className="text-xs text-muted-foreground">{server.description}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>

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
