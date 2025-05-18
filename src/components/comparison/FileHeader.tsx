
import React from "react";
import { UploadedFile } from "@/types";

interface FileHeaderProps {
  file1: UploadedFile | null;
  file2: UploadedFile | null;
}

const FileHeader: React.FC<FileHeaderProps> = ({ file1, file2 }) => {
  return (
    <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
      <div className="space-y-2">
        <p className="text-sm font-medium">File 1:</p>
        <div className="bg-background p-3 rounded border min-h-20 flex items-center justify-center">
          {file1 ? (
            <p className="truncate">{file1.name}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Select first file</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">File 2:</p>
        <div className="bg-background p-3 rounded border min-h-20 flex items-center justify-center">
          {file2 ? (
            <p className="truncate">{file2.name}</p>
          ) : (
            <p className="text-muted-foreground text-sm">Select second file</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileHeader;
