
import { Download, FileJson, Table } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComparisonResult, ElectronicComponent, NetlistConnection } from "@/types";

interface ExportOptionsProps {
  comparisonResult: ComparisonResult | null;
  comparedFiles: {
    file1Name: string | null;
    file2Name: string | null;
    fileType?: "bom" | "netlist" | null;
  };
  components?: ElectronicComponent[];
  connections?: NetlistConnection[];
}

const ExportOptions = ({ 
  comparisonResult, 
  comparedFiles, 
  components = [], 
  connections = [] 
}: ExportOptionsProps) => {
  const exportAsHTML = () => {
    if (!comparisonResult) return;
    
    const { file1Name, file2Name, fileType } = comparedFiles;
    
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
          h1, h2 { border-bottom: 1px solid #eee; padding-bottom: 10px; }
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
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f8f8f8; font-weight: bold; }
          tr.added { background-color: #e6ffed; }
          tr.deleted { background-color: #ffeef0; }
          tr.changed { background-color: #fff5b1; }
        </style>
      </head>
      <body>
        <h1>Electronic Schematic Comparison Report</h1>
        <p><strong>File 1:</strong> ${file1Name}</p>
        <p><strong>File 2:</strong> ${file2Name}</p>
        <p><strong>File Type:</strong> ${fileType === 'bom' ? 'Bill of Materials (BOM)' : fileType === 'netlist' ? 'Netlist' : 'Unknown'}</p>
        
        <div class="summary">
          <div><span class="dot added-dot"></span> ${comparisonResult.added.length} Added</div>
          <div><span class="dot deleted-dot"></span> ${comparisonResult.deleted.length} Deleted</div>
          <div><span class="dot changed-dot"></span> ${comparisonResult.changed.length} Changed</div>
        </div>
        
        ${fileType === 'bom' && components.length > 0 ? generateBOMTable(components, comparisonResult) : ''}
        ${fileType === 'netlist' && connections.length > 0 ? generateNetlistTable(connections, comparisonResult) : ''}
        
        <h2>Raw Changes</h2>
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
  
  const generateBOMTable = (components: ElectronicComponent[], result: ComparisonResult) => {
    return `
      <h2>Component Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Reference</th>
            <th>Value</th>
            <th>Quantity</th>
            <th>Manufacturer</th>
            <th>Part Number</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${components.map((component, index) => {
            // Determine if this component was added, deleted, or changed
            const isAdded = result.added.includes(index.toString());
            const isDeleted = result.deleted.includes(index.toString());
            const isChanged = result.changed.some(change => change.line === index);
            const status = isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged';
            const rowClass = isAdded ? 'added' : isDeleted ? 'deleted' : isChanged ? 'changed' : '';
            
            return `
              <tr class="${rowClass}">
                <td>${component.reference}</td>
                <td>${component.value}</td>
                <td>${component.quantity}</td>
                <td>${component.manufacturer || '-'}</td>
                <td>${component.partNumber || '-'}</td>
                <td>${status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };
  
  const generateNetlistTable = (connections: NetlistConnection[], result: ComparisonResult) => {
    return `
      <h2>Netlist Comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Net</th>
            <th>Nodes</th>
            <th>Type</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${connections.map((connection, index) => {
            // Determine if this connection was added, deleted, or changed
            const isAdded = result.added.includes(index.toString());
            const isDeleted = result.deleted.includes(index.toString());
            const isChanged = result.changed.some(change => change.line === index);
            const status = isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged';
            const rowClass = isAdded ? 'added' : isDeleted ? 'deleted' : isChanged ? 'changed' : '';
            
            return `
              <tr class="${rowClass}">
                <td>${connection.net}</td>
                <td>${connection.nodes.join(', ')}</td>
                <td>${connection.type || 'signal'}</td>
                <td>${status}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  };
  
  const exportAsPDF = () => {
    // For the UI prototype, we'll just alert that this would generate a PDF
    alert("PDF export functionality will be implemented with a PDF generation library.");
  };
  
  const exportAsJSON = () => {
    if (!comparisonResult) return;
    
    const { file1Name, file2Name, fileType } = comparedFiles;
    
    // Create JSON content
    const jsonContent = JSON.stringify({
      file1: file1Name,
      file2: file2Name,
      fileType: fileType,
      timestamp: new Date().toISOString(),
      comparison: comparisonResult,
      data: fileType === 'bom' ? { components } : fileType === 'netlist' ? { connections } : {}
    }, null, 2);
    
    // Create blob and download
    downloadFile(jsonContent, `comparison-${file1Name}-${file2Name}.json`, 'application/json');
  };
  
  const exportAsCSV = () => {
    if (!comparisonResult) return;
    
    const { file1Name, file2Name, fileType } = comparedFiles;
    let csvContent = '';
    
    if (fileType === 'bom' && components.length > 0) {
      // Header
      csvContent = 'Reference,Value,Quantity,Manufacturer,Part Number,Status\n';
      
      // Data rows
      components.forEach((component, index) => {
        const isAdded = comparisonResult.added.includes(index.toString());
        const isDeleted = comparisonResult.deleted.includes(index.toString());
        const isChanged = comparisonResult.changed.some(change => change.line === index);
        const status = isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged';
        
        csvContent += `"${component.reference}","${component.value}",${component.quantity},"${component.manufacturer || ''}","${component.partNumber || ''}","${status}"\n`;
      });
    } else if (fileType === 'netlist' && connections.length > 0) {
      // Header
      csvContent = 'Net,Nodes,Type,Status\n';
      
      // Data rows
      connections.forEach((connection, index) => {
        const isAdded = comparisonResult.added.includes(index.toString());
        const isDeleted = comparisonResult.deleted.includes(index.toString());
        const isChanged = comparisonResult.changed.some(change => change.line === index);
        const status = isAdded ? 'Added' : isDeleted ? 'Deleted' : isChanged ? 'Changed' : 'Unchanged';
        
        csvContent += `"${connection.net}","${connection.nodes.join('; ')}","${connection.type || 'signal'}","${status}"\n`;
      });
    } else {
      // Fallback to simple changes CSV
      csvContent = 'Type,Line,Content\n';
      
      comparisonResult.added.forEach(line => {
        csvContent += `"Added","${line}","Added line"\n`;
      });
      
      comparisonResult.deleted.forEach(line => {
        csvContent += `"Deleted","${line}","Deleted line"\n`;
      });
      
      comparisonResult.changed.forEach(change => {
        csvContent += `"Changed","${change.line}","${change.original.replace(/"/g, '""')}" -> "${change.modified.replace(/"/g, '""')}"\n`;
      });
    }
    
    // Create blob and download
    downloadFile(csvContent, `comparison-${file1Name}-${file2Name}.csv`, 'text/csv');
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
        <DropdownMenuItem onClick={exportAsCSV}>
          <Table className="h-4 w-4 mr-2" />
          Export as CSV
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ExportOptions;
