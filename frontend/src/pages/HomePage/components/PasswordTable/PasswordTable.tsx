import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircularProgress, Typography, Box, Fade } from "@mui/material";
import { fetchPasswords } from "@/api/passwords";
import { PasswordCard } from "./PasswordCard";
import { PasswordTableDesktop } from "./PasswordTableDesktop";
import { PasswordActions } from "./PasswordActions";
import type {
  PasswordEntryResponse,
  PasswordTableProps,
  Column,
} from "./types";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useFetchPassword } from "../../hooks/useFetchPassword";
import { EditPasswordModal } from "./EditPasswordModal";

const columns: Column[] = [
  { accessorKey: "name", header: "Account" },
  { accessorKey: "username", header: "Username" },
  { accessorKey: "password", header: "Password" },
  { id: "actions", header: "Actions" },
];

export const PasswordTable: React.FC<PasswordTableProps> = () => {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const {
    data = [],
    isLoading,
    error,
  } = useQuery<PasswordEntryResponse[]>({
    queryKey: ["passwords"],
    queryFn: fetchPasswords,
  });

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedRowId, setSelectedRowId] = useState<null | string>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  const { revealedPassword, isLoadingPassword, setRevealedId, revealedId } =
    useFetchPassword(selectedRowId);

  const handleMenuClick = (
    event: React.MouseEvent<HTMLElement>,
    id: string,
  ) => {
    setAnchorEl(event.currentTarget);
    setSelectedRowId(id);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedRowId(null);
  };

  const handleEdit = () => {
    if (selectedRowId) {
      setEditId(selectedRowId);
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
      console.error("Failed to copy password to clipboard");
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
  const mergedData = data.map((password) => {
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
      <div
        style={{ display: "flex", justifyContent: "center", padding: "2rem" }}
      >
        <CircularProgress />
      </div>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center" style={{ padding: "2rem" }}>
        Error loading passwords
      </Typography>
    );
  }

  return (
    <>
      {isMobile ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {mergedData.length > 0 ? (
            mergedData.map((password, index) => (
              <Fade
                key={password.id}
                in={true}
                timeout={400}
                style={{
                  transitionDelay: `${index * 50}ms`,
                }}
              >
                <Box>
                  <PasswordCard
                    password={password}
                    revealedId={revealedId}
                    isLoadingPassword={
                      isLoadingPassword && revealedId === password.id
                    }
                    onRevealToggle={handleRevealToggle}
                    onCopyPassword={handleCopyPassword}
                    onMenuClick={handleMenuClick}
                  />
                </Box>
              </Fade>
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
      <EditPasswordModal
        open={!!editId}
        passwordId={editId}
        onClose={() => setEditId(null)}
      />
    </>
  );
};
