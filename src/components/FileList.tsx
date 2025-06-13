
import { useState, useEffect } from "react";
import { Search, File, X, FileJson, FileText, Check, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UploadedFile } from "@/types";

interface FileListProps {
  files: UploadedFile[];
  selectedFiles: UploadedFile[];
  onSelectFile: (file: UploadedFile) => void;
  onRemoveFile: (fileId: string) => void;
  onPreviewFile?: (file: UploadedFile) => void;
  previewedFile?: UploadedFile | null;
}

const FileList = ({ files, selectedFiles, onSelectFile, onRemoveFile, onPreviewFile, previewedFile }: FileListProps) => {
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

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const getFileTypeColor = (filename: string) => {
    const ext = getFileExtension(filename);
    switch (ext) {
      case 'xml': return 'bg-blue-100 text-blue-800';
      case 'csv': return 'bg-green-100 text-green-800';
      case 'net': return 'bg-purple-100 text-purple-800';
      case 'xlsx': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const isPreviewed = (file: UploadedFile): boolean => {
    return previewedFile?.id === file.id;
  };

  const handleRowClick = (file: UploadedFile) => {
    if (onPreviewFile) {
      onPreviewFile(file);
    }
  };

  const handleSelectClick = (e: React.MouseEvent, file: UploadedFile) => {
    e.stopPropagation(); // Prevent row click when clicking select button
    onSelectFile(file);
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
      </div>      <div className="text-sm text-muted-foreground">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} found
        {selectedFiles.length > 0 && (
          <span className="ml-2 font-medium text-blue-600">
            • {selectedFiles.length} selected for comparison
          </span>
        )}
      </div>

      <div className="text-sm text-gray-500 mb-3">
        💡 Click on a file row to preview • Click the select button to choose for comparison
      </div>

      <div className="border rounded-md divide-y">        {filteredFiles.length > 0 ? (
          filteredFiles.map((file) => (
            <div
              key={file.id}
              className={`flex items-center justify-between p-3 transition-all cursor-pointer hover:bg-accent/50 ${
                isPreviewed(file) ? 'bg-blue-50 border-blue-200' : 'border-transparent'
              } ${
                isSelected(file) ? "ring-2 ring-blue-500 bg-accent" : ""
              } border-l-4`}
              onClick={() => handleRowClick(file)}
            >
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                {getFileIcon(file.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium truncate">{file.name}</p>
                    <Badge className={getFileTypeColor(file.name)}>
                      {getFileExtension(file.name).toUpperCase()}
                    </Badge>
                    {isPreviewed(file) && (
                      <Badge variant="outline" className="text-blue-600 border-blue-300">
                        <Eye className="w-3 h-3 mr-1" />
                        Previewing
                      </Badge>
                    )}
                    {isSelected(file) && (
                      <Badge variant="default" className="bg-blue-600">
                        <Check className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(file.size)} • Uploaded {new Date(file.lastModified).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <Button
                  variant={isSelected(file) ? "default" : "outline"}
                  size="sm"
                  onClick={(e) => handleSelectClick(e, file)}
                  disabled={!isSelected(file) && selectedFiles.length >= 2}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFile(file.id);
                  }}
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
