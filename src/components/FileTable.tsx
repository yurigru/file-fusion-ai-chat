
import React, { useMemo, useState } from "react";

export interface Column {
  header: string;
  accessor: string;
}

export interface FileTableProps {
  columns: Column[];
  data: Array<{ [key: string]: string }>;
}

const FileTable: React.FC<FileTableProps> = ({ columns, data }) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>(columns[0]?.accessor || "");
  const [sortAsc, setSortAsc] = useState(true);

  // Error/fallback for empty or invalid data
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No data to display or file could not be parsed.</div>;
  }

  try {
    const filtered = useMemo(() => {
      return data.filter(row =>
        columns.some(col =>
          (row[col.accessor] || "").toLowerCase().includes(search.toLowerCase())
        )
      );
    }, [data, search, columns]);

    const sorted = useMemo(() => {
      return [...filtered].sort((a, b) => {
        const aVal = a[sortKey] || "";
        const bVal = b[sortKey] || "";
        if (aVal < bVal) return sortAsc ? -1 : 1;
        if (aVal > bVal) return sortAsc ? 1 : -1;
        return 0;
      });
    }, [filtered, sortKey, sortAsc]);

    return (
      <div className="overflow-x-auto">
        <div className="mb-2 flex items-center gap-2">
          <input
            className="border rounded px-2 py-1 text-sm"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <table className="min-w-full border text-sm">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.accessor}
                  className="border px-2 py-1 cursor-pointer select-none"
                  onClick={() => {
                    if (sortKey === col.accessor) setSortAsc(a => !a);
                    else { setSortKey(col.accessor); setSortAsc(true); }
                  }}
                >
                  {col.header} {sortKey === col.accessor ? (sortAsc ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.accessor} className="border px-2 py-1">{row[col.accessor] || ""}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  } catch (e: any) {
    return <div className="p-4 text-center text-destructive">Error rendering table: {e.message}</div>;
  }
};

export default FileTable;
