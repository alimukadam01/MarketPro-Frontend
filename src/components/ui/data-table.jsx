import { React, useState } from "react";

function DataTable({ columns, data, selectedRows = [], onRowClick, colsConfig = null }){

  return (
    <div className="space-y-[10px]">
      {/* Table Header */}
      <div className="bg-card rounded-lg border h-[35px] flex items-center px-4">
        <div
          className={`grid grid-cols-${colsConfig? colsConfig : columns.length} gap-4 w-full text-sm font-medium text-muted-foreground`}
        >
            <div key={-1} className="min-w-0">
              S.no
            </div>
          {columns.filter((col)=>col.key !== 'id').map((col) => (
            <div key={col.key} className="min-w-0">
              {col.label}
            </div>
          ))}
        </div>
      </div>

      {/* Table Rows */}
      {data.map((row, idx) => (
        <div
          key={row.id}
          onClick={() => onRowClick && onRowClick(row.id)}
          className={`bg-card rounded-lg h-[35px] flex items-center px-4 cursor-pointer transition-colors hover:bg-muted/20 ${
            selectedRows.includes(row.id)
              ? "border-2 border-[#4285F4]"
              : "border border-border"
          }`}
        >
          <div className={`grid grid-cols-${colsConfig? colsConfig : columns.length } gap-4 w-full text-sm`}>
              <div
                key={`${row.id}-${idx}`}
                className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {idx+1}
              </div>
            {columns.filter((col)=>col.key !== 'id').map((col) => (
              <div
                key={col.key}
                className="font-medium min-w-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent"
              >
                {col.render ? col.render(row[col.key], row) : row[col.key]}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DataTable;
