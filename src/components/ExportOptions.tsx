
import { Download, FileJson } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComparisonResult } from "@/types";

interface ExportOptionsProps {
  comparisonResult: ComparisonResult | null;
  comparedFiles: {
    file1Name: string | null;
    file2Name: string | null;
  };
}

const ExportOptions = ({ comparisonResult, comparedFiles }: ExportOptionsProps) => {
  const exportAsHTML = () => {
    if (!comparisonResult) return;
    
    const { file1Name, file2Name } = comparedFiles;
    
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comparison: ${file1Name} vs ${file2Name}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 1000px; margin: 0 auto; padding: 20px; }
          h1 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
          pre { background: #f5f5f5; padding: 15px; border-radius: 5px; overflow-x: auto; }
          .added { background-color: #e6ffed; color: #22863a; }
          .deleted { background-color: #ffeef0; color: #cb2431; }
          .changed { background-color: #fff5b1; color: #735c0f; }
          .summary { display: flex; gap: 20px; margin-bottom: 20px; }
          .summary div { display: flex; align-items: center; }
          .summary .dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; }
          .summary .added-dot { background-color: #22863a; }
          .summary .deleted-dot { background-color: #cb2431; }
          .summary .changed-dot { background-color: #735c0f; }
        </style>
      </head>
      <body>
        <h1>File Comparison Report</h1>
        <p><strong>File 1:</strong> ${file1Name}</p>
        <p><strong>File 2:</strong> ${file2Name}</p>
        
        <div class="summary">
          <div><span class="dot added-dot"></span> ${comparisonResult.added.length} Added</div>
          <div><span class="dot deleted-dot"></span> ${comparisonResult.deleted.length} Deleted</div>
          <div><span class="dot changed-dot"></span> ${comparisonResult.changed.length} Changed</div>
        </div>
        
        <h2>Changes</h2>
        <pre>${formatChangesForHTML(comparisonResult)}</pre>
        
        <footer>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </footer>
      </body>
      </html>
    `;
    
    // Create blob and download
    downloadFile(htmlContent, `comparison-${file1Name}-${file2Name}.html`, 'text/html');
  };
  
  const exportAsPDF = () => {
    // For the UI prototype, we'll just alert that this would generate a PDF
    alert("PDF export functionality will be implemented with a PDF generation library.");
  };
  
  const exportAsJSON = () => {
    if (!comparisonResult) return;
    
    const { file1Name, file2Name } = comparedFiles;
    
    // Create JSON content
    const jsonContent = JSON.stringify({
      file1: file1Name,
      file2: file2Name,
      timestamp: new Date().toISOString(),
      comparison: comparisonResult
    }, null, 2);
    
    // Create blob and download
    downloadFile(jsonContent, `comparison-${file1Name}-${file2Name}.json`, 'application/json');
  };
  
  const formatChangesForHTML = (result: ComparisonResult): string => {
    let html = '';
    
    // Format added lines
    result.added.forEach(lineIdx => {
      html += `<div class="added">+ Line ${lineIdx}</div>`;
    });
    
    // Format deleted lines
    result.deleted.forEach(lineIdx => {
      html += `<div class="deleted">- Line ${lineIdx}</div>`;
    });
    
    // Format changed lines
    result.changed.forEach(change => {
      html += `<div class="changed">~ Line ${change.line}: "${change.original}" changed to "${change.modified}"</div>`;
    });
    
    return html;
  };
  
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center space-x-2"
          disabled={!comparisonResult}
        >
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsHTML}>
          Export as HTML
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF}>
          Export as PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsJSON}>
          <FileJson className="h-4 w-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportOptions;
