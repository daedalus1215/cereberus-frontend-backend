import type { ColumnDef, Row } from "@tanstack/react-table";
import { Eye, List, MoreVertical, Pencil, Trash } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./columns.module.css";

export type PasswordEntry = {
  id: string;
  name: string;
  username: string;
  password: string;
  tags: {id: number, name: string}[];
};

export const columns: ColumnDef<PasswordEntry>[] = [
  {
    accessorKey: "name",
    header: "acct",
    cell: ({ row }: { row: Row<PasswordEntry> }) => row.getValue("name"),
  },
  {
    accessorKey: "username",
    header: "user",
    cell: ({ row }: { row: Row<PasswordEntry> }) => row.getValue("username"),
  },
  {
    accessorKey: "password",
    header: "pass",
    cell: ({ row }: { row: Row<PasswordEntry> }) => {
      // We'll handle reveal logic in the table row state
      const revealed = row.getIsSelected();
      return (
        <div style={{ display: "flex", alignItems: "left", gap: 8 }}>
          <span style={{ filter: revealed ? "none" : "blur(6px)", fontFamily: "monospace" }}>
            {row.getValue("password")}
          </span>
        </div>
      );
    },
  },
  {
    accessorKey: "tags",
    header: "tags",
    cell: ({ row }: { row: Row<PasswordEntry> }) => {
      const tags = row.getValue("tags") as { id: number, name: string }[];
      return (
        <div style={{ display: "flex", gap: 4 }}>
          {tags?.map((tag) => (
            <span key={tag.id} className="px-2 py-0.5 bg-muted rounded text-xs">
              {tag.name}
            </span>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }: { row: Row<PasswordEntry> }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={cn(styles.dropDownMenuContent)}>

            <DropdownMenuItem className={styles.dropdownMenuContent} onClick={() => {/* TODO: handle versions */}}>
              <List /> <span  className={styles.dropdownMenuItemText}>Versions of password</span>
            </DropdownMenuItem>

            <DropdownMenuItem className={styles.dropdownMenuContent}  onClick={() => row.toggleSelected() }>
              <Eye /> <span className={styles.dropdownMenuItemText}>Display password</span>
            </DropdownMenuItem>

            <DropdownMenuItem className={styles.dropdownMenuContent} onClick={() => row.toggleExpanded?.() }>
              <Pencil /> <span className={styles.dropdownMenuItemText}>Edit password</span>
            </DropdownMenuItem>

            <DropdownMenuItem className={styles.dropdownMenuContent} onClick={() => {/* TODO: handle delete */}}>
              <Trash /> <span className={styles.dropdownMenuItemText}>Delete password</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
];
// If you see a type error for @tanstack/react-table, make sure to install it: pnpm add @tanstack/react-table
