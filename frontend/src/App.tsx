import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { useAuth } from "./auth/useAuth";
import { LandingPage } from "./pages/LandingPage/LandingPage";
import { LoginPage } from "./pages/LoginPage/LoginPage";
import { RegisterPage } from "./pages/RegisterPage/RegisterPage";
import { HomePage } from "./pages/HomePage/HomePage";
import { Header } from "./components/Header/Header";

const ROUTES = {
  LANDING_PAGE: "landing-page",
  LOGIN_PAGE: "login-page",
  REGISTER_PAGE: "register-page",
};
function AppRoutes() {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return (
      <>
        <Routes>
          <Route path="/" element={<HomePage />} />
          {/* Redirect authenticated users trying to access auth pages */}
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} id={ROUTES.LOGIN_PAGE} />
      <Route
        path="/register"
        element={<RegisterPage />}
        id={ROUTES.REGISTER_PAGE}
      />
      <Route path="/" element={<LandingPage />} id={ROUTES.LANDING_PAGE} />
      {/* Redirect unauthenticated users trying to access protected pages */}
      {/* <Route path="*" element={<Navigate to="/login" replace />} /> */}
    </Routes>
  );
}

export function App() {
  return (
    <AuthProvider>
      <Router>
        <Header />
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}
