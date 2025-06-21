import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/api/axios.interceptor";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Typography,
  IconButton,
  Menu,
  MenuItem,       
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import { MoreVert, Edit, Delete, ContentCopy, Visibility, VisibilityOff } from "@mui/icons-material";

// This would typically be in a separate types file
export type PasswordEntry = {
  id: string;
  name: string;
  username: string;
  password: string;
  url: string;
  tags: { id: number; name: string }[];
};

const columns = [
  { accessorKey: "name", header: "Account" },
  { accessorKey: "username", header: "Username" },
  { accessorKey: "password", header: "Password" },
  { accessorKey: "url", header: "URL" },
  { accessorKey: "tags", header: "Tags" },
  { id: "actions", header: "Actions" },
];

const fetchPasswords = async (): Promise<PasswordEntry[]> => {
  const res = await api.get("passwords");
  return res.data;
};

export const PasswordTable: React.FC = () => {
  const { data = [], isLoading, error } = useQuery<PasswordEntry[]>({
    queryKey: ["passwords"],
    queryFn: fetchPasswords,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<null | string>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, id: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  const handleEdit = () => {
    if (selectedRowId) {
      setEditingId(selectedRowId);
    }
    handleMenuClose();
  };

  const handleDelete = () => {
    // TODO: Implement delete functionality
    handleMenuClose();
  };

  const handleCloseSnackbar = () => {
    setCopySnackbar(false);
  };

  const handleCopyPassword = async (password: string) => {
    try {
      await navigator.clipboard.writeText(password);
      setCopySnackbar(true);
    } catch (err) {
      console.error('Failed to copy password:', err);
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center" style={{ padding: '2rem' }}>
        Error loading passwords
      </Typography>
    );
  }

  const renderCellContent = (row: PasswordEntry, column: typeof columns[0]) => {
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
            onClick={() => setRevealedId(isRevealed ? null : row.id)}
          >
            {row.password}
          </span>
          <div style={{ display: 'flex', gap: 4 }}>
            <Tooltip title={isRevealed ? "Hide password" : "Show password"}>
              <IconButton
                size="small"
                onClick={() => setRevealedId(isRevealed ? null : row.id)}
              >
                {isRevealed ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy password">
              <IconButton
                size="small"
                onClick={() => handleCopyPassword(row.password)}
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

    if(accessorKey) {
        return row[accessorKey as keyof PasswordEntry] as React.ReactNode;
    }

    return null;
  };

  return (
    <>
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
              data.map((row) =>
                editingId === row.id ? (
                  <TableRow key={row.id}>
                    <TableCell colSpan={columns.length}>
                      <input
                        type="text"
                        defaultValue={row.name}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      />
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow key={row.id}>
                    {columns.map((column) => (
                      <TableCell key={column.accessorKey || column.id}>
                        {column.id === 'actions' ? (
                          <>
                            <IconButton
                              aria-label="more"
                              aria-controls="long-menu"
                              aria-haspopup="true"
                              onClick={(e) => handleMenuClick(e, row.id)}
                            >
                              <MoreVert />
                            </IconButton>
                          </>
                        ) : (
                          renderCellContent(row, column)
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                )
              )
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} align="center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <Menu
          id="long-menu"
          anchorEl={anchorEl}
          keepMounted
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={handleDelete}>
            <Delete sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>
      </TableContainer>
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Password copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
};
