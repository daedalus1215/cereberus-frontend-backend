import { PasswordTable } from "./components/PasswordTable/PasswordTable";
import { useState } from "react";
import { Plus } from "lucide-react";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import type { PasswordEntryResponse } from "./components/PasswordTable/types";
import { EditPasswordModal } from "./components/PasswordTable/EditPasswordModal";

export function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [editingPassword, setEditingPassword] =
    useState<PasswordEntryResponse | null>(null);

  const handleOpenCreateModal = () => {
    setEditingPassword(null);
    setShowModal(true);
  };

  const handleOpenEditModal = (password: PasswordEntryResponse) => {
    setEditingPassword(password);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPassword(null);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Container component="main" maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
        <PasswordTable onEdit={handleOpenEditModal} />
      </Container>

      <Fab
        color="primary"
        aria-label="Add new password"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          zIndex: 1000,
        }}
        onClick={handleOpenCreateModal}
      >
        <Plus size={28} />
      </Fab>

      <EditPasswordModal
        open={showModal}
        passwordId={editingPassword?.id || null}
        onClose={handleCloseModal}
        onEdit={handleCloseModal}
      />
    </Box>
  );
}
