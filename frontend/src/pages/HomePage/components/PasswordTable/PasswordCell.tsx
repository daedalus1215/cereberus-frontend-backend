import React from "react";
import {
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Visibility, VisibilityOff, ContentCopy } from "@mui/icons-material";
import type { PasswordEntryResponse, Column } from "./types";

type PasswordCellProps = {
  row: PasswordEntryResponse;
  column: Column;
  revealedId: string | null;
  isLoadingPassword?: boolean;
  onRevealToggle: (id: string) => void;
  onCopyPassword: (password: string) => void;
};

export const PasswordCell: React.FC<PasswordCellProps> = ({
  row,
  column,
  revealedId,
  isLoadingPassword = false,
  onRevealToggle,
  onCopyPassword,
}) => {
  if (column.id === "actions") {
    return null; // Actions cell is handled separately
  }

  const accessorKey = column.accessorKey;

  if (accessorKey === "password") {
    const isRevealed = revealedId === row.id;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>
          <Tooltip title={isRevealed ? "Hide password" : "Show password"}>
            <IconButton
              size="small"
              onClick={() => onRevealToggle(row.id)}
              disabled={isLoadingPassword}
            >
              {isRevealed ? (
                <VisibilityOff fontSize="small" />
              ) : (
                <Visibility fontSize="small" />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip title="Copy password">
            <IconButton
              size="small"
              onClick={() => onCopyPassword(row.password)}
              disabled={isLoadingPassword}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>
        {isLoadingPassword ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography variant="body2" color="text.secondary">
              Loading...
            </Typography>
          </Box>
        ) : (
          <span
            style={{
              filter: isRevealed ? "none" : "blur(6px)",
              cursor: "pointer",
              flex: 1,
            }}
            onClick={() => onRevealToggle(row.id)}
          >
            {row.password}
          </span>
        )}
      </div>
    );
  }

  if (accessorKey === "tags") {
    return row.tags.map((tag) => tag.name).join(", ");
  }

  if (accessorKey) {
    return row[accessorKey as keyof PasswordEntryResponse] as React.ReactNode;
  }

  return null;
};
