import styles from "./HomePage.module.css";
import { cn } from "@/lib/utils";
import { PasswordTable } from "./components/PasswordTable/PasswordTable";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import api from "@/api/axios.interceptor";
import type { AxiosError } from "axios";

const MOCK_TAGS = [
  { id: 1, name: "work" },
  { id: 2, name: "personal" },
  { id: 3, name: "finance" },
];

export function HomePage() {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    username: "",
    password: "",
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
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("passwords", form);
      setShowModal(false);
      setForm({ name: "", username: "", password: "", tagIds: [] });
      // TODO: trigger table refresh
    } catch (err: unknown) {
      if (err && typeof err === "object" && (err as AxiosError).isAxiosError) {
        const axiosErr = err as AxiosError<{ message?: string }>;
        setError(axiosErr.response?.data?.message || "Failed to create password");
      } else {
        setError("Failed to create password");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={cn(styles.homePage)}>
      <main className={cn(styles.homeMain)}>
        <div className="stretchTable">
          <div style={{ width: "100%" }}>
            <PasswordTable />
          </div>
        </div>
      </main>
      {/* FAB */}
      <Button
        variant="default"
        size="lg"
        style={{
          position: "fixed",
          bottom: 32,
          right: 32,
          borderRadius: "50%",
          width: 56,
          height: 56,
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          zIndex: 1000,
        }}
        onClick={() => setShowModal(true)}
        aria-label="Add new password"
      >
        <Plus size={28} />
      </Button>
      {/* Modal with Form */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 2000,
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: 12,
              padding: 32,
              minWidth: 320,
              boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
              position: "relative",
            }}
          >
            <button
              onClick={() => setShowModal(false)}
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                background: "none",
                border: "none",
                fontSize: 24,
                cursor: "pointer",
              }}
              aria-label="Close modal"
              disabled={submitting}
            >
              ×
            </button>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 16 }}>
              <h2 style={{ marginBottom: 12, textAlign: "center" }}>Create New Password</h2>
              <input
                name="name"
                placeholder="App/Site/Device Name"
                value={form.name}
                onChange={handleChange}
                required
                disabled={submitting}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
              />
              <input
                name="username"
                placeholder="Username"
                value={form.username}
                onChange={handleChange}
                required
                disabled={submitting}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
              />
              <input
                name="password"
                placeholder="Password"
                type="password"
                value={form.password}
                onChange={handleChange}
                required
                disabled={submitting}
                style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
              />
              <div>
                <div style={{ marginBottom: 4 }}>Tags:</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {MOCK_TAGS.map((tag) => (
                    <label key={tag.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <input
                        type="checkbox"
                        checked={form.tagIds.includes(tag.id)}
                        onChange={() => handleTagToggle(tag.id)}
                        disabled={submitting}
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
              </div>
              {error && <div style={{ color: "red", textAlign: "center" }}>{error}</div>}
              <Button type="submit" disabled={submitting} style={{ marginTop: 8 }}>
                {submitting ? "Creating..." : "Create Password"}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
