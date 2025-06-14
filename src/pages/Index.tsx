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
import Settings from "@/components/Settings";

import { UploadedFile, ComparisonFiles, ComparisonResult, ElectronicComponent, NetlistConnection } from "@/types";
import { toast } from "@/components/ui/sonner";
import { ArrowLeftRight, Plus, Minus, Check } from "lucide-react";
import { XMLParser } from 'fast-xml-parser'; // Use fast-xml-parser instead of xml2js

const Index = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [previewedFile, setPreviewedFile] = useState<UploadedFile | null>(null);
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
  // Auto-select first two files when files are uploaded
  useEffect(() => {
    if (files.length >= 2 && selectedFiles.length === 0) {
      // Automatically select the first two files
      const firstTwoFiles = files.slice(0, 2);
      setSelectedFiles(firstTwoFiles);
      console.log("Auto-selected first two files:", firstTwoFiles.map(f => f.name));
        // Switch to compare tab when auto-selecting files
      setActiveTab("compare");
    }
  }, [files]);

  // Update table preview based on previewed file
  useEffect(() => {
    if (previewedFile) {
      const ext = previewedFile.name.split('.').pop()?.toLowerCase() || '';
      
      if (ext === "xml") {
        try {
          const parser = new XMLParser();
          const result = parser.parse(previewedFile.content);
          // Support both <BOM> and <SHOWSRVCALLS> roots
          let details = result?.BOM?.DETAILS || result?.SHOWSRVCALLS?.DETAILS;
          let records = details?.RECORD;
          if (!records && Array.isArray(details)) {
            // Sometimes DETAILS is an array
            records = details.flatMap((d: any) => d.RECORD || []);
          }
          if (!records) records = [];
          const recordArray = Array.isArray(records) ? records : [records];
          // Filter out empty objects and show first 50 rows for preview
          const rows = recordArray.filter(r => r && typeof r === 'object').slice(0, 50).map((rec: any) => ({
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
          console.error("Error parsing XML for preview:", err);
          setTablePreview([]);
        }
      } else if (ext === "csv") {
        const data = previewedFile.content.split('\n').slice(0, 50).map(row => row.split(','));
        setTablePreview(data);
      } else if (ext === "net") {
        const data = previewedFile.content.split('\n').slice(0, 50).map(row => [row]);
        setTablePreview(data);
      } else {
        setTablePreview([]);
      }
    } else {
      setTablePreview(null);
    }
  }, [previewedFile]);
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
      
      // Auto-switch to compare tab when 2 files are selected
      setActiveTab("compare");
    } else if (selectedFiles.length < 2) {
      setComparisonFiles({
        file1: selectedFiles[0] || null,
        file2: null,
        result: null,
      });
      setFileType(null);
    }  }, [selectedFiles]);

  const detectFileType = (file1: UploadedFile, file2: UploadedFile) => {
    const determineType = (file: UploadedFile): "bom" | "netlist" | null => {
      const fileName = file.name.toLowerCase();
      if (fileName.includes("bom") || fileName.endsWith(".csv") || fileName.endsWith(".xlsx") || fileName.endsWith(".xml")) {
        return "bom";
      } else if (fileName.includes("net") || fileName.endsWith(".net") || fileName.endsWith(".netlist")) {
        return "netlist";
      }
      return null;
    };    const type1 = determineType(file1);
    const type2 = determineType(file2);

    console.log("File type detection:", {
      file1: file1.name,
      file2: file2.name, 
      type1,
      type2,
      finalFileType: type1 && type1 === type2 ? type1 : null
    });

    // Only set file type if both files are of the same type
    if (type1 && type1 === type2) {
      setFileType(type1);
      console.log("Setting fileType to:", type1);
      // Initialize the appropriate data structure
      if (type1 === "bom") {
        setComponents([]);
      } else if (type1 === "netlist") {
        setConnections([]);
      }
    } else {
      setFileType(null);
      console.log("Setting fileType to null - types don't match");
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
      } else if (fileName.endsWith(".xml")) {
        // For XML files, assume they're BOMs unless proven otherwise
        fileType = "bom";
      }
      
      return {
        ...file,
        fileType
      };
    });

    setFiles((prev) => [...prev, ...processedFiles]);
    
    // Automatically upload XML BOM files to RAG knowledge base
    uploadXMLFilesToRAG(processedFiles);
    
    // Switch to files tab after upload
    setActiveTab("files");
  };

  const uploadXMLFilesToRAG = async (uploadedFiles: UploadedFile[]) => {
    // Filter XML files that are likely BOMs
    const xmlBomFiles = uploadedFiles.filter(file => 
      file.name.toLowerCase().endsWith('.xml') && 
      file.fileType === 'bom'
    );

    if (xmlBomFiles.length === 0) return;

    console.log(`Uploading ${xmlBomFiles.length} XML BOM files to RAG knowledge base...`);

    for (const file of xmlBomFiles) {
      try {
        // Convert UploadedFile back to File object for RAG service
        const blob = new Blob([file.content], { type: file.type });
        const ragFile = new File([blob], file.name, {
          type: file.type,
          lastModified: file.lastModified,
        });

        // Upload to RAG knowledge base with async embedding creation
        const formData = new FormData();
        formData.append('file', ragFile);
        formData.append('source_name', file.name);
        formData.append('create_embeddings', 'true'); // Enable async embedding creation

        const response = await fetch('/api/rag/add-bom', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Uploaded ${file.name} to RAG: ${result.component_count} components`);
          
          // Show a subtle notification (not intrusive)
          if (result.embeddings_status === 'processing') {
            console.log(`🔄 Creating embeddings for ${file.name} in background...`);
          }
        } else {
          console.warn(`⚠️ Failed to upload ${file.name} to RAG knowledge base`);
        }
      } catch (error) {
        console.error(`❌ Error uploading ${file.name} to RAG:`, error);
      }
    }
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

  const handlePreviewFile = (file: UploadedFile) => {
    console.log("Previewing file:", file.name);
    setPreviewedFile(prevFile => prevFile?.id === file.id ? null : file);
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
  const handleCompare = async (swappedFiles?: { oldFile: UploadedFile; newFile: UploadedFile }) => {
    if (!comparisonFiles.file1 || !comparisonFiles.file2) {
      toast.error("Please select two files to compare");
      return;
    }

    setIsComparing(true); // Set loading state

    // Determine which files to use for comparison
    const oldFileContent = swappedFiles ? swappedFiles.oldFile : comparisonFiles.file1;
    const newFileContent = swappedFiles ? swappedFiles.newFile : comparisonFiles.file2;

    // If both files are .xml, use FastAPI for BOM comparison
    if (
      oldFileContent.name.toLowerCase().endsWith('.xml') &&
      newFileContent.name.toLowerCase().endsWith('.xml')
    ) {
      const oldFile = new File([
        oldFileContent.content
      ], oldFileContent.name, {
        type: oldFileContent.type,
        lastModified: oldFileContent.lastModified,
      });
      const newFile = new File([
        newFileContent.content
      ], newFileContent.name, {
        type: newFileContent.type,
        lastModified: newFileContent.lastModified,
      });
      const formData = new FormData();
      formData.append("old_file", oldFile);
      formData.append("new_file", newFile);      try {
        // Use relative URL for proxy to work in all environments
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        const response = await fetch("/compare-bom", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);
        
        // Check if response is empty or has content
        const responseText = await response.text();
        console.log("Raw response:", responseText);
        
        if (!response.ok) {
          let errorData;
          try {
            errorData = JSON.parse(responseText);
          } catch {
            errorData = { detail: `HTTP ${response.status}: ${responseText || 'Unknown error'}` };
          }
          throw new Error(errorData.detail || "BOM comparison failed");
        }
        
        // Only parse JSON if we have content
        if (!responseText.trim()) {
          throw new Error("Empty response from backend");
        }
          const data = JSON.parse(responseText);
        console.log("Backend response received:", data);
        console.log("Backend response keys:", Object.keys(data));
        console.log("Processing backend response...");
        
        // Show validation warnings if any
        if (data.validation_warnings && data.validation_warnings.length > 0) {
          data.validation_warnings.forEach((warning: string) => {
            toast.error(`Warning: ${warning}`);
          });
        }
        
        // Show statistics
        if (data.statistics) {
          toast.success(`Comparison completed: ${data.statistics.total_changes} total changes found`);
        }
        
        console.log("Starting data mapping...");        // Map the backend response to the frontend component data structure
        // Keep the original field names (PACKAGE, OPT) so BOMCompare can access them directly
        console.log("Mapping added components...");
        const addedComponents = (data.added || []).map(comp => ({
          id: comp.REFDES || "",
          reference: comp.REFDES || "",
          value: comp.QTY || "",
          partNumber: comp.PartNumber || "",
          description: comp.DESCRIPTION || "",
          manufacturer: comp.PARTNAME || "",
          footprint: comp.PACKAGE || "",
          quantity: parseInt(comp.QTY || "0"),
          // Keep original field names for BOMCompare
          REFDES: comp.REFDES || "",
          QTY: comp.QTY || "",
          "PartNumber": comp.PartNumber || "",
          "PART-NUM": comp["PART-NUM"] || "",
          DESCRIPTION: comp.DESCRIPTION || "",
          PARTNAME: comp.PARTNAME || "",
          PACKAGE: comp.PACKAGE || "",
          OPT: comp.OPT || ""        }));
        
        console.log("Mapping deleted components...");
        const deletedComponents = (data.removed || []).map(comp => ({
          id: comp.REFDES || "",
          reference: comp.REFDES || "",
          value: comp.QTY || "",
          partNumber: comp.PartNumber || "",
          description: comp.DESCRIPTION || "",
          manufacturer: comp.PARTNAME || "",
          footprint: comp.PACKAGE || "",
          quantity: parseInt(comp.QTY || "0"),
          // Keep original field names for BOMCompare
          REFDES: comp.REFDES || "",
          QTY: comp.QTY || "",
          "PartNumber": comp.PartNumber || "",
          "PART-NUM": comp["PART-NUM"] || "",
          DESCRIPTION: comp.DESCRIPTION || "",
          PARTNAME: comp.PARTNAME || "",
          PACKAGE: comp.PACKAGE || "",
          OPT: comp.OPT || ""
        }));
        
        console.log("Mapping changed components...");
        const changedComponents = (data.changed || []).map(chg => {
          // Ensure we're accessing the data with proper format checking
          if (!chg || !chg.Original || !chg.Modified) {
            return {
              id: chg?.Reference || "unknown",
              reference: chg?.Reference || "unknown",              original: {
                partNumber: "",
                quantity: 0,
                value: "",
                reference: "",
                footprint: "",
                description: "",
                manufacturer: "",
                // Keep original field names for BOMCompare
                REFDES: "",
                QTY: "",
                "PartNumber": "",
                "PART-NUM": "",
                DESCRIPTION: "",
                PARTNAME: "",
                PACKAGE: "",
                OPT: ""
              },
              modified: {
                partNumber: "",
                quantity: 0,
                value: "",
                reference: "",
                footprint: "",
                description: "",
                manufacturer: "",
                // Keep original field names for BOMCompare
                REFDES: "",
                QTY: "",
                "PartNumber": "",
                "PART-NUM": "",
                DESCRIPTION: "",
                PARTNAME: "",
                PACKAGE: "",
                OPT: ""
              }
            };
          }            const mappedComponent = {
            id: chg.Reference,
            reference: chg.Reference,            original: {
              partNumber: chg.Original.PartNumber || "",
              quantity: parseInt(chg.Original.QTY || "0"),
              value: chg.Original.QTY || "",
              reference: chg.Original.REFDES || chg.Reference,
              footprint: chg.Original.PACKAGE || "",
              description: chg.Original.DESCRIPTION || "",
              manufacturer: chg.Original.PARTNAME || "",
              // Keep original field names for BOMCompare
              REFDES: chg.Original.REFDES || chg.Reference,
              QTY: chg.Original.QTY || "",
              "PartNumber": chg.Original.PartNumber || "",
              "PART-NUM": chg.Original["PART-NUM"] || "",
              DESCRIPTION: chg.Original.DESCRIPTION || "",
              PARTNAME: chg.Original.PARTNAME || "",
              PACKAGE: chg.Original.PACKAGE || "",
              OPT: chg.Original.OPT || ""            },modified: {
              partNumber: chg.Modified.PartNumber || "",
              quantity: parseInt(chg.Modified.QTY || "0"),
              value: chg.Modified.QTY || "",
              reference: chg.Modified.REFDES || chg.Reference,
              footprint: chg.Modified.PACKAGE || "",
              description: chg.Modified.DESCRIPTION || "",
              manufacturer: chg.Modified.PARTNAME || "",
              // Keep original field names for BOMCompare
              REFDES: chg.Modified.REFDES || chg.Reference,
              QTY: chg.Modified.QTY || "",
              "PartNumber": chg.Modified.PartNumber || "",
              "PART-NUM": chg.Modified["PART-NUM"] || "",
              DESCRIPTION: chg.Modified.DESCRIPTION || "",
              PARTNAME: chg.Modified.PARTNAME || "",
              PACKAGE: chg.Modified.PACKAGE || "",
              OPT: chg.Modified.OPT || ""
            },
          };          return mappedComponent;
        });
        
        console.log("Creating final result object...");
        const finalResult = {
          // Use the component data for legacy fields to maintain compatibility
          added: addedComponents,
          deleted: deletedComponents,
          changed: changedComponents,
          // Map the component data
          addedComponents,
          deletedComponents,
          changedComponents,
          // Add validation warnings and statistics
          validationWarnings: data.validation_warnings || [],
          statistics: data.statistics || {}
        };        
        console.log("Final result being set:", finalResult);
        console.log("Final result data counts:", {          addedComponents: finalResult.addedComponents.length,
          deletedComponents: finalResult.deletedComponents.length,
          changedComponents: finalResult.changedComponents.length
        });
        
        console.log("Setting comparison result in state...");
        setComparisonFiles({
          ...comparisonFiles,
          result: finalResult,
        });

        console.log("Switching to compare tab...");
        setActiveTab("compare");
          // Show success message with statistics
        const totalChanges = (data.statistics?.total_changes || 0);
        if (totalChanges === 0) {
          toast.success("Comparison completed - No differences found");
        } else {
          toast.success(`Comparison completed - ${totalChanges} changes found`);
        }
        
        console.log("Comparison completed successfully!");} catch (err: any) {
        console.error("BOM comparison error:", err);
        if (err.name === 'AbortError') {
          toast.error("BOM comparison timed out. Please try again.");
        } else if (err.message.includes('Failed to fetch')) {
          toast.error("Network error: Unable to connect to backend. Please check if the backend is running.");
        } else {
          toast.error(`BOM comparison failed: ${err.message}`);
        }
      } finally {
        setIsComparing(false); // Reset loading state
      }
      return;
    }    // Fallback: mock comparison for UI prototype
    const simulateComparison = (): ComparisonResult => {
      const file1Lines = oldFileContent?.content.split("\n") || [];
      const file2Lines = newFileContent?.content.split("\n") || [];
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
      return { 
        added, 
        deleted, 
        changed,
        addedComponents: [],
        deletedComponents: [],
        changedComponents: []
      };
    };    const result = simulateComparison();
    setComparisonFiles({
      ...comparisonFiles,
      result,
    });    if (fileType === "bom") {
      generateMockComponents(result, oldFileContent);
    } else if (fileType === "netlist") {
      generateMockConnections(result, oldFileContent);
    }
    setActiveTab("compare");
    setIsComparing(false); // Reset loading state
    toast.success("Comparison completed");
  };
  const generateMockComponents = (result: ComparisonResult, sourceFile: UploadedFile) => {
    if (!sourceFile) return;
    
    const mockComponents: ElectronicComponent[] = [];
    const lines = sourceFile.content.split('\n').filter(line => line.trim().length > 0);
    
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
  const generateMockConnections = (result: ComparisonResult, sourceFile: UploadedFile) => {
    if (!sourceFile) return;
    
    const mockConnections: NetlistConnection[] = [];
    const lines = sourceFile.content.split('\n').filter(line => line.trim().length > 0);
    
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
    
    setConnections(mockConnections);  };  return (
    <div className="mx-auto py-8 px-4 max-w-[1400px]">
      <div className="space-y-8"><div>
          <h1 className="text-3xl font-bold tracking-tight">Electronic Schematic Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Upload, analyze, and compare BOM and netlist files with AI assistance
          </p>
        </div>        <div className="w-full">
          <div className="w-full">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <div className="flex items-center justify-between">                <TabsList>
                  <TabsTrigger value="upload">Upload</TabsTrigger>
                  <TabsTrigger value="files">Files ({files.length})</TabsTrigger>
                  <TabsTrigger value="compare">Compare</TabsTrigger>
                  <TabsTrigger value="ai-assistant">AI Assistant</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
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
              </TabsContent>              <TabsContent value="files" className="space-y-4">
                <FileList
                  files={files}
                  selectedFiles={selectedFiles}
                  onSelectFile={handleSelectFile}
                  onRemoveFile={handleRemoveFile}
                  onPreviewFile={handlePreviewFile}
                  previewedFile={previewedFile}
                />
                {/* Show table preview when a file is previewed */}
                {tablePreview && previewedFile && (
                  <div className="mt-6">
                    <h2 className="text-lg font-semibold mb-2">
                      File Preview: {previewedFile.name}
                    </h2>
                    <div className="text-sm text-gray-600 mb-2">
                      Showing first {Math.min(50, tablePreview.length)} rows
                      {tablePreview.length >= 50 && " (truncated for preview)"}
                    </div>
                    <FileTable data={tablePreview} />
                  </div>
                )}
              </TabsContent><TabsContent value="compare" className="space-y-4">                <FileComparison 
                  comparisonFiles={comparisonFiles} 
                  onCompare={handleCompare} 
                  showTabs={fileType !== "bom"} 
                  isComparing={isComparing}
                />
                {/* Debug info */}
                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded">
                  Debug: fileType = "{fileType}", showTabs = {String(fileType !== "bom")}, 
                  will show BOMCompare = {String(fileType === "bom")}
                </div>
                {fileType === "bom" && (
                  <div>
                    <BOMCompare comparisonResult={comparisonFiles.result} />
                  </div>
                )}
                {fileType === "netlist" && (
                  <SchematicComparison comparisonFiles={comparisonFiles} onCompare={handleCompare} />                )}
              </TabsContent>

              <TabsContent value="ai-assistant" className="space-y-4">
                <div className="h-[600px]">
                  <AIChat
                    selectedFile={previewedFile || (selectedFiles.length === 1 ? selectedFiles[0] : null)}
                    comparisonResult={comparisonFiles.result}
                    comparedFiles={{
                      file1: comparisonFiles.file1,
                      file2: comparisonFiles.file2
                    }}                  />
                </div>              </TabsContent>

              <TabsContent value="settings" className="space-y-4">
                <Settings />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
