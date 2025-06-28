import { useIsMobile } from "@/hooks/useIsMobile";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { IconButton, TextField } from "@mui/material";

type props = {
  isPasswordShowing: boolean;
  setIsPasswordShowing: (e: boolean) => void;
  value: unknown;
  handleChange: (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => void;
  required: boolean;
  isDisabled: boolean;
  isEditingPassword: boolean;
};

export const PasswordField: React.FC<props> = ({
  isPasswordShowing,
  setIsPasswordShowing,
  value,
  handleChange,
  required,
  isDisabled,
  isEditingPassword,
}) => {
  const isMobile = useIsMobile();

  return (
    <TextField
      name="password"
      label="Password"
      type={isPasswordShowing ? "text" : "password"}
      value={value}
      onChange={handleChange}
      required={required}
      disabled={isDisabled}
      fullWidth
      size={isMobile ? "small" : "medium"}
      placeholder={
        isEditingPassword ? "Enter new password or leave unchanged" : ""
      }
      InputProps={{
        endAdornment: (
          <IconButton
            aria-label="toggle password visibility"
            onClick={() => setIsPasswordShowing(!isPasswordShowing)}
            edge="end"
          >
            {isPasswordShowing ? <VisibilityOff /> : <Visibility />}
          </IconButton>
        ),
      }}
    />
  );
};
