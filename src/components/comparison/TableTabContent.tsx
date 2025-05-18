
import React from "react";
import FileTable, { Column } from "@/components/FileTable";

interface TableTabContentProps {
  data: Array<{ [key: string]: string }>;
  columns: Column[];
  emptyMessage: string;
}

const TableTabContent: React.FC<TableTabContentProps> = ({ 
  data, 
  columns, 
  emptyMessage 
}) => {
  if (data.length > 0) {
    return <FileTable columns={columns} data={data} />;
  }
  return <div className="p-4 text-center text-muted-foreground">{emptyMessage}</div>;
};

export default TableTabContent;
