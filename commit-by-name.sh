#!/usr/bin/env bash

# Commit files one at a time, one commit per file.
#
# Each commit message is "<prefix>: <relative file path>".
#
#   ./commit-by-name.sh --prefix "feat"
#   ./commit-by-name.sh --prefix "fix" --files src/a.ts src/b.ts
#   ./commit-by-name.sh --prefix "docs" --dry-run
#   ./commit-by-name.sh --prefix "chore" --skip-failed
#
# Without --files, every modified or untracked file in the working tree is
# committed, in the order reported by git.
#
# Usage:
#   commit-by-name.sh [options]
#
# Options:
#   --prefix <text>       Commit message prefix. Required.
#   --files <name...>     Commit only these files (space or comma separated).
#   --dry-run             Print the commits without creating them.
#   --skip-failed         Keep going after a commit fails.
#   --message-format <f>  Format string for the commit message; %s is the file.
#                        Default: "prefix: %s"
#   -h, --help            Show this help.

set -uo pipefail

VERSION="1.0.0"

# Commit message prefix, e.g. "feat".
PRESET_PREFIX=""

# Format string for the commit message; %s is the file.
PRESET_MESSAGE_FORMAT="prefix: %s"

# Files to commit, in the order given.
PRESET_FILES=()

# Relative path of the repository root. Empty outside a repository.
REPO_ROOT=""

# Run the flow in dry-run mode.
DRY_RUN=false

# Continue after a commit fails.
SKIP_FAILED=false

# Print the usage text and exit with the given status.
usage() {
  local status="$1"
  cat <<EOF
Usage:
  commit-by-name.sh [options]

Commit files one at a time, one commit per file.

  --prefix <text>       Commit message prefix. Required.
  --files <name...>     Commit only these files (space or comma separated).
  --dry-run             Print the commits without creating them.
  --skip-failed         Keep going after a commit fails.
  --message-format <f>  Format string for the commit message; %s is the file.
                        Default: "prefix: %s"
  -h, --help            Show this help.

Examples:
  ./commit-by-name.sh --prefix "feat"
  ./commit-by-name.sh --prefix "fix" --files src/a.ts src/b.ts
  ./commit-by-name.sh --prefix "docs" --dry-run
EOF
  exit "$status"
}

# Show the help text and exit with the given status.
show_help() {
  usage 0
}

# Print an error message and exit with status 1.
die() {
  local message="$1"
  printf 'error: %s\n' "$message"
  exit 1
}

# Get the repository root, or the current directory outside a repository.
repo_root() {
  local root
  root="$(git rev-parse --show-toplevel 2>/dev/null)"
  if [[ -z "$root" ]]; then
    root="$(pwd)"
  fi
  printf '%s' "$root"
}

