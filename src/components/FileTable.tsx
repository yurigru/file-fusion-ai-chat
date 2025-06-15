import React, { useMemo, useState } from "react";

const COLUMN_HEADERS = [
  { key: "REFDES", label: "Reference Designators" },
  { key: "PartNumber", label: "Part Number" },
  { key: "QTY", label: "Quantity" },
  { key: "PACKAGE", label: "Package" },
  { key: "DESCRIPTION", label: "Description" },
  { key: "OPT", label: "OPT" },
];

interface BOMRow {
  [key: string]: string;
}

interface FileTableProps {
  data: BOMRow[];
}

const FileTable: React.FC<FileTableProps> = ({ data }) => {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>(COLUMN_HEADERS[0].key);
  const [sortAsc, setSortAsc] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Error/fallback for empty or invalid data
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="p-4 text-center text-muted-foreground">No data to display or file could not be parsed.</div>;
  }

  try {
    const filtered = useMemo(() => {
      return data.filter(row =>
        COLUMN_HEADERS.some(col => {
          const val = row[col.key];
          return typeof val === "string" && val.toLowerCase().includes(search.toLowerCase());
        })
      );
    }, [data, search]);

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
      <div className="overflow-x-auto">        <div className="mb-2 flex items-center gap-2">
          <input
            className="border border-border rounded px-2 py-1 text-sm bg-background text-foreground"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <table className="min-w-full border-collapse border border-border text-sm">
          <thead className="bg-muted/50">
            <tr>
              {COLUMN_HEADERS.map(col => (
                <th
                  key={col.key}
                  className="border border-border px-2 py-1 cursor-pointer select-none font-medium text-foreground hover:bg-muted/80 transition-colors"
                  onClick={() => {
                    if (sortKey === col.key) setSortAsc(a => !a);
                    else { setSortKey(col.key); setSortAsc(true); }
                  }}
                >
                  {col.label} {sortKey === col.key ? (sortAsc ? "▲" : "▼") : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30 transition-colors">
                {COLUMN_HEADERS.map(col => (
                  <td key={col.key} className="border border-border px-2 py-1 text-foreground">{row[col.key] || ""}</td>
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
