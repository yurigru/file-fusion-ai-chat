import { useState, useEffect } from "react";
import { ComparisonFiles, ComparisonResult, UploadedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Plus, Minus, Check, RefreshCw } from "lucide-react";
import FileTable from "@/components/FileTable";

interface FileComparisonProps {
  comparisonFiles: ComparisonFiles;
  onCompare: () => void;
}

const FileComparison = ({ comparisonFiles, onCompare }: FileComparisonProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [addedTable, setAddedTable] = useState<string[][]>([]);
  const [deletedTable, setDeletedTable] = useState<string[][]>([]);
  const [changedTable, setChangedTable] = useState<string[][]>([]);
  
  const { file1, file2, result } = comparisonFiles;

  useEffect(() => {
    if (result) {
      updateVisibleLines();
    }
  }, [result, activeTab]);

  useEffect(() => {
    if (result && file1 && file2) {
      // If both files are .xml and backend result is present, parse backend data for tables
      const isXML = file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml');
      if (isXML && result.added && result.deleted && result.changed) {
        // Parse backend result (JSON stringified objects)
        const parseComp = (comp: any) => [comp.Reference, comp.Value, comp.Manufacturer, comp.PartNumber];
        setAddedTable(result.addedComponents ? result.addedComponents.map(comp => [comp.reference, comp.value, comp.manufacturer, comp.partNumber]) : []);
        setDeletedTable(result.deletedComponents ? result.deletedComponents.map(comp => [comp.reference, comp.value, comp.manufacturer, comp.partNumber]) : []);
        setChangedTable(result.changedComponents ? result.changedComponents.map(chg => [chg.reference, chg.original.value, chg.modified.value, chg.original.manufacturer, chg.modified.manufacturer, chg.original.partNumber, chg.modified.partNumber]) : []);
      } else {
        setAddedTable([]);
        setDeletedTable([]);
        setChangedTable([]);
      }
    }
  }, [result, file1, file2]);

  const updateVisibleLines = () => {
    if (!result) return;
    let nextVisibleLines: string[] = [];
    if (file1 && file2) {
      // If result is empty and both files are .xml, show the full XML content
      const isXML = file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml');
      const noChanges = result.added.length === 0 && result.deleted.length === 0 && result.changed.length === 0;
      if (isXML && noChanges) {
        nextVisibleLines = file2.content.split('\n');
      } else {
        const file1Lines = file1.content.split('\n');
        const file2Lines = file2.content.split('\n');
        const allLines = new Map<number, { content: string; status: 'added' | 'deleted' | 'changed' | 'unchanged' }>();
        file1Lines.forEach((line, idx) => {
          allLines.set(idx, { content: line, status: 'unchanged' });
        });
        if (activeTab === 'all' || activeTab === 'deleted') {
          result.deleted.forEach(lineIdx => {
            const idx = parseInt(lineIdx);
            if (allLines.has(idx)) {
              allLines.set(idx, { content: file1Lines[idx], status: 'deleted' });
            }
          });
        }
        if (activeTab === 'all' || activeTab === 'added') {
          result.added.forEach(lineIdx => {
            const idx = parseInt(lineIdx);
            allLines.set(file1Lines.length + idx, { content: file2Lines[idx], status: 'added' });
          });
        }
        if (activeTab === 'all' || activeTab === 'changed') {
          result.changed.forEach(change => {
            allLines.set(change.line, { content: change.modified, status: 'changed' });
          });
        }
        nextVisibleLines = Array.from(allLines.entries())
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
      }
    }
    setVisibleLines(nextVisibleLines);
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
          disabled={!file1 || !file2} // Note: This button will not have the loading state
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
                  {addedTable.length} Added
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-deleted"></div>
                <span className="text-sm text-muted-foreground">
                  {deletedTable.length} Deleted
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-changed"></div>
                <span className="text-sm text-muted-foreground">
                  {changedTable.length} Changed
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
            <TabsContent value="all" className="mt-4">
              {addedTable.length > 0 && <><div className="font-bold mb-1">Added</div><FileTable data={addedTable} /></>}
              {deletedTable.length > 0 && <><div className="font-bold mb-1">Deleted</div><FileTable data={deletedTable} /></>}
              {changedTable.length > 0 && <><div className="font-bold mb-1">Changed</div><FileTable data={changedTable} /></>}
              {addedTable.length === 0 && deletedTable.length === 0 && changedTable.length === 0 && (
                <div className="p-4 text-center text-muted-foreground">No differences to display</div>
              )}
            </TabsContent>
            <TabsContent value="added" className="mt-4">
              {addedTable.length > 0 ? <FileTable data={addedTable} /> : <div className="p-4 text-center text-muted-foreground">No added components</div>}
            </TabsContent>
            <TabsContent value="deleted" className="mt-4">
              {deletedTable.length > 0 ? <FileTable data={deletedTable} /> : <div className="p-4 text-center text-muted-foreground">No deleted components</div>}
            </TabsContent>
            <TabsContent value="changed" className="mt-4">
              {changedTable.length > 0 ? <FileTable data={changedTable} /> : <div className="p-4 text-center text-muted-foreground">No changed components</div>}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default FileComparison;
