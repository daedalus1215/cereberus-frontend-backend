import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import type { FC } from "react";

const headerStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 2rem",
  color: "var(--foreground)",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid var(--foreground)",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
};

export const Header: FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>Cerberus</h1>
      {isAuthenticated && (
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      )}
    </header>
  );
}; 