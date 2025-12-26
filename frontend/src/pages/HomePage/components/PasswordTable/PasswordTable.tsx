import React, { useState } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import {
  CircularProgress,
  Typography,
  Box,
  Fade,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";
import { fetchPasswords, deletePassword } from "@/api/passwords";
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
import { ViewPasswordModal } from "./ViewPasswordModal";

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
  const [viewId, setViewId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [passwordIdToDelete, setPasswordIdToDelete] = useState<string | null>(
    null,
  );
  const [deleteSnackbar, setDeleteSnackbar] = useState<{
    open: boolean;
    success: boolean;
    message: string;
  }>({ open: false, success: false, message: "" });

  const { revealedPassword, isLoadingPassword, setRevealedId, revealedId } =
    useFetchPassword(selectedRowId);

  const deleteMutation = useMutation({
    mutationFn: deletePassword,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      if (passwordIdToDelete) {
        queryClient.removeQueries({ queryKey: ["password", passwordIdToDelete] });
      }
      setDeleteSnackbar({
        open: true,
        success: true,
        message: "Password deleted successfully",
      });
      setPasswordIdToDelete(null);
    },
    onError: () => {
      setDeleteSnackbar({
        open: true,
        success: false,
        message: "Failed to delete password",
      });
    },
  });

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
    const idToDelete = selectedRowId;
    handleMenuClose();
    setPasswordIdToDelete(idToDelete);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (passwordIdToDelete) {
      deleteMutation.mutate(passwordIdToDelete);
    }
    setDeleteConfirmOpen(false);
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmOpen(false);
    setPasswordIdToDelete(null);
  };

  const handleCloseDeleteSnackbar = () => {
    setDeleteSnackbar({ open: false, success: false, message: "" });
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

  const handleRowClick = (id: string) => {
    setViewId(id);
  };

  const handleViewClose = () => {
    setViewId(null);
  };

  const handleViewToEdit = () => {
    if (viewId) {
      setEditId(viewId);
      setViewId(null);
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
                    onCardClick={handleRowClick}
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
          onRowClick={handleRowClick}
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
      <ViewPasswordModal
        open={!!viewId}
        passwordId={viewId}
        onClose={handleViewClose}
        onEdit={handleViewToEdit}
      />
      <EditPasswordModal
        open={!!editId}
        passwordId={editId}
        onClose={() => setEditId(null)}
      />

      <Dialog
        open={deleteConfirmOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">Delete Password</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            Are you sure you want to delete this password? This action cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={deleteSnackbar.open}
        autoHideDuration={3000}
        onClose={handleCloseDeleteSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseDeleteSnackbar}
          severity={deleteSnackbar.success ? "success" : "error"}
          sx={{ width: "100%" }}
        >
          {deleteSnackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};
