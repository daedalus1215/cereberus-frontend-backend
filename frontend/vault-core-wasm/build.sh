#!/bin/sh
# Builds the browser's copy of vault-core into pkg/. It needs:
#
#   rustup target add wasm32-unknown-unknown
#   cargo install wasm-bindgen-cli --version <the wasm-bindgen pinned in Cargo.toml> --locked
set -eu
cd "$(dirname "$0")"

cargo build --release --locked --target wasm32-unknown-unknown
wasm-bindgen --target web --out-dir pkg \
  target/wasm32-unknown-unknown/release/vault_core_wasm.wasm
