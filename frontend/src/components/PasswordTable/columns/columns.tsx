import type { ColumnDef, Row } from "@tanstack/react-table";
import { Eye, MoreVertical, Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./columns.module.css";

export type PasswordEntry = {
  id: string;
  name: string;
  username: string;
  password: string;
  tags: string[];
};

export const columns: ColumnDef<PasswordEntry>[] = [
  {
    accessorKey: "name",
    header: "App/Site/Device",
    cell: ({ row }: { row: Row<PasswordEntry> }) => row.getValue("name"),
  },
  {
    accessorKey: "username",
    header: "Username",
    cell: ({ row }: { row: Row<PasswordEntry> }) => row.getValue("username"),
  },
  {
    accessorKey: "password",
    header: "Password",
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
    header: "Tags",
    cell: ({ row }: { row: Row<PasswordEntry> }) => {
      const tags = row.getValue("tags") as string[];
      return (
        <div style={{ display: "flex", gap: 4 }}>
          {tags.map((tag) => (
            <span key={tag} className="px-2 py-0.5 bg-muted rounded text-xs">
              {tag}
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
          <DropdownMenuContent align="end" className={cn(styles.contextDropDown)}>
            <DropdownMenuItem onClick={() => {/* TODO: handle versions */}}>
              Versions of password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => row.toggleSelected() }>
              <Eye className="w-4 h-4 mr-2" /> Display password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => row.toggleEditing?.() }>
              <Pencil className="w-4 h-4 mr-2" /> Edit password
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
