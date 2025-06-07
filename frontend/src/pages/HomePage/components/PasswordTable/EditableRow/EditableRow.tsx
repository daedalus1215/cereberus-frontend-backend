import { TableCell } from "@/components/ui/table";

import { Row } from "@tanstack/react-table";
import { PasswordEntry } from "../columns/columns";
import { useState } from "react";
import { TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

export const EditableRow: React.FC<{
    row: Row<PasswordEntry>;
    onSave: (data: PasswordEntry) => void;
    onCancel: () => void;
  }> = ({ row, onSave, onCancel }) => {
    const [edit, setEdit] = useState<PasswordEntry>({ ...row.original });
    return (
      <TableRow>
        <TableCell>
          <input
            className="w-full border rounded px-2 py-1"
            value={edit.name}
            onChange={e => setEdit({ ...edit, name: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            className="w-full border rounded px-2 py-1"
            value={edit.username}
            onChange={e => setEdit({ ...edit, username: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            className="w-full border rounded px-2 py-1 font-mono"
            value={edit.password}
            onChange={e => setEdit({ ...edit, password: e.target.value })}
          />
        </TableCell>
        <TableCell>
          <input
            className="w-full border rounded px-2 py-1"
            value={edit.tags.map(tag => tag.name).join(", ")}
            // onChange={e => setEdit({ ...edit, tags: {value.target.value.split(/,\s*/)} })}
          />
        </TableCell>
        <TableCell>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => onSave(edit)}>
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };