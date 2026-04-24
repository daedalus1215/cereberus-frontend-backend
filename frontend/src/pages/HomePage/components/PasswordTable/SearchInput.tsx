import React, { useState, useEffect, useCallback } from "react";
import { TextField, InputAdornment, IconButton } from "@mui/material";
import { Search as SearchIcon, Clear as ClearIcon } from "@mui/icons-material";

type SearchInputProps = {
  onSearch: (query: string) => void;
};

const DEBOUNCE_MS = 300;

export const SearchInput: React.FC<SearchInputProps> = ({ onSearch }) => {
  const [input, setInput] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [input]);

  useEffect(() => {
    onSearch(debounced);
  }, [debounced, onSearch]);

  const handleClear = useCallback(() => {
    setInput("");
    setDebounced("");
    onSearch("");
  }, [onSearch]);

  return (
    <TextField
      fullWidth
      variant="outlined"
      placeholder="Search passwords..."
      value={input}
      onChange={(e) => setInput(e.target.value)}
      aria-label="Search passwords"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchIcon />
          </InputAdornment>
        ),
        endAdornment: input && (
          <InputAdornment position="end">
            <IconButton onClick={handleClear} aria-label="Clear search">
              <ClearIcon />
            </IconButton>
          </InputAdornment>
        ),
      }}
      sx={{ mb: 2 }}
    />
  );
};
