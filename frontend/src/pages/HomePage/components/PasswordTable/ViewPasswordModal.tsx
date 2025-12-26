import React, { useEffect, useState } from "react";
import { Modal } from "../../../../components/Modal/Modal";
import {
  CircularProgress,
  Box,
  Button,
  Typography,
  Chip,
  IconButton,
  Tooltip,
  Divider,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  ContentCopy,
  Link as LinkIcon,
  Edit,
} from "@mui/icons-material";
import { useFetchPassword } from "../../hooks/useFetchPassword";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { PasswordEntryResponse } from "./types";

export type ViewPasswordModalProps = {
  open: boolean;
  password: PasswordEntryResponse | null;
  onClose: () => void;
  onEdit?: () => void;
};

export const ViewPasswordModal: React.FC<ViewPasswordModalProps> = ({
  open,
  password,
  onClose,
  onEdit,
}) => {
  const isMobile = useIsMobile();
  const [shouldFetchPassword, setShouldFetchPassword] = useState(false);
  const { revealedPassword, isLoadingPassword, setRevealedId } =
    useFetchPassword(shouldFetchPassword ? password?.id || null : null);
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (open) {
      setShowPassword(false);
      setCopied(false);
      setShouldFetchPassword(false);
    }
  }, [open]);

  const handleRevealToggle = () => {
    if (!shouldFetchPassword && password) {
      setShouldFetchPassword(true);
      setRevealedId(password.id);
      setShowPassword(true);
      return;
    }
    setShowPassword(!showPassword);
  };

  const handleCopyPassword = async () => {
    if (!shouldFetchPassword) {
      if (password) {
        setShouldFetchPassword(true);
        setRevealedId(password.id);
      }
      return;
    }
    if (!revealedPassword?.password) {
      return;
    }
    try {
      await navigator.clipboard.writeText(revealedPassword.password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy password to clipboard");
    }
  };

  const handleCopyField = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy to clipboard");
    }
  };

  return (
    <Modal
      isModalShowing={open}
      handleCloseModal={onClose}
      isClosedButtonDisabled={false}
      aria-labelledby="view-password-modal-title"
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? 1.5 : 2,
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          pr: 0.5,
          "&::-webkit-scrollbar": {
            width: "6px",
          },
          "&::-webkit-scrollbar-track": {
            background: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "3px",
            "&:hover": {
              background: "rgba(255, 255, 255, 0.3)",
            },
          },
        }}
      >
        <Typography
          id="view-password-modal-title"
          variant={isMobile ? "h6" : "h5"}
          component="h2"
          sx={{
            textAlign: "center",
            mb: isMobile ? 0.5 : 1,
            fontSize: isMobile ? "1.1rem" : "1.25rem",
            fontWeight: 600,
          }}
        >
          Password Details
        </Typography>

        {!password ? (
          <Typography color="error" align="center" sx={{ py: 2 }}>
            Password not found
          </Typography>
        ) : (
          <>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: isMobile ? 1.5 : 2,
              }}
            >
              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontWeight: 500 }}
                >
                  App/Site/Device Name
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ wordBreak: "break-all", flex: 1 }}
                  >
                    {password.name}
                  </Typography>
                  <Tooltip title="Copy name">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyField(password.name)}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontWeight: 500 }}
                >
                  Username
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{ wordBreak: "break-all", flex: 1 }}
                  >
                    {password.username}
                  </Typography>
                  <Tooltip title="Copy username">
                    <IconButton
                      size="small"
                      onClick={() => handleCopyField(password.username)}
                    >
                      <ContentCopy fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              <Divider />

              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 0.5, fontWeight: 500 }}
                >
                  Password
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  {isLoadingPassword ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flex: 1,
                      }}
                    >
                      <CircularProgress size={16} />
                      <Typography variant="body2" color="text.secondary">
                        Loading password...
                      </Typography>
                    </Box>
                  ) : (
                    <>
                      <Typography
                        variant="body1"
                        sx={{
                          wordBreak: "break-all",
                          flex: 1,
                          filter:
                            shouldFetchPassword && showPassword
                              ? "none"
                              : "blur(6px)",
                          fontFamily: "monospace",
                        }}
                      >
                        {shouldFetchPassword && revealedPassword
                          ? revealedPassword.password
                          : password.password}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <Tooltip
                          title={
                            shouldFetchPassword && showPassword
                              ? "Hide password"
                              : "Reveal password"
                          }
                        >
                          <IconButton
                            size="small"
                            onClick={handleRevealToggle}
                            disabled={isLoadingPassword}
                          >
                            {shouldFetchPassword && showPassword ? (
                              <VisibilityOff fontSize="small" />
                            ) : (
                              <Visibility fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={copied ? "Copied!" : "Copy password"}>
                          <IconButton
                            size="small"
                            onClick={handleCopyPassword}
                            disabled={
                              isLoadingPassword ||
                              (!shouldFetchPassword && !revealedPassword)
                            }
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </>
                  )}
                </Box>
              </Box>

              {password.url && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5, fontWeight: 500 }}
                    >
                      URL
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <LinkIcon fontSize="small" color="action" />
                        <Typography
                          variant="body1"
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
                      <Tooltip title="Copy URL">
                        <IconButton
                          size="small"
                          onClick={() => handleCopyField(password.url)}
                        >
                          <ContentCopy fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </>
              )}

              {password.notes && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.5, fontWeight: 500 }}
                    >
                      Notes
                    </Typography>
                    <Typography
                      variant="body1"
                      sx={{
                        wordBreak: "break-all",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {password.notes}
                    </Typography>
                  </Box>
                </>
              )}

              {password.tags.length > 0 && (
                <>
                  <Divider />
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 0.75, fontWeight: 500 }}
                    >
                      Tags
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        gap: isMobile ? 0.5 : 1,
                        flexWrap: "wrap",
                      }}
                    >
                      {password.tags.map((tag) => (
                        <Chip
                          key={tag.id}
                          label={tag.name}
                          size={isMobile ? "small" : "medium"}
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>
                </>
              )}
            </Box>

            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
                mt: 1,
                mb: 1,
                pt: 1,
                borderTop: "1px solid",
                borderColor: "divider",
              }}
            >
              <Button
                onClick={onClose}
                variant="outlined"
                size={isMobile ? "small" : "medium"}
              >
                Close
              </Button>
              {onEdit && (
                <Button
                  onClick={onEdit}
                  variant="contained"
                  color="primary"
                  startIcon={<Edit />}
                  size={isMobile ? "small" : "medium"}
                >
                  Edit
                </Button>
              )}
            </Box>
          </>
        )}
      </Box>
    </Modal>
  );
};

