import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircularProgress, Typography, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import api from "@/api/axios.interceptor";
import { PasswordCard } from "./PasswordCard";
import { PasswordTableDesktop } from "./PasswordTableDesktop";
import { PasswordActions } from "./PasswordActions";
import type { PasswordEntry, PasswordTableProps, Column } from "./types";

const columns: Column[] = [
  { accessorKey: "name", header: "Account" },
  { accessorKey: "username", header: "Username" },
  { accessorKey: "password", header: "Password" },
  { id: "actions", header: "Actions" },
];

const fetchPasswords = async (): Promise<PasswordEntry[]> => {
  const res = await api.get("passwords");
  return res.data;
};

export const PasswordTable: React.FC<PasswordTableProps> = ({ onEdit }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { data = [], isLoading, error } = useQuery<PasswordEntry[]>({
    queryKey: ["passwords"],
    queryFn: fetchPasswords,
  });

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
      const passwordToEdit = data.find((p) => p.id === selectedRowId);
      if (passwordToEdit) {
        onEdit(passwordToEdit);
      }
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

  const handleRevealToggle = (id: string) => {
    setRevealedId(revealedId === id ? null : id);
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

  return (
    <>
      {isMobile ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.length > 0 ? (
            data.map((password) => (
              <PasswordCard
                key={password.id}
                password={password}
                revealedId={revealedId}
                onRevealToggle={handleRevealToggle}
                onCopyPassword={handleCopyPassword}
                onMenuClick={handleMenuClick}
              />
            ))
          ) : (
            <Typography align="center" sx={{ py: 4 }}>
              No passwords found.
            </Typography>
          )}
        </Box>
      ) : (
        <PasswordTableDesktop
          data={data}
          columns={columns}
          revealedId={revealedId}
          onRevealToggle={handleRevealToggle}
          onCopyPassword={handleCopyPassword}
          onMenuClick={handleMenuClick}
        />
      )}
      
      <PasswordActions
        anchorEl={anchorEl}
        onMenuClose={handleMenuClose}
        onEdit={handleEdit}
        onDelete={handleDelete}
        copySnackbar={copySnackbar}
        onCloseSnackbar={handleCloseSnackbar}
      />
    </>
  );
};