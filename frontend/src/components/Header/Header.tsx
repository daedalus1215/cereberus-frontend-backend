import { useAuth } from "@/auth/useAuth";
import type { FC } from "react";
import Button from "@mui/material/Button";

const headerStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 2rem",
  backgroundColor: "var(--color-bg-primary)",
  color: "var(--color-text-primary)",
  display: "flex",
  alignItems: "center",
  justifyContent: "end",
  borderBottom: "1px solid var(--color-border-secondary)",
};

export const Header: FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header style={headerStyle}>
      {isAuthenticated && (
        <Button onClick={logout} variant="outlined" size="small">
          Logout
        </Button>
      )}
    </header>
  );
};
