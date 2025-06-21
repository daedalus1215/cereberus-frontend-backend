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
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";

const MOCK_TAGS = [
  { id: 1, name: "work" },
  { id: 2, name: "personal" },
  { id: 3, name: "finance" },
];

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  border: "2px solid #000",
  boxShadow: 24,
  p: 4,
};

export function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
    url: "",
    tagIds: [] as number[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
    try {
      await api.post("passwords", form);
      setShowModal(false);
      setForm({ name: "", username: "", password: "", url: "", tagIds: [] });
      // TODO: trigger table refresh
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(
          axiosErr.response?.data?.message || "Failed to create password"
        );
      } else {
        setError("Failed to create password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Container component="main" maxWidth="lg" sx={{ py: 3, flexGrow: 1 }}>
        <PasswordTable />
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
        onClick={() => setShowModal(true)}
      >
        <Plus size={28} />
      </Fab>
      {/* Modal with Form */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        aria-labelledby="create-password-modal-title"
      >
        <Box sx={modalStyle}>
          <IconButton
            aria-label="close"
            onClick={() => setShowModal(false)}
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
              gap: 16,
              marginTop: 16,
            }}
          >
            <Typography
              id="create-password-modal-title"
              variant="h6"
              component="h2"
              sx={{ textAlign: "center", mb: 2 }}
            >
              Create New Password
            </Typography>
            <TextField
              name="name"
              label="App/Site/Device Name"
              value={form.name}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
            />
            <TextField
              name="username"
              label="Username"
              value={form.username}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
            />
            <TextField
              name="url"
              label="URL"
              value={form.url}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
            />
            <TextField
              name="password"
              label="Password"
              type="password"
              value={form.password}
              onChange={handleChange}
              required
              disabled={submitting}
              fullWidth
            />
            <div>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Tags:
              </Typography>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {MOCK_TAGS.map((tag) => (
                  <FormControlLabel
                    key={tag.id}
                    control={
                      <Checkbox
                        checked={form.tagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        disabled={submitting}
                      />
                    }
                    label={tag.name}
                  />
                ))}
              </div>
            </div>

            {error && (
              <Typography color="error" sx={{ textAlign: "center" }}>
                {error}
              </Typography>
            )}
            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{ mt: 1 }}
            >
              {submitting ? "Creating..." : "Create Password"}
            </Button>
          </form>
        </Box>
      </Modal>
    </Box>
  );
}
