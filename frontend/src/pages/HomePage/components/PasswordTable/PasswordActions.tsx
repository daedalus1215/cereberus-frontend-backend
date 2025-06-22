import React from "react";
import { Menu, MenuItem, Snackbar, Alert } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";

type PasswordActionsProps = {
  anchorEl: HTMLElement | null;
  onMenuClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  copySnackbar: boolean;
  onCloseSnackbar: () => void;
};

export const PasswordActions: React.FC<PasswordActionsProps> = ({
  anchorEl,
  onMenuClose,
  onEdit,
  onDelete,
  copySnackbar,
  onCloseSnackbar,
}) => {
  return (
    <>
      <Menu
        id="long-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={onMenuClose}
      >
        <MenuItem onClick={onEdit}>
          <Edit sx={{ mr: 1 }} /> Edit
        </MenuItem>
        <MenuItem onClick={onDelete}>
          <Delete sx={{ mr: 1 }} /> Delete
        </MenuItem>
      </Menu>
      
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={onCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={onCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          Password copied to clipboard!
        </Alert>
      </Snackbar>
    </>
  );
}; 