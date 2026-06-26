import type { ReactNode } from "react";

export interface TableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
}

interface TableProps<T> {
  columns: TableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  emptyMessage?: string;
}

export function Table<T>({
  columns,
  emptyMessage = "No rows to display.",
  getRowKey,
  rows
}: TableProps<T>) {
  return (
    <div className="overflow-hidden rounded-lg border border-surface-600">
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-surface-700 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3 font-semibold" key={column.key}>
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-600 bg-surface-800">
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-400" colSpan={columns.length}>
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr className="text-slate-200" key={getRowKey(row)}>
                {columns.map((column) => (
                  <td className="px-4 py-3" key={column.key}>
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

