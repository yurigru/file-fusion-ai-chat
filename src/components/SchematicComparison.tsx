import { useState, useEffect } from "react";
import { ComparisonFiles, ComparisonResult, ElectronicComponent, NetlistConnection, UploadedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, RefreshCw, Table, ArrowRightLeft } from "lucide-react";
import {
  Table as UITable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface SchematicComparisonProps {
  comparisonFiles: ComparisonFiles;
  onCompare: (swappedFiles?: { oldFile: UploadedFile; newFile: UploadedFile }) => void;
}

const SchematicComparison = ({ comparisonFiles, onCompare }: SchematicComparisonProps) => {
  const [activeTab, setActiveTab] = useState("components");
  const [fileType, setFileType] = useState<"bom" | "netlist" | null>(null);
  const [components, setComponents] = useState<ElectronicComponent[]>([]);
  const [connections, setConnections] = useState<NetlistConnection[]>([]);
  const [isDirectionSwapped, setIsDirectionSwapped] = useState(false);
  
  const { file1, file2, result } = comparisonFiles;
  
  // Get effective file order based on direction
  const getEffectiveFiles = () => {
    if (isDirectionSwapped) {
      return {
        oldFile: file2,
        newFile: file1,
        displayFile1: file2,
        displayFile2: file1
      };
    }
    return {
      oldFile: file1,
      newFile: file2,
      displayFile1: file1,
      displayFile2: file2
    };
  };
  
  const { displayFile1, displayFile2 } = getEffectiveFiles();
  
  const handleSwapDirection = () => {
    setIsDirectionSwapped(!isDirectionSwapped);
  };
  
  const handleCompare = () => {
    if (!file1 || !file2) return;
    
    const { oldFile, newFile } = getEffectiveFiles();
    if (isDirectionSwapped) {
      onCompare({ oldFile, newFile });
    } else {
      onCompare();
    }
  };

  useEffect(() => {
    if (file1 && file2) {
      // Detect file type based on content or extension
      const detectFileType = (file: UploadedFile): "bom" | "netlist" | null => {
        const fileName = file.name.toLowerCase();
        if (fileName.includes("bom") || fileName.endsWith(".csv") || fileName.endsWith(".xlsx")) {
          return "bom";
        } else if (fileName.includes("net") || fileName.endsWith(".net") || fileName.endsWith(".netlist")) {
          return "netlist";
        }
        return null;
      };

      const file1Type = detectFileType(file1);
      const file2Type = detectFileType(file2);

      // Only set file type if both files are of the same type
      if (file1Type && file1Type === file2Type) {
        setFileType(file1Type);
        setActiveTab(file1Type === "bom" ? "components" : "connections");
      } else {
        setFileType(null);
      }
    }
  }, [file1, file2]);

  useEffect(() => {
    if (result && fileType) {
      if (fileType === "bom") {
        parseComponentData();
      } else if (fileType === "netlist") {
        parseNetlistData();
      }
    }
  }, [result, fileType]);

  const parseComponentData = () => {
    // This would be replaced with actual parsing logic for BOM files
    // For the UI prototype, we'll create mock components data
    if (!file1 || !result) return;

    const mockComponents: ElectronicComponent[] = [];
    
    // Create some simulated components based on the file content
    const lines = file1.content.split('\n').filter(line => line.trim().length > 0);
    
    lines.slice(0, 10).forEach((line, index) => {
      const fields = line.split(',');
      if (fields.length >= 3) {
        mockComponents.push({
          id: `comp-${index}`,
          reference: fields[0] || `R${index}`,
          value: fields[1] || `10k`,
          quantity: parseInt(fields[2]) || 1,
          description: fields[3] || 'Resistor',
          manufacturer: fields[4] || 'Generic',
          partNumber: fields[5] || `PART-${index}`,
        });
      }
    });
    
    setComponents(mockComponents);
  };

  const parseNetlistData = () => {
    // This would be replaced with actual parsing logic for netlist files
    // For the UI prototype, we'll create mock netlist data
    if (!file1 || !result) return;

    const mockConnections: NetlistConnection[] = [];
    
    // Create some simulated connections based on the file content
    const lines = file1.content.split('\n').filter(line => line.trim().length > 0);
    
    lines.slice(0, 10).forEach((line, index) => {
      const fields = line.split(' ').filter(f => f.trim().length > 0);
      if (fields.length >= 3) {
        mockConnections.push({
          id: `net-${index}`,
          net: fields[0] || `NET${index}`,
          nodes: fields.slice(1) || [`U1:${index}`, `R${index}:1`],
          type: index % 2 === 0 ? 'signal' : 'power',
        });
      }
    });
    
    setConnections(mockConnections);
  };

  const renderComponentTable = () => {
    if (!components.length) {
      return <p className="text-center py-4">No component data available</p>;
    }

    return (
      <UITable>        <TableHeader>
          <TableRow>
            <TableHead>Reference</TableHead>
            <TableHead>Value</TableHead>
            <TableHead>Quantity</TableHead>
            <TableHead>Part Name</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {components.map((component, index) => {
            // Determine if this component was added, deleted, or changed for UI highlighting
            const isAdded = result?.added.includes(index.toString());
            const isDeleted = result?.deleted.includes(index.toString());
            const isChanged = result?.changed.some(change => change.line === index);
            
            return (
              <TableRow key={component.id} className={
                isAdded ? "bg-added/10" : 
                isDeleted ? "bg-deleted/10" : 
                isChanged ? "bg-changed/10" : ""
              }>                <TableCell>{component.reference}</TableCell>
                <TableCell>{component.value}</TableCell>
                <TableCell>{component.quantity}</TableCell>
                <TableCell>{component.manufacturer || '-'}</TableCell>
                <TableCell className={
                  isAdded ? "text-added font-medium" : 
                  isDeleted ? "text-deleted font-medium" : 
                  isChanged ? "text-changed font-medium" : ""
                }>
                  {isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </UITable>
    );
  };

  const renderNetlistTable = () => {
    if (!connections.length) {
      return <p className="text-center py-4">No netlist data available</p>;
    }

    return (
      <UITable>
        <TableHeader>
          <TableRow>
            <TableHead>Net</TableHead>
            <TableHead>Nodes</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {connections.map((connection, index) => {
            // Determine if this connection was added, deleted, or changed for UI highlighting
            const isAdded = result?.added.includes(index.toString());
            const isDeleted = result?.deleted.includes(index.toString());
            const isChanged = result?.changed.some(change => change.line === index);
            
            return (
              <TableRow key={connection.id} className={
                isAdded ? "bg-added/10" : 
                isDeleted ? "bg-deleted/10" : 
                isChanged ? "bg-changed/10" : ""
              }>
                <TableCell>{connection.net}</TableCell>
                <TableCell>{connection.nodes.join(', ')}</TableCell>
                <TableCell>{connection.type || 'signal'}</TableCell>
                <TableCell className={
                  isAdded ? "text-added font-medium" : 
                  isDeleted ? "text-deleted font-medium" : 
                  isChanged ? "text-changed font-medium" : ""
                }>
                  {isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged'}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </UITable>
    );
  };

  const renderTextComparison = () => {
    if (!result) return null;
    
    const lines: string[] = [];
    
    if (file1 && file2) {
      const file1Lines = file1.content.split('\n');
      const file2Lines = file2.content.split('\n');
      
      // Create a merged view based on the active tab
      const allLines = new Map<number, { content: string; status: 'added' | 'deleted' | 'changed' | 'unchanged' }>();
      
      // Add all lines from file1 as unchanged first
      file1Lines.forEach((line, idx) => {
        allLines.set(idx, { content: line, status: 'unchanged' });
      });
      
      // Mark deleted lines
      if (activeTab === 'all' || activeTab === 'deleted') {
        result.deleted.forEach(lineIdx => {
          const idx = parseInt(lineIdx);
          if (allLines.has(idx)) {
            allLines.set(idx, { content: file1Lines[idx], status: 'deleted' });
          }
        });
      }
      
      // Add new lines
      if (activeTab === 'all' || activeTab === 'added') {
        result.added.forEach(lineIdx => {
          const idx = parseInt(lineIdx);
          allLines.set(file1Lines.length + idx, { content: file2Lines[idx], status: 'added' });
        });
      }
      
      // Mark changed lines
      if (activeTab === 'all' || activeTab === 'changed') {
        result.changed.forEach(change => {
          allLines.set(change.line, { content: change.modified, status: 'changed' });
        });
      }
      
      // Convert map to array and sort by line number
      const sorted = Array.from(allLines.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([_, value]) => {
          let prefix = '';
          switch (value.status) {
            case 'added': prefix = '+ '; break;
            case 'deleted': prefix = '- '; break;
            case 'changed': prefix = '~ '; break;
            default: prefix = '  ';
          }
          return `${prefix}${value.content}`;
        });
      
      lines.push(...sorted);
    }
    
    return (
      <div className="bg-muted/30 p-2 rounded-lg overflow-auto max-h-96">
        <pre className="text-xs font-mono">
          {lines.length > 0 ? (
            lines.map((line, index) => (
              <div 
                key={index} 
                className={`px-2 py-0.5 ${getLineClass(line)}`}
              >
                {line}
              </div>
            ))
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No differences to display for the selected filter
            </div>
          )}
        </pre>
      </div>
    );
  };

  // Simple line class based on content prefix
  const getLineClass = (line: string) => {
    if (line.startsWith('+ ')) return 'bg-added/10 text-added';
    if (line.startsWith('- ')) return 'bg-deleted/10 text-deleted';
    if (line.startsWith('~ ')) return 'bg-changed/10 text-changed';
    return '';
  };

  return (
    <div className="space-y-4">      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Schematic Comparison</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSwapDirection}
            disabled={!file1 || !file2}
            className="flex items-center space-x-1"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span className="text-xs">Swap Direction</span>
          </Button>
          <Button
            onClick={handleCompare}
            disabled={!file1 || !file2}
            className="flex items-center space-x-2"
          >
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Compare Files
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              File 1 {isDirectionSwapped && <span className="text-xs text-muted-foreground">(swapped)</span>}:
            </p>
            <span className="text-xs text-muted-foreground">Old/Base</span>
          </div>
          <div className="bg-background p-3 rounded border min-h-20 flex items-center justify-center">
            {displayFile1 ? (
              <div>
                <p className="truncate font-medium">{displayFile1.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileType ? (fileType === "bom" ? "BOM File" : "Netlist File") : "Unknown Type"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Select first file</p>
            )}
          </div>
        </div>        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              File 2 {isDirectionSwapped && <span className="text-xs text-muted-foreground">(swapped)</span>}:
            </p>
            <span className="text-xs text-muted-foreground">New/Modified</span>
          </div>
          <div className="bg-background p-3 rounded border min-h-20 flex items-center justify-center">
            {displayFile2 ? (
              <div>
                <p className="truncate font-medium">{displayFile2.name}</p>
                <p className="text-xs text-muted-foreground">
                  {fileType ? (fileType === "bom" ? "BOM File" : "Netlist File") : "Unknown Type"}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">Select second file</p>
            )}
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-added"></div>
                <span className="text-sm text-muted-foreground">
                  {result.added.length} Added
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-deleted"></div>
                <span className="text-sm text-muted-foreground">
                  {result.deleted.length} Deleted
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-changed"></div>
                <span className="text-sm text-muted-foreground">
                  {result.changed.length} Changed
                </span>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => fileType === "bom" ? parseComponentData() : parseNetlistData()} 
              className="text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh
            </Button>
          </div>

          <Tabs defaultValue={fileType === "bom" ? "components" : "connections"} value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value={fileType === "bom" ? "components" : "connections"}>
                <Table className="h-4 w-4 mr-1" />
                {fileType === "bom" ? "Components" : "Connections"}
              </TabsTrigger>
              <TabsTrigger value="added">Added</TabsTrigger>
              <TabsTrigger value="deleted">Deleted</TabsTrigger>
              <TabsTrigger value="changed">Changed</TabsTrigger>
            </TabsList>
            <TabsContent value="components" className="mt-4">
              {renderComponentTable()}
            </TabsContent>
            <TabsContent value="connections" className="mt-4">
              {renderNetlistTable()}
            </TabsContent>
            <TabsContent value="all" className="mt-4">
              {renderTextComparison()}
            </TabsContent>
            <TabsContent value="added" className="mt-4">
              {renderTextComparison()}
            </TabsContent>
            <TabsContent value="deleted" className="mt-4">
              {renderTextComparison()}
            </TabsContent>
            <TabsContent value="changed" className="mt-4">
              {renderTextComparison()}
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button
              onClick={handleSwapDirection}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <ArrowRightLeft className="h-4 w-4" />
              <span className="text-sm">Swap Direction</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SchematicComparison;
