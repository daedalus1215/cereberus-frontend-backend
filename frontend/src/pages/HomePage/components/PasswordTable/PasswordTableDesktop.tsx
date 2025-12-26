import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import { MoreVert } from "@mui/icons-material";
import { PasswordCell } from "./PasswordCell";
import type { PasswordEntryResponse, Column } from "./types";
import styles from "./PasswordTable.module.css";

type PasswordTableDesktopProps = {
  data: PasswordEntryResponse[];
  columns: Column[];
  revealedId: string | null;
  isLoadingPassword?: boolean;
  onRevealToggle: (id: string) => void;
  onCopyPassword: (password: string) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, id: string) => void;
  onRowClick?: (id: string) => void;
};

export const PasswordTableDesktop: React.FC<PasswordTableDesktopProps> = ({
  data,
  columns,
  revealedId,
  isLoadingPassword = false,
  onRevealToggle,
  onCopyPassword,
  onMenuClick,
  onRowClick,
}) => {
  const handleRowClick = (id: string, event: React.MouseEvent) => {
    const target = event.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.closest(".MuiIconButton-root") ||
      target.closest(".MuiButton-root")
    ) {
      return;
    }
    onRowClick?.(id);
  };
  return (
    <TableContainer component={Paper}>
      <Table aria-label="passwords table">
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell key={column.accessorKey || column.id}>
                {column.header}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {data.length > 0 ? (
            data.map((row, index) => (
              <TableRow
                key={row.id}
                className={styles.fadeIn}
                style={{
                  animationDelay: `${index * 50}ms`,
                }}
                onClick={(e) => handleRowClick(row.id, e)}
                sx={{
                  cursor: onRowClick ? "pointer" : "default",
                  "&:hover": onRowClick
                    ? {
                        backgroundColor: "action.hover",
                      }
                    : {},
                }}
              >
                {columns.map((column) => (
                  <TableCell key={column.accessorKey || column.id}>
                    {column.id === "actions" ? (
                      <IconButton
                        aria-label="more"
                        aria-controls="long-menu"
                        aria-haspopup="true"
                        onClick={(e) => onMenuClick(e, row.id)}
                      >
                        <MoreVert />
                      </IconButton>
                    ) : (
                      <PasswordCell
                        row={row}
                        column={column}
                        revealedId={revealedId}
                        isLoadingPassword={
                          isLoadingPassword && revealedId === row.id
                        }
                        onRevealToggle={onRevealToggle}
                        onCopyPassword={onCopyPassword}
                      />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} align="center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};
