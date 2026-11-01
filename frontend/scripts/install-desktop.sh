#!/bin/sh
# Installs the release desktop build for this user, no root needed: the
# binary in ~/.local/bin, and a launcher entry with the app's icon.
# `npm run desktop:install` builds first; `--uninstall` removes it all again,
# leaving the app's settings (~/.config/com.cereberus.app.desktop) and data
# (~/.local/share/com.cereberus.app.desktop).
set -eu
cd "$(dirname "$0")/.."

bin="$HOME/.local/bin/cereberus-desktop"
data="${XDG_DATA_HOME:-$HOME/.local/share}"
# Not cereberus.desktop, the name Omarchy gives a web app called cereberus.
entry="$data/applications/cereberus-desktop.desktop"
icons="$data/icons/hicolor"

if [ "${1:-}" = --uninstall ]; then
  rm -f "$bin" "$entry"
  for size in 32x32 64x64 128x128 256x256 512x512; do
    rm -f "$icons/$size/apps/cereberus-desktop.png"
  done
  echo "Uninstalled Cereberus"
  exit 0
fi

install -Dm755 src-tauri/target/release/cereberus-desktop "$bin"

# From `npm run generate-app-icons`, via `tauri icon`.
icon() {
  install -Dm644 "src-tauri/icons/$1" "$icons/$2/apps/cereberus-desktop.png"
}
icon 32x32.png 32x32
icon 64x64.png 64x64
icon 128x128.png 128x128
icon 128x128@2x.png 256x256
icon icon.png 512x512

mkdir -p "$(dirname "$entry")"
cat > "$entry" <<EOF
[Desktop Entry]
Type=Application
Name=Cereberus (Desktop)
Comment=Password manager
Exec=$bin
Icon=cereberus-desktop
StartupWMClass=cereberus-desktop
Categories=Utility;Security;
Terminal=false
EOF

echo "Installed Cereberus: $bin and $entry"
