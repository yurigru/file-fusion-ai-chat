
import { useState, useRef } from "react";
import { Upload, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { UploadedFile } from "@/types";

interface FileUploaderProps {
  onFilesUploaded: (files: UploadedFile[]) => void;
}

const FileUploader = ({ onFilesUploaded }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (fileList: FileList) => {
    setUploading(true);
    const files: UploadedFile[] = [];
    
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      
      // Create a unique ID for the file
      const id = `file-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Read the file content
      const content = await readFileContent(file);
      
      files.push({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified,
        content,
        uploadProgress: 100
      });
    }
    
    setUploading(false);
    onFilesUploaded(files);
    toast.success(`${files.length} file${files.length === 1 ? '' : 's'} uploaded successfully`);
  };
  
  const readFileContent = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          resolve(event.target.result as string);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsText(file);
    });
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFiles(e.target.files);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragging ? "border-primary bg-primary/5" : "border-gray-300 hover:border-primary/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        className="hidden"
        multiple
      />
      
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className={`relative ${uploading ? 'animate-pulse' : ''}`}>
          <Upload 
            size={48} 
            className={`mx-auto text-primary/70 ${isDragging ? 'text-primary' : ''}`} 
          />
          {isDragging && (
            <span className="absolute inset-0 rounded-full bg-primary/20 animate-pulse-ring"></span>
          )}
        </div>
        
        <h3 className="text-lg font-medium">
          {uploading ? "Uploading..." : "Drop files here or click to upload"}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-md">
          Supported file types: .txt, .csv, .json, .xml, .html, .md, .js, .ts, .jsx, .tsx, .css, .scss
        </p>
        
        <Button 
          onClick={triggerFileInput} 
          disabled={uploading}
          variant="outline"
          className="mt-4"
        >
          <File className="mr-2 h-4 w-4" />
          Browse Files
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
