import { PasswordTable } from "./components/PasswordTable/PasswordTable";
import { useState } from "react";
import { Plus } from "lucide-react";
import Button from "@mui/material/Button";
import Fab from "@mui/material/Fab";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import Container from "@mui/material/Container";
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";
import { useQueryClient } from "@tanstack/react-query";
import type { PasswordEntry } from "./components/PasswordTable/types";
import { Modal } from "@/pages/HomePage/components/Modal";
import { FlexibleTextField } from "@/pages/HomePage/components/FlexibleTextField";
import { useIsMobile } from "@/hooks/useIsMobile";
import { PasswordField } from "./components/PasswordField";

const MOCK_TAGS = [
  { id: 1, name: "work" },
  { id: 2, name: "personal" },
  { id: 3, name: "finance" },
];

export function HomePage() {
  const isMobile = useIsMobile();
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
  const [showPassword, setShowPassword] = useState(false);

  const handleOpenCreateModal = () => {
    setEditingPassword(null);
    setForm({
      name: "",
      username: "",
      password: "",
      url: "",
      notes: "",
      tagIds: [],
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (password: PasswordEntry) => {
    setEditingPassword(password);
    setForm({
      name: password.name,
      username: password.username,
      password: password.password,
      url: password.url,
      notes: password.notes || "",
      tagIds: password.tags.map((t) => t.id),
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPassword(null);
    setError(null);
    setForm({
      name: "",
      username: "",
      password: "",
      url: "",
      notes: "",
      tagIds: [],
    });
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
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
        await api.patch(`passwords/${editingPassword.id}`, submissionForm);
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

      <Modal
        isModalShowing={showModal}
        handleCloseModal={handleCloseModal}
        isClosedButtonDisabled={submitting}
        aria-labelledby="create-password-modal-title"
      >
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
              fontSize: isMobile ? "1.1rem" : "inherit",
            }}
          >
            {editingPassword ? "Edit Password" : "Create New Password"}
          </Typography>

          <FlexibleTextField
            name="name"
            label="App/Site/Device Name"
            value={form.name}
            handleChange={handleChange}
            isDisabled={submitting}
          />

          <FlexibleTextField
            name="username"
            label="Username"
            value={form.username}
            handleChange={handleChange}
            isDisabled={submitting}
          />

          <FlexibleTextField
            name="url"
            label="URL"
            value={form.url}
            handleChange={handleChange}
            isDisabled={submitting}
          />

          <PasswordField
            isPasswordShowing={showPassword}
            setIsPasswordShowing={setShowPassword}
            value={form.password}
            handleChange={handleChange}
            required={false}
            isDisabled={submitting}
            isEditingPassword={!!editingPassword}
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
            <div
              style={{
                display: "flex",
                gap: isMobile ? 4 : 8,
                flexWrap: "wrap",
                flexDirection: isMobile ? "column" : "row",
              }}
            >
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
                    margin: isMobile ? "2px 0" : "inherit",
                  }}
                />
              ))}
            </div>
          </div>

          {error && (
            <Typography
              color="error"
              sx={{
                textAlign: "center",
                fontSize: isMobile ? "0.875rem" : "inherit",
              }}
            >
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
              fontSize: isMobile ? "0.875rem" : "inherit",
            }}
          >
            {submitting
              ? `${editingPassword ? "Updating" : "Creating"}...`
              : `${editingPassword ? "Update" : "Create"} Password`}
          </Button>
        </form>
      </Modal>
    </Box>
  );
}
