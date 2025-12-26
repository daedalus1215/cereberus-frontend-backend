import React from "react";
import { default as MuiModal } from "@mui/material/Modal";
import { useGetModalStyle } from "@/hooks/useGetModalStyle";
import { Box, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

type props = {
  children: React.ReactNode;
  handleCloseModal: () => void;
  isModalShowing: boolean;
  isClosedButtonDisabled: boolean;
  "aria-labelledby"?: string;
};
export const Modal: React.FC<props> = ({
  children,
  handleCloseModal,
  isModalShowing,
  isClosedButtonDisabled,
  "aria-labelledby": ariaLabelledBy,
}) => {
  const getModalStyle = useGetModalStyle();

  return (
    <MuiModal
      open={isModalShowing}
      onClose={handleCloseModal}
      aria-labelledby={ariaLabelledBy || "create-password-modal-title"}
    >
      <Box sx={getModalStyle()}>
        <IconButton
          aria-label="close"
          onClick={handleCloseModal}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
          disabled={isClosedButtonDisabled}
        >
          <CloseIcon />
        </IconButton>
        {children}
      </Box>
    </MuiModal>
  );
};
