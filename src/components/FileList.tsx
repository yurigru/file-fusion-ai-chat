
import { useState, useEffect } from "react";
import { Search, File, X, FileJson, FileText, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { UploadedFile } from "@/types";

interface FileListProps {
  files: UploadedFile[];
  selectedFiles: UploadedFile[];
  onSelectFile: (file: UploadedFile) => void;
  onRemoveFile: (fileId: string) => void;
}

const FileList = ({ files, selectedFiles, onSelectFile, onRemoveFile }: FileListProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredFiles, setFilteredFiles] = useState<UploadedFile[]>(files);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredFiles(files);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = files.filter(
        (file) => file.name.toLowerCase().includes(query)
      );
      setFilteredFiles(filtered);
    }
  }, [searchQuery, files]);

  const getFileIcon = (fileType: string) => {
    if (fileType.includes("json")) return <FileJson className="h-5 w-5 text-orange-500" />;
    return <FileText className="h-5 w-5 text-blue-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const isSelected = (file: UploadedFile): boolean => {
    return selectedFiles.some((selected) => selected.id === file.id);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search files..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
            onClick={() => setSearchQuery("")}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} found
      </div>

      <div className="border rounded-md divide-y">
        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 hover:bg-accent/50 transition-colors ${
                isSelected(file) ? "bg-accent" : ""
              }`}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <Button
                  variant={isSelected(file) ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => onSelectFile(file)}
                  className="text-xs"
                >
                  {isSelected(file) ? (
                    <>
                      <Check className="mr-1 h-3 w-3" /> Selected
                    </>
                  ) : (
                    "Select"
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => onRemoveFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center">
            <File className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No files found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileList;
