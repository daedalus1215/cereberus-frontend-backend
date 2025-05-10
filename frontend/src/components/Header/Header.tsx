import { useAuth } from "@/auth/useAuth";
import { Button } from "@/components/ui/button";
import type { FC } from "react";

const headerStyle: React.CSSProperties = {
  width: "100%",
  padding: "1rem 2rem",
  background: "#f5f5f5",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  borderBottom: "1px solid #e0e0e0",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
};

export const Header: FC = () => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header style={headerStyle}>
      <h1 style={titleStyle}>Cereberus</h1>
      {isAuthenticated && (
        <Button onClick={logout} variant="outline">
          Logout
        </Button>
      )}
    </header>
  );
}; 