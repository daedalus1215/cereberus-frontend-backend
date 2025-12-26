import { useTheme } from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";

export const useGetModalStyle = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return () => ({
    position: "absolute" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: isMobile ? "90vw" : 500,
    maxWidth: isMobile ? "90vw" : 500,
    maxHeight: isMobile ? "90vh" : "85vh",
    bgcolor: "background.paper",
    border: "2px solid",
    borderColor: "divider",
    borderRadius: 2,
    boxShadow: 24,
    p: isMobile ? 2 : 3,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    outline: "none",
  });
};
