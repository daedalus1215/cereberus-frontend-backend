import React from "react";
import {
  Card,
  CardContent,
  Typography,
  IconButton,
  Box,
  Chip,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  MoreVert,
  Visibility,
  VisibilityOff,
  ContentCopy,
  Link as LinkIcon,
} from "@mui/icons-material";
import type { PasswordEntryResponse } from "./types";

type PasswordCardProps = {
  password: PasswordEntryResponse;
  revealedId: string | null;
  isLoadingPassword?: boolean;
  onRevealToggle: (id: string) => void;
  onCopyPassword: (password: string) => void;
  onMenuClick: (event: React.MouseEvent<HTMLElement>, id: string) => void;
};

export const PasswordCard: React.FC<PasswordCardProps> = ({
  password,
  revealedId,
  isLoadingPassword = false,
  onRevealToggle,
  onCopyPassword,
  onMenuClick,
}) => {
  const isRevealed = revealedId === password.id;

  return (
    <Card sx={{ width: "100%" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: 1,
          }}
        >
          <Typography variant="h6" component="h3">
            {password.name}
          </Typography>
          <IconButton size="small" onClick={(e) => onMenuClick(e, password.id)}>
            <MoreVert />
          </IconButton>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 80 }}
            >
              Username:
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: "break-all" }}>
              {password.username}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ minWidth: 80 }}
            >
              Password:
            </Typography>
            <Box
              sx={{ display: "flex", alignItems: "center", gap: 1, flex: 1 }}
            >
              {isLoadingPassword ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <CircularProgress size={16} />
                  <Typography variant="body2" color="text.secondary">
                    Loading password...
                  </Typography>
                </Box>
              ) : (
                <span
                  style={{
                    filter: isRevealed ? "none" : "blur(6px)",
                    cursor: "pointer",
                    flex: 1,
                  }}
                  onClick={() => onRevealToggle(password.id)}
                >
                  {password.password}
                </span>
              )}
              <Tooltip title={isRevealed ? "Hide password" : "Show password"}>
                <IconButton
                  size="small"
                  onClick={() => onRevealToggle(password.id)}
                  disabled={isLoadingPassword}
                >
                  {isRevealed ? (
                    <VisibilityOff fontSize="small" />
                  ) : (
                    <Visibility fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy password">
                <IconButton
                  size="small"
                  onClick={() => onCopyPassword(password.password)}
                  disabled={isLoadingPassword}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {password.url && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <LinkIcon fontSize="small" color="action" />
              <Typography
                variant="body2"
                sx={{
                  wordBreak: "break-all",
                  color: "primary.main",
                  textDecoration: "underline",
                  cursor: "pointer",
                }}
                onClick={() => window.open(password.url, "_blank")}
              >
                {password.url}
              </Typography>
            </Box>
          )}

          {password.notes && (
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ minWidth: 80 }}
              >
                Notes:
              </Typography>
              <Typography
                variant="body2"
                sx={{ wordBreak: "break-all", flex: 1 }}
              >
                {password.notes}
              </Typography>
            </Box>
          )}

          {password.tags.length > 0 && (
            <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mt: 1 }}>
              {password.tags.map((tag) => (
                <Chip
                  key={tag.id}
                  label={tag.name}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Box>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};
