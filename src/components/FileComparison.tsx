import { useState, useEffect } from "react";
import { ComparisonFiles, ComparisonResult, UploadedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Plus, Minus, Check, RefreshCw } from "lucide-react";

interface FileComparisonProps {
  comparisonFiles: ComparisonFiles;
  onCompare: () => void;
}

const FileComparison = ({ comparisonFiles, onCompare }: FileComparisonProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  
  const { file1, file2, result } = comparisonFiles;

  useEffect(() => {
    if (result) {
      updateVisibleLines();
    }
  }, [result, activeTab]);

  const updateVisibleLines = () => {
    if (!result) return;
    
    let lines: string[] = [];
    
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
      
      lines = sorted;
    }
    
    setVisibleLines(lines);
  };

  // Simple line class based on content prefix
  const getLineClass = (line: string) => {
    if (line.startsWith('+ ')) return 'bg-added/10 text-added';
    if (line.startsWith('- ')) return 'bg-deleted/10 text-deleted';
    if (line.startsWith('~ ')) return 'bg-changed/10 text-changed';
    return '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">File Comparison</h3>
        <Button
          onClick={onCompare}
          disabled={!file1 || !file2}
          className="flex items-center space-x-2"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Compare Files
        </Button>
      </div>

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
              onClick={updateVisibleLines} 
              className="text-xs"
            >
              <RefreshCw className="mr-1 h-3 w-3" /> Refresh
            </Button>
          </div>

          <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="all">All Changes</TabsTrigger>
              <TabsTrigger value="added">Added</TabsTrigger>
              <TabsTrigger value="deleted">Deleted</TabsTrigger>
              <TabsTrigger value="changed">Changed</TabsTrigger>
            </TabsList>
            <TabsContent value={activeTab} className="mt-4">
              <div className="bg-muted/30 p-2 rounded-lg overflow-auto max-h-96">
                <pre className="text-xs font-mono">
                  {visibleLines.length > 0 ? (
                    visibleLines.map((line, index) => (
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
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default FileComparison;
