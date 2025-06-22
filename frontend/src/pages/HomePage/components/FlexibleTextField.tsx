import React from "react";
import { TextField, useMediaQuery, useTheme } from "@mui/material";

type props = {
  name: string;
  label: string;
  value: unknown;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => void;
  isDisabled: boolean;
};
export const FlexibleTextField: React.FC<props> = ({
  name,
  label,
  value,
  handleChange,
  isDisabled,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <TextField
      name={name}
      label={label}
      value={value}
      onChange={handleChange}
      required
      disabled={isDisabled}
      fullWidth
      size={isMobile ? "small" : "medium"}
    />
  );
};
