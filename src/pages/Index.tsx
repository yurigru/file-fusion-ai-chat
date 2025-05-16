
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";
import FileComparison from "@/components/FileComparison";
import SchematicComparison from "@/components/SchematicComparison";
import AIChat from "@/components/AIChat";
import ExportOptions from "@/components/ExportOptions";
import { UploadedFile, ComparisonFiles, ComparisonResult, ElectronicComponent, NetlistConnection } from "@/types";
import { toast } from "@/components/ui/sonner";

const Index = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [comparisonFiles, setComparisonFiles] = useState<ComparisonFiles>({
    file1: null,
    file2: null,
    result: null,
  });
  const [components, setComponents] = useState<ElectronicComponent[]>([]);
  const [connections, setConnections] = useState<NetlistConnection[]>([]);
  const [fileType, setFileType] = useState<"bom" | "netlist" | null>(null);

  useEffect(() => {
    // When two files are selected, automatically set them as comparison files
    if (selectedFiles.length === 2) {
      setComparisonFiles({
        file1: selectedFiles[0],
        file2: selectedFiles[1],
        result: null,
      });
      
      // Try to detect the file type
      detectFileType(selectedFiles[0], selectedFiles[1]);
    } else if (selectedFiles.length < 2) {
      setComparisonFiles({
        file1: selectedFiles[0] || null,
        file2: null,
        result: null,
      });
      setFileType(null);
    }
  }, [selectedFiles]);

  const detectFileType = (file1: UploadedFile, file2: UploadedFile) => {
    const determineType = (file: UploadedFile): "bom" | "netlist" | null => {
      const fileName = file.name.toLowerCase();
      if (fileName.includes("bom") || fileName.endsWith(".csv") || fileName.endsWith(".xlsx")) {
        return "bom";
      } else if (fileName.includes("net") || fileName.endsWith(".net") || fileName.endsWith(".netlist")) {
        return "netlist";
      }
      return null;
    };

    const type1 = determineType(file1);
    const type2 = determineType(file2);

    // Only set file type if both files are of the same type
    if (type1 && type1 === type2) {
      setFileType(type1);
      // Initialize the appropriate data structure
      if (type1 === "bom") {
        setComponents([]);
      } else if (type1 === "netlist") {
        setConnections([]);
      }
    } else {
      setFileType(null);
    }
  };

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    // Process uploaded files
    const processedFiles = newFiles.map(file => {
      // Try to detect if this is a BOM or netlist file
      const fileName = file.name.toLowerCase();
      let fileType: "bom" | "netlist" | "other" = "other";
      
      if (fileName.includes("bom") || fileName.endsWith(".csv") || fileName.endsWith(".xlsx")) {
        fileType = "bom";
      } else if (fileName.includes("net") || fileName.endsWith(".net") || fileName.endsWith(".netlist")) {
        fileType = "netlist";
      }
      
      return {
        ...file,
        fileType
      };
    });
    
    setFiles((prev) => [...prev, ...processedFiles]);
    setActiveTab("files");
  };

  const handleSelectFile = (file: UploadedFile) => {
    if (selectedFiles.some((f) => f.id === file.id)) {
      // Deselect the file
      setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id));
    } else {
      // Select the file (max 2 files)
      if (selectedFiles.length < 2) {
        setSelectedFiles([...selectedFiles, file]);
      } else {
        // Replace the oldest selected file
        const newSelectedFiles = [...selectedFiles];
        newSelectedFiles.shift();
        newSelectedFiles.push(file);
        setSelectedFiles(newSelectedFiles);
      }
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setFiles(files.filter((f) => f.id !== fileId));
    setSelectedFiles(selectedFiles.filter((f) => f.id !== fileId));
    
    // Update comparison files if necessary
    if (comparisonFiles.file1?.id === fileId) {
      setComparisonFiles({
        ...comparisonFiles,
        file1: null,
        result: null,
      });
    }
    if (comparisonFiles.file2?.id === fileId) {
      setComparisonFiles({
        ...comparisonFiles,
        file2: null,
        result: null,
      });
    }
  };

  const handleCompare = () => {
    if (!comparisonFiles.file1 || !comparisonFiles.file2) {
      toast.error("Please select two files to compare");
      return;
    }

    // Mock comparison for UI prototype
    // This would be replaced with actual comparison logic
    const simulateComparison = (): ComparisonResult => {
      const file1Lines = comparisonFiles.file1?.content.split("\n") || [];
      const file2Lines = comparisonFiles.file2?.content.split("\n") || [];
      
      // Create some simulated differences
      const added: string[] = [];
      const deleted: string[] = [];
      const changed: { line: number; original: string; modified: string }[] = [];
      
      // Simulate some random additions (for demo purposes)
      for (let i = 0; i < file2Lines.length; i++) {
        if (Math.random() < 0.1) {  // 10% chance for each line
          added.push(i.toString());
        }
      }
      
      // Simulate some random deletions (for demo purposes)
      for (let i = 0; i < file1Lines.length; i++) {
        if (Math.random() < 0.1) {  // 10% chance for each line
          deleted.push(i.toString());
        }
      }
      
      // Simulate some random changes (for demo purposes)
      for (let i = 0; i < Math.min(file1Lines.length, file2Lines.length); i++) {
        if (Math.random() < 0.1 && !deleted.includes(i.toString())) {  // 10% chance for each line
          changed.push({
            line: i,
            original: file1Lines[i] || "",
            modified: file2Lines[i] || ""
          });
        }
      }
      
      return { added, deleted, changed };
    };

    const result = simulateComparison();
    setComparisonFiles({
      ...comparisonFiles,
      result,
    });
    
    // Generate mock component or connection data based on file type
    if (fileType === "bom") {
      generateMockComponents(result);
    } else if (fileType === "netlist") {
      generateMockConnections(result);
    }
    
    // Switch to the Compare tab
    setActiveTab("compare");
    toast.success("Comparison completed");
  };

  const generateMockComponents = (result: ComparisonResult) => {
    if (!comparisonFiles.file1) return;
    
    const mockComponents: ElectronicComponent[] = [];
    const lines = comparisonFiles.file1.content.split('\n').filter(line => line.trim().length > 0);
    
    lines.slice(0, 10).forEach((line, index) => {
      const fields = line.split(',');
      if (fields.length >= 2) {
        mockComponents.push({
          id: `comp-${index}`,
          reference: fields[0] || `R${index}`,
          value: fields[1] || `10k`,
          quantity: parseInt(fields[2] || "1"),
          description: fields[3] || 'Resistor',
          manufacturer: fields[4] || 'Generic',
          partNumber: fields[5] || `PART-${index}`,
        });
      }
    });
    
    setComponents(mockComponents);
  };

  const generateMockConnections = (result: ComparisonResult) => {
    if (!comparisonFiles.file1) return;
    
    const mockConnections: NetlistConnection[] = [];
    const lines = comparisonFiles.file1.content.split('\n').filter(line => line.trim().length > 0);
    
    lines.slice(0, 10).forEach((line, index) => {
      const fields = line.split(' ').filter(f => f.trim().length > 0);
      if (fields.length >= 2) {
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

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Electronic Schematic Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Upload, analyze, and compare BOM and netlist files with AI assistance
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                </TabsList>
                
                <ExportOptions 
                  comparisonResult={comparisonFiles.result}
                  comparedFiles={{
                    file1Name: comparisonFiles.file1?.name || null,
                    file2Name: comparisonFiles.file2?.name || null,
                    fileType: fileType
                  }}
                  components={components}
                  connections={connections}
                />
              </div>

              <TabsContent value="upload" className="space-y-4">
                <FileUploader onFilesUploaded={handleFilesUploaded} />
              </TabsContent>

              <TabsContent value="files" className="space-y-4">
                <FileList
                  files={files}
                  selectedFiles={selectedFiles}
                  onSelectFile={handleSelectFile}
                  onRemoveFile={handleRemoveFile}
                />
              </TabsContent>

              <TabsContent value="compare" className="space-y-4">
                {fileType ? (
                  <SchematicComparison
                    comparisonFiles={comparisonFiles}
                    onCompare={handleCompare}
                  />
                ) : (
                  <FileComparison
                    comparisonFiles={comparisonFiles}
                    onCompare={handleCompare}
                  />
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="h-[600px]">
            <AIChat
              selectedFile={selectedFiles.length === 1 ? selectedFiles[0] : null}
              comparisonResult={comparisonFiles.result}
              comparedFiles={{
                file1: comparisonFiles.file1,
                file2: comparisonFiles.file2
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
