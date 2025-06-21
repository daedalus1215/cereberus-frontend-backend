import { PasswordTable } from "./components/PasswordTable/PasswordTable";
import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Modal from "@mui/material/Modal";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import Container from "@mui/material/Container";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import type { PasswordEntry } from "./components/PasswordTable/PasswordTable";

const MOCK_TAGS = [
  { id: 1, name: "work" },
  { id: 2, name: "personal" },
  { id: 3, name: "finance" },
];

export function HomePage() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingPassword, setEditingPassword] = useState<PasswordEntry | null>(
    null
  );
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    notes: "",
    tagIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenCreateModal = () => {
    setEditingPassword(null);
    setForm({ name: "", username: "", password: "", url: "", notes: "", tagIds: [] });
    setShowModal(true);
  };

  const handleOpenEditModal = (password: PasswordEntry) => {
    setEditingPassword(password);
    setForm({
      name: password.name,
      username: password.username,
      password: "", // Should we prefill password? For security, maybe not.
      url: password.url,
      notes: password.notes || "",
      tagIds: password.tags.map((t) => t.id),
    });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPassword(null);
    setError(null);
    setForm({ name: "", username: "", password: "", url: "", notes: "", tagIds: [] });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleTagToggle = (id: number) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(id)
        ? prev.tagIds.filter((tid) => tid !== id)
        : [...prev.tagIds, id],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    console.log("form", form);
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const submissionForm = { ...form };
    if (editingPassword && !submissionForm.password) {
      delete (submissionForm as Partial<typeof submissionForm>).password;
    }

    try {
      if (editingPassword) {
        await api.put(`passwords/${editingPassword.id}`, submissionForm);
      } else {
        await api.post("passwords", form);
      }
      queryClient.invalidateQueries({ queryKey: ["passwords"] });
      handleCloseModal();
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(
          axiosErr.response?.data?.message ||
            `Failed to ${editingPassword ? "update" : "create"} password`
        );
      } else {
        setError(`Failed to ${editingPassword ? "update" : "create"} password`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Responsive modal styles
  const getModalStyle = () => ({
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "90vw" : 400,
    maxWidth: isMobile ? "none" : 400,
    maxHeight: isMobile ? "90vh" : "80vh",
    bgcolor: "background.paper",
    border: "2px solid #000",
    boxShadow: 24,
    p: isMobile ? 2 : 4,
    overflow: "auto",
  });

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
      
      {/* Modal with Form */}
      <Modal
        open={showModal}
        onClose={handleCloseModal}
        aria-labelledby="create-password-modal-title"
      >
        <Box sx={getModalStyle()}>
          <IconButton
            aria-label="close"
            onClick={handleCloseModal}
            sx={{
              position: "absolute",
              right: 8,
              top: 8,
              color: (theme) => theme.palette.grey[500],
            }}
            disabled={submitting}
          >
            <CloseIcon />
          </IconButton>
          <form
            onSubmit={handleSubmit}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: isMobile ? 12 : 16,
              marginTop: 16,
            }}
          >
            <Typography
              id="create-password-modal-title"
              variant={isMobile ? "h6" : "h5"}
              component="h2"
              sx={{ 
                textAlign: "center", 
                mb: isMobile ? 1 : 2,
                fontSize: isMobile ? "1.1rem" : "inherit"
              }}
            >
              {editingPassword ? "Edit Password" : "Create New Password"}
            </Typography>
            
            <TextField
              name="name"
              label="App/Site/Device Name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            
            <TextField
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            
            <TextField
              name="url"
              label="URL"
              value={form.url}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required={!editingPassword}
              disabled={submitting}
              fullWidth
              size={isMobile ? "small" : "medium"}
            />
            
            <TextField
              name="notes"
              label="Notes"
              value={form.notes}
              onChange={handleChange}
              disabled={submitting}
              fullWidth
              multiline
              rows={isMobile ? 2 : 3}
              size={isMobile ? "small" : "medium"}
              placeholder="Optional notes about this password..."
            />
            
            <div>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Tags:
              </Typography>
              <div style={{ 
                display: "flex", 
                gap: isMobile ? 4 : 8, 
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row"
              }}>
                {MOCK_TAGS.map((tag) => (
                  <FormControlLabel
                    key={tag.id}
                    control={
                      <Checkbox
                        checked={form.tagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        disabled={submitting}
                        size={isMobile ? "small" : "medium"}
                      />
                    }
                    label={tag.name}
                    sx={{ 
                      fontSize: isMobile ? "0.875rem" : "inherit",
                      margin: isMobile ? "2px 0" : "inherit"
                    }}
                  />
                ))}
              </div>
            </div>

            {error && (
              <Typography color="error" sx={{ textAlign: "center", fontSize: isMobile ? "0.875rem" : "inherit" }}>
                {error}
              </Typography>
            )}
            
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ 
                mt: 1,
                py: isMobile ? 1.5 : 1,
                fontSize: isMobile ? "0.875rem" : "inherit"
              }}
            >
              {submitting
                ? `${editingPassword ? "Updating" : "Creating"}...`
                : `${editingPassword ? "Update" : "Create"} Password`}
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
}
