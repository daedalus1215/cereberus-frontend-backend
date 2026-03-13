import { useAuth } from "@/auth/useAuth";
import type { FC } from "react";
import Button from "@mui/material/Button";
import IconButton from "@mui/material/IconButton";
import { Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const headerStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 2rem",
  backgroundColor: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "end",
  gap: "0.75rem",
  borderBottom: "1px solid var(--color-border-secondary)",
};

export const Header: FC = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleSettingsClick = () => {
    navigate("/settings");
  };

  return (
    <header style={headerStyle}>
      {isAuthenticated && (
        <>
          <IconButton
            onClick={handleSettingsClick}
            size="small"
            aria-label="Account settings"
            tabIndex={0}
            sx={{ color: "inherit" }}
          >
            <Settings size={20} />
          </IconButton>
          <Button onClick={logout} variant="outlined" size="small">
            Logout
          </Button>
        </>
      )}
    </header>
  );
};
