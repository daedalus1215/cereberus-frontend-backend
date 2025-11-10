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
    width: isMobile ? "90vw" : 400,
    maxWidth: isMobile ? "none" : 400,
    maxHeight: isMobile ? "90vh" : "80vh",
    bgcolor: "background.paper",
    border: "2px solid",
    borderColor: "divider",
    boxShadow: 24,
    p: isMobile ? 2 : 4,
    overflow: "auto",
  });
};
