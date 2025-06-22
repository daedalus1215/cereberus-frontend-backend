import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import { Visibility, VisibilityOff, ContentCopy } from "@mui/icons-material";
import type { PasswordEntry, Column } from "./types";

type PasswordCellProps = {
  row: PasswordEntry;
  column: Column;
  revealedId: string | null;
  onRevealToggle: (id: string) => void;
  onCopyPassword: (password: string) => void;
};

export const PasswordCell: React.FC<PasswordCellProps> = ({
  row,
  column,
  revealedId,
  onRevealToggle,
  onCopyPassword,
}) => {
  if (column.id === 'actions') {
    return null; // Actions cell is handled separately
  }
  
  const accessorKey = column.accessorKey;

  if (accessorKey === 'password') {
    const isRevealed = revealedId === row.id;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{ 
            filter: isRevealed ? 'none' : 'blur(6px)', 
            cursor: 'pointer',
            flex: 1
          }}
          onClick={() => onRevealToggle(row.id)}
        >
          {row.password}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          <Tooltip title={isRevealed ? "Hide password" : "Show password"}>
            <IconButton
              size="small"
              onClick={() => onRevealToggle(row.id)}
            >
              {isRevealed ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy password">
            <IconButton
              size="small"
              onClick={() => onCopyPassword(row.password)}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
      </div>
    );
  }
  
  if (accessorKey === 'tags') {
    return row.tags.map(tag => tag.name).join(', ');
  }

  if (accessorKey) {
    return row[accessorKey as keyof PasswordEntry] as React.ReactNode;
  }

  return null;
}; 