
import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploader from "@/components/FileUploader";
import FileList from "@/components/FileList";
import FileComparison from "@/components/FileComparison";
import AIChat from "@/components/AIChat";
import ExportOptions from "@/components/ExportOptions";
import { UploadedFile, ComparisonFiles, ComparisonResult } from "@/types";
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

  useEffect(() => {
    // When two files are selected, automatically set them as comparison files
    if (selectedFiles.length === 2) {
      setComparisonFiles({
        file1: selectedFiles[0],
        file2: selectedFiles[1],
        result: null,
      });
    } else if (selectedFiles.length < 2) {
      setComparisonFiles({
        file1: selectedFiles[0] || null,
        file2: null,
        result: null,
      });
    }
  }, [selectedFiles]);

  const handleFilesUploaded = (newFiles: UploadedFile[]) => {
    setFiles((prev) => [...prev, ...newFiles]);
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
    
    // Switch to the Compare tab
    setActiveTab("compare");
    toast.success("Comparison completed");
  };

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">File Analyzer</h1>
          <p className="text-muted-foreground mt-2">
            Upload, analyze, and compare files with AI assistance
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
                    file2Name: comparisonFiles.file2?.name || null
                  }}
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
                <FileComparison
                  comparisonFiles={comparisonFiles}
                  onCompare={handleCompare}
                />
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
