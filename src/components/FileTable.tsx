import React from "react";

type FileTableProps = {
  data: string[][];
};

const FileTable: React.FC<FileTableProps> = ({ data }) => (
  <div className="overflow-x-auto">
    <table className="min-w-full border">
      <tbody>
        {data.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="border px-2 py-1">{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export default FileTable;
