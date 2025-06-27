import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircularProgress, Typography, Box } from "@mui/material";
import { fetchPasswords, fetchPassword } from "@/api/passwords";
import { PasswordCard } from "./PasswordCard";
import { PasswordTableDesktop } from "./PasswordTableDesktop";
import { PasswordActions } from "./PasswordActions";
import type { PasswordEntry, PasswordTableProps, Column } from "./types";
import { useIsMobile } from "@/hooks/useIsMobile";

const columns: Column[] = [
  { accessorKey: "name", header: "Account" },
  { accessorKey: "username", header: "Username" },
  { accessorKey: "password", header: "Password" },
  { id: "actions", header: "Actions" },
];

export const PasswordTable: React.FC<PasswordTableProps> = ({ onEdit }) => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  
  const { data = [], isLoading, error } = useQuery<PasswordEntry[]>({
    queryKey: ["passwords"],
    queryFn: fetchPasswords,
  });

  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<null | string>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);

  // Query for fetching individual password when revealed
  const { data: revealedPassword, isLoading: isLoadingPassword } = useQuery<PasswordEntry>({
    queryKey: ["password", revealedId],
    queryFn: () => fetchPassword(revealedId!),
    enabled: !!revealedId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

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
    if (revealedId === id) {
      // Hide password
      setRevealedId(null);
      // Remove the individual password from cache
      queryClient.removeQueries({ queryKey: ["password", id] });
    } else {
      // Show password - this will trigger the query
      setRevealedId(id);
    }
  };

  // Create a merged data array with revealed passwords
  const mergedData = data.map(password => {
    if (password.id === revealedId && revealedPassword) {
      return {
        ...password,
        password: revealedPassword.password, // Use the actual password from the API
      };
    }
    return password;
  });

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
          {mergedData.length > 0 ? (
            mergedData.map((password) => (
              <PasswordCard
                key={password.id}
                password={password}
                revealedId={revealedId}
                isLoadingPassword={isLoadingPassword && revealedId === password.id}
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
          data={mergedData}
          columns={columns}
          revealedId={revealedId}
          isLoadingPassword={isLoadingPassword}
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