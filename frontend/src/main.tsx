import * as React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App.tsx";
import { AuthProvider } from "./auth/AuthContext.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const queryClient = new QueryClient();
const theme = createTheme();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>,
);
