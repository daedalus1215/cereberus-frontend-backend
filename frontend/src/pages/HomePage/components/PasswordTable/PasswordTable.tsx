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
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Chip,
  Box,
} from "@mui/material";
import { MoreVert, Edit, Delete, ContentCopy, Visibility, VisibilityOff, Link as LinkIcon } from "@mui/icons-material";

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
  { id: "actions", header: "Actions" },
];

const fetchPasswords = async (): Promise<PasswordEntry[]> => {
  const res = await api.get("passwords");
  return res.data;
};

export const PasswordTable: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.length > 0 ? (
            data.map((row) => (
              <Card key={row.id} sx={{ width: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography variant="h6" component="h3">
                      {row.name}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuClick(e, row.id)}
                    >
                      <MoreVert />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        Username:
                      </Typography>
                      <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
                        {row.username}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                        Password:
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1 }}>
                        <span
                          style={{ 
                            filter: revealedId === row.id ? 'none' : 'blur(6px)', 
                            cursor: 'pointer',
                            flex: 1
                          }}
                          onClick={() => setRevealedId(revealedId === row.id ? null : row.id)}
                        >
                          {row.password}
                        </span>
                        <Tooltip title={revealedId === row.id ? "Hide password" : "Show password"}>
                          <IconButton size="small" onClick={() => setRevealedId(revealedId === row.id ? null : row.id)}>
                            {revealedId === row.id ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Copy password">
                          <IconButton size="small" onClick={() => handleCopyPassword(row.password)}>
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                    
                    {row.url && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkIcon fontSize="small" color="action" />
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            wordBreak: 'break-all',
                            color: 'primary.main',
                            textDecoration: 'underline',
                            cursor: 'pointer'
                          }}
                          onClick={() => window.open(row.url, '_blank')}
                        >
                          {row.url}
                        </Typography>
                      </Box>
                    )}
                    
                    {row.tags.length > 0 && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                        {row.tags.map(tag => (
                          <Chip key={tag.id} label={tag.name} size="small" variant="outlined" />
                        ))}
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            ))
          ) : (
            <Typography align="center" sx={{ py: 4 }}>
              No passwords found.
            </Typography>
          )}
        </Box>
        
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
  }

  // Desktop table view (existing code)
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

// Add responsive column visibility
const getVisibleColumns = (isMobile: boolean) => {
  if (isMobile) {
    return [
      { accessorKey: "name", header: "Account" },
      { accessorKey: "password", header: "Password" },
      { id: "actions", header: "Actions" },
    ];
  }
  return columns;
};
