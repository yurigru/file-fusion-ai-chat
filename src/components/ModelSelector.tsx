
import { useState } from "react";
import { Check, ChevronsUpDown, Server, Wrench, Plus, Trash } from "lucide-react";
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
import { 
  OllamaModel, 
  ServerConfig, 
  MCPServerType,
  MCPTool,
  MCPServerConfig
} from "@/types";

interface ModelSelectorProps {
  selectedModel: OllamaModel | string;
  onModelChange: (model: OllamaModel | string) => void;
  serverConfig: ServerConfig;
  onServerConfigChange: (config: ServerConfig) => void;
}

const ollamaModels: { value: OllamaModel; label: string; description: string }[] = [
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
  const [toolsOpen, setToolsOpen] = useState(false);
  const [selectedTab, setSelectedTab] = useState<"ollama" | "mcp">(serverConfig.type);
  
  const [mcpConfig, setMcpConfig] = useState<MCPServerConfig>(
    serverConfig.mcpConfig || {
      url: "http://localhost:8080",
      serverType: "local",
      contextSize: 4096,
      maxTokens: 1024,
      tools: [...defaultTools]
    }
  );
  
  const [newToolName, setNewToolName] = useState("");
  const [newToolDescription, setNewToolDescription] = useState("");

  const handleTabChange = (value: string) => {
    const tabValue = value as "ollama" | "mcp";
    setSelectedTab(tabValue);
    
    // Update server config when changing tabs
    if (tabValue === "ollama") {
      onServerConfigChange({
        type: "ollama",
        modelName: selectedModel as OllamaModel,
        ollamaUrl: serverConfig.ollamaUrl || "http://localhost:11434"
      });
    } else {
      onServerConfigChange({
        type: "mcp",
        modelName: "mcp-model",
        mcpConfig
      });
    }
  };

  const handleMCPServerChange = (serverType: MCPServerType) => {
    let newUrl = "";
    
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

  const handleCustomServerSubmit = () => {
    onServerConfigChange({
      ...serverConfig,
      type: "mcp",
      mcpConfig
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

  const addNewTool = () => {
    if (!newToolName.trim()) return;
    
    const newTool: MCPTool = {
      id: `tool-${Date.now()}`,
      name: newToolName,
      description: newToolDescription || "Custom tool",
      enabled: true
    };
    
    const updatedConfig = {
      ...mcpConfig,
      tools: [...mcpConfig.tools, newTool]
    };
    
    setMcpConfig(updatedConfig);
    
    onServerConfigChange({
      ...serverConfig,
      type: "mcp",
      mcpConfig: updatedConfig
    });
    
    setNewToolName("");
    setNewToolDescription("");
  };

  const removeTool = (toolId: string) => {
    const updatedConfig = {
      ...mcpConfig,
      tools: mcpConfig.tools.filter(tool => tool.id !== toolId)
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
        
        <TabsContent value="ollama" className="space-y-2">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-full justify-between"
              >
                {selectedModel && selectedTab === "ollama"
                  ? ollamaModels.find((model) => model.value === selectedModel)?.label || selectedModel
                  : "Select model..."}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0">
              <Command>
                <CommandInput placeholder="Search models..." />
                <CommandEmpty>No model found.</CommandEmpty>
                <CommandGroup>
                  {ollamaModels.map((model) => (
                    <CommandItem
                      key={model.value}
                      value={model.value}
                      onSelect={() => {
                        onModelChange(model.value as OllamaModel);
                        onServerConfigChange({
                          ...serverConfig,
                          type: "ollama",
                          modelName: model.value,
                          ollamaUrl: serverConfig.ollamaUrl || "http://localhost:11434"
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
              </Command>
            </PopoverContent>
          </Popover>
          
          <div className="pt-2">
            <div className="space-y-1">
              <Label htmlFor="ollama-url">Ollama Server URL</Label>
              <Input
                id="ollama-url"
                placeholder="http://localhost:11434"
                value={serverConfig.ollamaUrl || "http://localhost:11434"}
                onChange={(e) => onServerConfigChange({
                  ...serverConfig,
                  ollamaUrl: e.target.value
                })}
              />
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="mcp" className="space-y-4">
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={open}
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
                <CommandInput placeholder="Search server types..." />
                <CommandEmpty>No server type found.</CommandEmpty>
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
          
          <div className="space-y-3">
            <div className="space-y-1">
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
            <div className="space-y-1">
              <Label htmlFor="api-key">API Key (optional)</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="Enter API key"
                value={mcpConfig.apiKey || ""}
                onChange={(e) => {
                  const updatedConfig = {
                    ...mcpConfig,
                    apiKey: e.target.value
                  };
                  setMcpConfig(updatedConfig);
                  onServerConfigChange({
                    ...serverConfig,
                    mcpConfig: updatedConfig
                  });
                }}
              />
            </div>
            
            <Separator className="my-2" />
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <Label>MCP Tools Configuration</Label>
                <Popover open={toolsOpen} onOpenChange={setToolsOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Wrench className="h-4 w-4 mr-1" /> Configure Tools
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[350px]">
                    <div className="space-y-4">
                      <h4 className="font-medium">Available Tools</h4>
                      <div className="space-y-2">
                        {mcpConfig.tools.map(tool => (
                          <div key={tool.id} className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{tool.name}</div>
                              <div className="text-xs text-muted-foreground">{tool.description}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch 
                                checked={tool.enabled} 
                                onCheckedChange={() => toggleTool(tool.id)} 
                              />
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => removeTool(tool.id)}
                              >
                                <Trash className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-2">
                        <h4 className="font-medium">Add Custom Tool</h4>
                        <div className="space-y-2">
                          <Input
                            placeholder="Tool name"
                            value={newToolName}
                            onChange={(e) => setNewToolName(e.target.value)}
                          />
                          <Input
                            placeholder="Description (optional)"
                            value={newToolDescription}
                            onChange={(e) => setNewToolDescription(e.target.value)}
                          />
                          <Button 
                            className="w-full"
                            onClick={addNewTool}
                            disabled={!newToolName.trim()}
                          >
                            <Plus className="h-4 w-4 mr-1" /> Add Tool
                          </Button>
                        </div>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="text-sm text-muted-foreground mt-1">
                {mcpConfig.tools.filter(t => t.enabled).length} tools enabled
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="context-size">Context Size</Label>
                <Input
                  id="context-size"
                  type="number"
                  placeholder="4096"
                  value={mcpConfig.contextSize || 4096}
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
              <div className="space-y-1">
                <Label htmlFor="max-tokens">Max Tokens</Label>
                <Input
                  id="max-tokens"
                  type="number"
                  placeholder="1024"
                  value={mcpConfig.maxTokens || 1024}
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ModelSelector;
