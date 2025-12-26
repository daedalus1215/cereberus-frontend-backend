import React from "react";
import { Box, Chip, Typography, Button } from "@mui/material";
import { Clear as ClearIcon } from "@mui/icons-material";
import { useQuery } from "@tanstack/react-query";
import { fetchTags } from "@/api/tags";
import type { TagResponse } from "@/api/tags";
import { useIsMobile } from "@/hooks/useIsMobile";

type TagFilterProps = {
  selectedTagIds: number[];
  onTagToggle: (tagId: number) => void;
  onClearFilters: () => void;
};

export const TagFilter: React.FC<TagFilterProps> = ({
  selectedTagIds,
  onTagToggle,
  onClearFilters,
}) => {
  const isMobile = useIsMobile();
  const {
    data: tags = [],
    isLoading: isLoadingTags,
  } = useQuery<TagResponse[]>({
    queryKey: ["tags"],
    queryFn: fetchTags,
  });

  if (isLoadingTags) {
    return (
      <Box sx={{ py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          Loading tags...
        </Typography>
      </Box>
    );
  }

  if (tags.length === 0) {
    return null;
  }

  const hasActiveFilters = selectedTagIds.length > 0;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        mb: 2,
        pb: 2,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontWeight: 500 }}
        >
          Filter by tags:
        </Typography>
        {hasActiveFilters && (
          <Button
            size="small"
            startIcon={<ClearIcon />}
            onClick={onClearFilters}
            variant="outlined"
            sx={{ minWidth: "auto" }}
          >
            Clear filters
          </Button>
        )}
      </Box>
      <Box
        sx={{
          display: "flex",
          gap: isMobile ? 0.5 : 1,
          flexWrap: "wrap",
        }}
      >
        {tags.map((tag) => {
          const isSelected = selectedTagIds.includes(tag.id);
          return (
            <Chip
              key={tag.id}
              label={tag.name}
              onClick={() => onTagToggle(tag.id)}
              variant={isSelected ? "filled" : "outlined"}
              color={isSelected ? "primary" : "default"}
              size={isMobile ? "small" : "medium"}
              sx={{
                cursor: "pointer",
                transition: "all 0.2s ease",
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            />
          );
        })}
      </Box>
      {hasActiveFilters && (
        <Typography variant="caption" color="text.secondary">
          Showing passwords with {selectedTagIds.length}{" "}
          {selectedTagIds.length === 1 ? "tag" : "tags"} selected
        </Typography>
      )}
    </Box>
  );
};