# Split a comma-separated list into an array of words.
split_comma() {
  local input="$1"
  local output=()
  local item=""
  local char
  local in_quotes=false

  for ((index = 0; index < ${#input}; index += 1)); do
    char="${input:index:1}"

    if [[ "$char" == '"' ]]; then
      in_quotes=true
      item+="$char"
    elif [[ "$char" == '\\' && "$in_quotes" == false ]]; then
      item+="$char"
      item+="${input:index:2}"
      index+=1
    elif [[ "$char" == ',' && "$in_quotes" == false ]]; then
      output+=( "$item" )
      item=""
    else
      item+="$char"
    fi
  done

  output+=( "$item" )

  printf '%s\n' "${output[@]}"
}

# Build the relative path of a file from the repository root.
#   relative-path --prefix <repo-root>/src/a.ts  ->  src/a.ts
relative_path() {
  local file="$1"
  local root="$2"
  local path

  if [[ -z "$root" ]]; then
    printf '%s' "$file"
    return
  fi

  path="$(realpath -- "$file" 2>/dev/null)"
  path="${path#"$root"/}"

  if [[ "$path" == "$file" ]]; then
    printf '%s' "$file"
    return
  fi

  printf '%s' "$path"
}

# Normalize the files given on the command line into a list of relative paths.
normalize_files() {
  local file
  local list
  local input

  list=()

  for input in "${PRESET_FILES[@]}"; do
    for file in $(split_comma "$input"); do
      if [[ -z "$file" ]]; then
        continue
      fi
      list+=( "$(relative_path "$file" "$REPO_ROOT")" )
    done
  done

  printf '%s\n' "${list[@]}"
}

# Collect every modified or untracked file in the working tree.
collect_files() {
  local root
  local file

  root="$(repo_root)"

  # Staged and unstaged modifications.
  for file in $(git ls-files -m -- "$root" 2>/dev/null); do
    printf '%s\n' "$(relative_path "$file" "$root")"
  done

  # Deleted files.
  for file in $(git ls-files -d -- "$root" 2>/dev/null); do
    printf '%s\n' "$(relative_path "$file" "$root")"
  done

  # Untracked files.
  for file in $(git ls-files --others --exclude-standard -- "$root" 2>/dev/null); do
    printf '%s\n' "$(relative_path "$file" "$root")"
  done
}

# Build the commit message for a file.
build_message() {
  local prefix="$1"
  local file="$2"
  local format="${3:-prefix: %s}"

  printf "$format\n" "$prefix" "$file"
}

# Stage a file and commit it with a message built from the prefix and file name.
commit_file() {
  local file="$1"
  local message
  local status

  # Skip files that are already committed.
  if git status --porcelain -- "$file" >/dev/null 2>&1; then
    printf '  already committed, skipping\n'
    return 0
  fi

  message="$(build_message "$PRESET_PREFIX" "$file" "$PRESET_MESSAGE_FORMAT")"

  status="$(git add "$file" 2>&1)"
  if [[ -n "$status" ]]; then
    printf '  not added: %s\n' "$status"
    return 1
  fi

  status="$(git commit -q -m "$message" 2>&1)"
  if [[ -n "$status" ]]; then
    printf '  commit failed: %s\n' "$status"
    return 1
  fi

  printf '  committed\n'
  return 0
}

# Print the list of commits that would be created without creating them.
dry_run_files() {
  local file
  local message

  for file in "${file_list[@]}"; do
    message="$(build_message "$PRESET_PREFIX" "$file" "$PRESET_MESSAGE_FORMAT")"
    printf '  %s -> %s\n' "$file" "$message"
  done
}

# Run the whole flow: collect the files, then commit them one by one.
run_flow() {
  local file_list=()
  local total
  local index
  local file
  local status

  if ${#PRESET_FILES[@]} -eq 0; then
    mapfile -t file_list < <(collect_files)
  else
    mapfile -t file_list < <(normalize_files)
  fi

  total="${#file_list[@]}"

  if [[ "$total" -eq 0 ]]; then
    printf 'No files to commit.\n'
    exit 0
  fi

  printf 'Committing %d file(s)\n' "$total"

  for ((index = 0; index < total; index += 1)); do
    file="${file_list[index]}"

    printf '[%d/%d] %s\n' "$((index + 1))" "$total" "$file"

    if "$DRY_RUN"; then
      dry_run_files
      continue
    fi

    status="$(commit_file "$file") || true"

    if [[ "$status" == 0 ]]; then
      printf '  done\n'
    elif "$SKIP_FAILED"; then
      printf '  failed, continuing\n'
    else
      exit 1
    fi
  done

  printf 'All files committed.\n'
}

# Parse the command line into options and positional file arguments.
parse_args() {
  local option
  local index
  local total
  local consumed=0
  local args=()

  for index in "$@"; do
    args+=( "$index" )
  done

  total="${#args[@]}"

  while [[ "$consumed" -lt "$total" ]]; do
    option="${args[consumed]}"
    consumed+=1

    case "$option" in
      --prefix)
        if [[ "$consumed" -ge "$total" ]]; then
          die "missing argument for --prefix"
        fi
        PRESET_PREFIX="${args[consumed]}"
        consumed+=1
        ;;
      --files)
        if [[ "$consumed" -ge "$total" ]]; then
          die "missing argument for --files"
        fi
        PRESET_FILES+=( "${args[consumed]}" )
        consumed+=1
        ;;
      --message-format)
        if [[ "$consumed" -ge "$total" ]]; then
          die "missing argument for --message-format"
        fi
        PRESET_MESSAGE_FORMAT="${args[consumed]}"
        consumed+=1
        ;;
      --dry-run|--skip-failed)
        consumed+=1
        ;;
      -h|--help)
        show_help
        exit 0
        ;;
      --)
        consumed+=1
        break
        ;;
      *)
        die "unknown option: $option"
        ;;
    esac
  done

  PRESET_FILES+=( "${args[@]:$consumed}" )
}

# Validate the options and run the flow.
main() {
  REPO_ROOT="$(repo_root)"

  parse_args "$@"

  if [[ -z "$PRESET_PREFIX" ]]; then
    die "missing option: --prefix <text>"
  fi

  run_flow
}

main "$@"
