import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";
import FileComparison from "@/components/FileComparison";
import SchematicComparison from "@/components/SchematicComparison";
import AIChat from "@/components/AIChat";
import ExportOptions from "@/components/ExportOptions";
import FileTable from "@/components/FileTable";
import BOMCompare from "@/components/BOMCompare";
import { UploadedFile, ComparisonFiles, ComparisonResult, ElectronicComponent, NetlistConnection } from "@/types";
import { toast } from "@/components/ui/sonner";
import { ArrowLeftRight, Plus, Minus, Check, RefreshCw } from "lucide-react"; // Import RefreshCw
import { XMLParser } from 'fast-xml-parser'; // Use fast-xml-parser instead of xml2js

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
  const [tablePreview, setTablePreview] = useState<any[] | null>(null);
  const [isComparing, setIsComparing] = useState(false); // Add isComparing state

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

  // Add effect to update table preview when a single file is selected
  useEffect(() => {
    if (selectedFiles.length === 1) {
      const file = selectedFiles[0];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      if (ext === "xml") {
        try {
          const parser = new XMLParser();
          const result = parser.parse(file.content);
          console.log('[fast-xml-parser] parsed result:', result);
          // Support both <BOM> and <SHOWSRVCALLS> roots
          let details = result?.BOM?.DETAILS || result?.SHOWSRVCALLS?.DETAILS;
          let records = details?.RECORD;
          if (!records && Array.isArray(details)) {
            // Sometimes DETAILS is an array
            records = details.flatMap((d: any) => d.RECORD || []);
          }
          if (!records) records = [];
          const recordArray = Array.isArray(records) ? records : [records];
          // Filter out empty objects
          const rows = recordArray.filter(r => r && typeof r === 'object').map((rec: any) => ({
            NUMBER: rec["NUMBER"] || "",
            PartNumber: rec["PART-NUM"] || "",
            QTY: rec["QTY"] || "",
            REFDES: rec["REFDES"] || "",
            PACKAGE: rec["PACKAGE"] || "",
            OPT: rec["OPT"] || "",
            PARTNAME: rec["PART-NAME"] || "",
            DESCRIPTION: rec["DESCRIPTION"] || "",
          }));
          setTablePreview(rows);
        } catch (err) {
          setTablePreview([]);
        }
      } else if (ext === "csv") {
        const data = file.content.split('\n').map(row => row.split(','));
        setTablePreview(data);
      } else if (ext === "net") {
        const data = file.content.split('\n').map(row => [row]);
        setTablePreview(data);
      } else {
        setTablePreview([]);
      }
    } else {
      setTablePreview(null);
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

  const handleCompare = async () => {
    if (!comparisonFiles.file1 || !comparisonFiles.file2) {
      toast.error("Please select two files to compare");
      return;
    }

    setIsComparing(true); // Set loading state

    // If both files are .xml, use FastAPI for BOM comparison
    if (
      comparisonFiles.file1.name.toLowerCase().endsWith('.xml') &&
      comparisonFiles.file2.name.toLowerCase().endsWith('.xml')
    ) {
      const oldFile = new File([
        comparisonFiles.file1.content
      ], comparisonFiles.file1.name, {
        type: comparisonFiles.file1.type,
        lastModified: comparisonFiles.file1.lastModified,
      });
      const newFile = new File([
        comparisonFiles.file2.content
      ], comparisonFiles.file2.name, {
        type: comparisonFiles.file2.type,
        lastModified: comparisonFiles.file2.lastModified,
      });
      const formData = new FormData();
      formData.append("old_file", oldFile);
      formData.append("new_file", newFile);
      try {
        // Use relative URL for proxy to work in all environments
        const response = await fetch("/compare-bom", {
          method: "POST",
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.detail || "BOM comparison failed");
        }
          const data = await response.json();
        console.log("BOM comparison response:", data);
        
        // Show validation warnings if any
        if (data.validation_warnings && data.validation_warnings.length > 0) {
          data.validation_warnings.forEach((warning: string) => {
            toast.error(`Warning: ${warning}`);
          });
        }
        
        // Log statistics
        if (data.statistics) {
          console.log("BOM comparison statistics:", data.statistics);
          toast.success(`Comparison completed: ${data.statistics.total_changes} total changes found`);
        }        // Map the backend response to the frontend component data structure
        const addedComponents = (data.added || []).map(comp => ({
          id: comp.reference || "",
          reference: comp.reference || "",
          value: comp.quantity || "",
          partNumber: comp.partNumber || "",
          description: comp.description || "",
          manufacturer: comp.manufacturer || "",
          footprint: comp.footprint || "",
          quantity: parseInt(comp.quantity || "0")
        }));
        
        const deletedComponents = (data.removed || []).map(comp => ({
          id: comp.reference || "",
          reference: comp.reference || "",
          value: comp.quantity || "",
          partNumber: comp.partNumber || "",
          description: comp.description || "",
          manufacturer: comp.manufacturer || "",
          footprint: comp.footprint || "",
          quantity: parseInt(comp.quantity || "0")
        }));const changedComponents = (data.changed || []).map(chg => {
          console.log("Debug changed component:", chg);
          console.log("Debug original fields:", chg?.original ? Object.keys(chg.original) : "No original object");
          console.log("Debug modified fields:", chg?.modified ? Object.keys(chg.modified) : "No modified object");
          
          // Ensure we're accessing the data with proper format checking
          if (!chg || !chg.original || !chg.modified) {
            console.warn("Invalid changed component data structure:", chg);            return {
              id: chg?.reference || "unknown",
              reference: chg?.reference || "unknown",
              original: {
                partNumber: "",
                quantity: 0,
                value: "",
                reference: "",
                footprint: "",
                description: "",
                manufacturer: "",
              },
              modified: {
                partNumber: "",
                quantity: 0,
                value: "",
                reference: "",
                footprint: "",
                description: "",
                manufacturer: "",
              }
            };
          }            const mappedComponent = {
            id: chg.reference,
            reference: chg.reference,
            original: {
              partNumber: chg.original.partNumber || "",
              quantity: parseInt(chg.original.quantity || "0"),
              value: chg.original.quantity || "",
              reference: chg.original.reference || chg.reference,
              footprint: chg.original.footprint || "",
              description: chg.original.description || "",
              manufacturer: chg.original.manufacturer || "",
            },
            modified: {
              partNumber: chg.modified.partNumber || "",
              quantity: parseInt(chg.modified.quantity || "0"),
              value: chg.modified.quantity || "",
              reference: chg.modified.reference || chg.reference,
              footprint: chg.modified.footprint || "",
              description: chg.modified.description || "",
              manufacturer: chg.modified.manufacturer || "",
            },
          };
          console.log("Mapped changed component:", mappedComponent);
          return mappedComponent;
        });
          console.log("Mapped component data:", {
          added: addedComponents.length,
          deleted: deletedComponents.length,
          changed: changedComponents.length
        });
        
        // Additional debug: Log the actual mapped data
        if (changedComponents.length > 0) {
          console.log("First mapped changed component:", changedComponents[0]);
        }
        setComparisonFiles({
          ...comparisonFiles,
          result: {
            // Empty arrays for legacy fields
            added: [],
            deleted: [],
            changed: [],
            // Map the component data
            addedComponents,
            deletedComponents,
            changedComponents,
            // Add validation warnings and statistics
            validationWarnings: data.validation_warnings || [],
            statistics: data.statistics || {}
          },
        });

        setActiveTab("compare");
        
        // Show success message with statistics
        const totalChanges = (data.statistics?.total_changes || 0);
        if (totalChanges === 0) {
          toast.success("Comparison completed - No differences found");
        } else {
          toast.success(`Comparison completed - ${totalChanges} changes found`);
        }
      } catch (err: any) {
        toast.error(`BOM comparison failed: ${err.message}`);
      } finally {
        setIsComparing(false); // Reset loading state
      }
      return;
    }

    // Fallback: mock comparison for UI prototype
    const simulateComparison = (): ComparisonResult => {
      const file1Lines = comparisonFiles.file1?.content.split("\n") || [];
      const file2Lines = comparisonFiles.file2?.content.split("\n") || [];
      const added: string[] = [];
      const deleted: string[] = [];
      const changed: { line: number; original: string; modified: string }[] = [];
      for (let i = 0; i < file2Lines.length; i++) {
        if (Math.random() < 0.1) {
          added.push(i.toString());
        }
      }
      for (let i = 0; i < file1Lines.length; i++) {
        if (Math.random() < 0.1) {
          deleted.push(i.toString());
        }
      }
      for (let i = 0; i < Math.min(file1Lines.length, file2Lines.length); i++) {
        if (Math.random() < 0.1 && !deleted.includes(i.toString())) {
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
    if (fileType === "bom") {
      generateMockComponents(result);
    } else if (fileType === "netlist") {
      generateMockConnections(result);
    }
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

  // Add this before the return statement
  if (tablePreview) {
    // eslint-disable-next-line no-console
    console.log('[FileTable Preview] tablePreview:', tablePreview);
  }

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
                {/* Show table preview if a single file is selected */}
                {tablePreview && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-2">File Table Preview</h2>
                    <FileTable data={tablePreview} />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="compare" className="space-y-4">
                <FileComparison comparisonFiles={comparisonFiles} onCompare={handleCompare} />
                {fileType === "bom" && (
                  <BOMCompare comparisonResult={comparisonFiles.result} />
                )}
                {fileType === "netlist" && (
                  <SchematicComparison comparisonFiles={comparisonFiles} onCompare={handleCompare} />
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
