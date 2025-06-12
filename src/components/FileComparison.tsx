import { useState, useEffect } from "react";
import { ComparisonFiles, ComparisonResult, UploadedFile } from "@/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeftRight, Plus, Minus, Check, RefreshCw } from "lucide-react";
import FileTable from "@/components/FileTable";

interface FileComparisonProps {
  comparisonFiles: ComparisonFiles;
  onCompare: () => void;
  showTabs?: boolean; // Add optional prop to control tab visibility
}

interface BOMRow {
  [key: string]: string;
}

const FileComparison = ({ comparisonFiles, onCompare, showTabs = true }: FileComparisonProps) => {
  const [activeTab, setActiveTab] = useState("all");
  const [visibleLines, setVisibleLines] = useState<string[]>([]);
  const [addedTable, setAddedTable] = useState<BOMRow[]>([]);
  const [deletedTable, setDeletedTable] = useState<BOMRow[]>([]);
  const [changedTable, setChangedTable] = useState<BOMRow[]>([]);
  const { file1, file2, result } = comparisonFiles;

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

  useEffect(() => {
    if (result) {
      updateVisibleLines();
    }
  }, [result, activeTab]);

  useEffect(() => {
    if (result && file1 && file2) {
      // If both files are .xml and backend result is present, parse backend data for tables
      const isXML = file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml');
      
      if (isXML) {
        console.log("XML comparison result:", result);
        // Create tables from component data
        if (result.addedComponents && result.addedComponents.length > 0) {
          setAddedTable(
            result.addedComponents.map(comp => ({
              REFDES: comp.reference || '',
              PartNumber: comp.partNumber || '',
              QTY: comp.value || (comp.quantity?.toString() || ''),
              PACKAGE: comp.footprint || '',
              DESCRIPTION: comp.description || '',
              OPT: ''
            }))
          );
        } else {
          setAddedTable([]);
        }

        if (result.deletedComponents && result.deletedComponents.length > 0) {
          setDeletedTable(
            result.deletedComponents.map(comp => ({
              REFDES: comp.reference || '',
              PartNumber: comp.partNumber || '',
              QTY: comp.value || (comp.quantity?.toString() || ''),
              PACKAGE: comp.footprint || '',
              DESCRIPTION: comp.description || '',
              OPT: ''
            }))
          );
        } else {
          setDeletedTable([]);
        }

        if (result.changedComponents && result.changedComponents.length > 0) {
          setChangedTable(
            result.changedComponents.map(chg => ({
              REFDES: chg.reference || '',
              "Original PartNumber": chg.original?.partNumber || '',
              "New PartNumber": chg.modified?.partNumber || '',
              "Original QTY": chg.original?.value || (chg.original?.quantity?.toString() || ''),
              "New QTY": chg.modified?.value || (chg.modified?.quantity?.toString() || ''),
              "Original DESCRIPTION": chg.original?.description || '',
              "New DESCRIPTION": chg.modified?.description || ''
            }))
          );
        } else {
          setChangedTable([]);
        }
        
        console.log("Tables set:", {
          addedTable: addedTable.length,
          deletedTable: deletedTable.length,
          changedTable: changedTable.length
        });
        
        // Special message for no changes
        if (!result.addedComponents?.length && !result.deletedComponents?.length && !result.changedComponents?.length) {
          console.log("No differences found between XML files");
        }
      } else {
        // Non-XML files
        setAddedTable([]);
        setDeletedTable([]);
        setChangedTable([]);
      }
    }
  }, [result, file1, file2]);

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
      
      {result && file1 && file2 && (
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
            </Button>          </div>

          {showTabs && (
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
                  <div className="p-8 text-center border rounded-md bg-muted/20">
                    <h3 className="text-lg font-medium mb-2">No Differences Found</h3>
                    <p className="text-muted-foreground">
                      The two files appear to be identical. Either there are no differences, or the XML files have a format that couldn't be fully parsed.
                    </p>
                    {file1.name.toLowerCase().endsWith('.xml') && file2.name.toLowerCase().endsWith('.xml') && (
                      <div className="mt-4 text-left text-sm p-4 bg-amber-50 border border-amber-200 rounded">
                        <p className="font-medium text-amber-700 mb-1">Troubleshooting Tips:</p>
                        <ol className="list-decimal pl-4 text-amber-700 space-y-1">
                          <li>Check that both XML files contain valid BOM data</li>
                          <li>Ensure the XML files use consistent element names for components</li>
                          <li>Reference designators should be present in the XML (e.g. "R1", "C42")</li>
                        </ol>
                      </div>
                    )}
                  </div>
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
          )}
        </div>
      )}
    </div>
  );
};

export default FileComparison;
