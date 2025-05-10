import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useReactTable, getCoreRowModel, flexRender, Row, ColumnDef, CellContext } from "@tanstack/react-table";
import { columns, PasswordEntry } from "./columns/columns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import styles from "./PasswordTable.module.css";
import api from "@/api/axios.interceptor";
import { EditableRow } from "./EditableRow/EditableRow";

const fetchPasswords = async (): Promise<PasswordEntry[]> => {
  const res = await api.get("passwords");
  return res.data;
};

// Custom context for action cell
// Extends the default CellContext with toggleSelected and toggleEditing
// so we can pass these to the action cell

type ActionCellContext = CellContext<PasswordEntry, unknown> & {
  row: Row<PasswordEntry> & {
    toggleSelected: () => void;
    toggleEditing: () => void;
  };
};

export const PasswordTable: React.FC = () => {
  const { data = [], isLoading, error } = useQuery<PasswordEntry[]>({
    queryKey: ["passwords"],
    queryFn: fetchPasswords,
  });

  // Track which row is being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  // Track which row's password is revealed
  const [revealedId, setRevealedId] = useState<string | null>(null);


  const table = useReactTable({
    data,
    columns: columns.map((col: ColumnDef<PasswordEntry>) => {
      // TS: accessorKey is string | undefined
      if ((col as unknown as { accessorKey: string }).accessorKey === "password") {
        return {
          ...col,
          cell: ({ row }: { row: Row<PasswordEntry> }) => {
            const revealed = row.original.id === revealedId;
            return (
              <span style={{ filter: revealed ? "none" : "blur(6px)", fontFamily: "monospace" }}>
                {row.getValue("password")}
              </span>
            );
          },
        };
      }
      if (col.id === "actions") {
        return {
          ...col,
          cell: (ctx: CellContext<PasswordEntry, unknown>) => {
            // Type guard: only call if col.cell is a function
            if (typeof col.cell === "function") {
              const row = ctx.row as Row<PasswordEntry> & {
                toggleSelected: () => void;
                toggleEditing: () => void;
              };
              row.toggleSelected = () => setRevealedId(revealedId === row.original.id ? null : row.original.id);
              row.toggleEditing = () => setEditingId(row.original.id);
              return col.cell({ ...ctx, row } as ActionCellContext);
            }
            return null;
          },
        };
      }
      return col;
    }),
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading passwords</div>;

  return (
    <>
      <div className="context-window-backdrop" />
      <div className="context-window">
        <div className="rounded-md border w-full">
          <Table className={styles.table}>
            <TableHeader>
              {table.getHeaderGroups().map(headerGroup => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map(row =>
                  editingId === row.original.id ? (
                    <EditableRow
                      key={row.id}
                      row={row}
                      onSave={() => {}}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                      {row.getVisibleCells().map(cell => (
                        <TableCell key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  )
                )
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-24">
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
};
