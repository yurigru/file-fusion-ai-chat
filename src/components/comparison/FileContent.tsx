
import React from "react";
import { getLineClass } from "@/utils/comparison-format";

interface FileContentProps {
  visibleLines: string[];
}

const FileContent: React.FC<FileContentProps> = ({ visibleLines }) => {
  if (visibleLines.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No differences to display</div>;
  }

  return (
    <div className="bg-muted/30 p-2 rounded-lg overflow-auto max-h-96">
      <pre className="text-xs font-mono">
        {visibleLines.map((line, index) => (
          <div 
            key={index} 
            className={`px-2 py-0.5 ${getLineClass(line)}`}
          >
            {line}
          </div>
        ))}
      </pre>
    </div>
  );
};

export default FileContent;
