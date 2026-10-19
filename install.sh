#!/usr/bin/env bash

set -euo pipefail

INSTALL_ROOT=/usr/local/goedge2
INSTALL_DIR=
SOURCE=github
SERVICE=goedge2-api.service
UNIT_DIR=/etc/systemd/system
WORK_DIR=
LOCK_DIR=
SERVICE_EXISTS=0
SERVICE_LOADED=0
SETUP_ARGS=()
MANAGED=(bin web deploy installers scripts)

log() { printf '[GoEdge2] %s\n' "$*"; }
fail() { printf '[GoEdge2] ERROR: %s\n' "$*" >&2; exit 1; }

usage() {
	cat <<'USAGE'
Usage: bash install.sh [--dir PATH] [--source github] [-- SETUP_ARGUMENTS...]

  --dir PATH       Component parent directory (default: /usr/local/goedge2)
  --source github  Release source (default: github)
  --help           Show this help

Linux requires root, systemd and glibc >= 2.17. macOS supports manual startup.
API files are installed into PATH/goedge2-api (default: /usr/local/goedge2/goedge2-api).
Existing configuration and data are preserved; setup runs only without config.
Arguments after -- are passed to goedge2-api setup, without shell evaluation.
USAGE
}

parse_args() {
	while [ "$#" -gt 0 ]; do
		case "$1" in
			--dir|--source)
				[ "$#" -ge 2 ] && [ -n "$2" ] || fail "Missing value for $1"
				case "$1" in --dir) INSTALL_ROOT=$2 ;; --source) SOURCE=$2 ;; esac
				shift 2 ;;
			--help|-h) usage; exit 0 ;;
			--) shift; SETUP_ARGS=("$@"); break ;;
			*) fail "Unknown argument: $1 (see --help)" ;;
		esac
	done
	[ "$SOURCE" = github ] || fail "Unknown download source: $SOURCE"
	local argument
	for argument in ${SETUP_ARGS[@]+"${SETUP_ARGS[@]}"}; do
		case "$argument" in -h|--help|-help|-h=*|--help=*|-help=*) fail "Run goedge2-api setup -h separately" ;; esac
	done
	case "$INSTALL_ROOT" in /*) ;; *) INSTALL_ROOT="$PWD/$INSTALL_ROOT" ;; esac
	while [ "${INSTALL_ROOT%/}" != "$INSTALL_ROOT" ]; do INSTALL_ROOT=${INSTALL_ROOT%/}; done
	[ -n "$INSTALL_ROOT" ] || fail "Refusing to install into /"
	INSTALL_DIR="$INSTALL_ROOT/goedge2-api"
}

detect_platform() {
	case "$(uname -s)" in Linux) OS=linux ;; Darwin) OS=darwin ;; *) fail "Unsupported operating system" ;; esac
	case "$(uname -m)" in
		x86_64|amd64) ARCH=amd64 ;;
		aarch64|arm64) ARCH=arm64 ;;
		*) fail "Unsupported CPU architecture: $(uname -m)" ;;
	esac
	if [ "$OS" = linux ]; then
		[ "$(id -u)" = 0 ] || fail "Run this installer as root (sudo bash install.sh)"
		command -v systemctl >/dev/null 2>&1 || fail "Linux installation requires systemd"
		systemctl show --property=Version --value >/dev/null || fail "systemd is not running"
		local libc version major minor
		libc=$(getconf GNU_LIBC_VERSION 2>/dev/null) || fail "glibc >= 2.17 is required; musl Linux is unsupported"
		version=${libc#glibc }
		major=${version%%.*}
		minor=${version#*.}; minor=${minor%%.*}
		[[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || fail "Cannot determine glibc version"
		[ "$major" -gt 2 ] || { [ "$major" -eq 2 ] && [ "$minor" -ge 17 ]; } || fail "glibc >= 2.17 is required"
	fi
}

check_target() {
	case "$INSTALL_DIR" in /*) ;; *) INSTALL_DIR="$PWD/$INSTALL_DIR" ;; esac
	while [ "${INSTALL_DIR%/}" != "$INSTALL_DIR" ]; do INSTALL_DIR=${INSTALL_DIR%/}; done
	[ -n "$INSTALL_DIR" ] || fail "Refusing to install into /"
	case "$INSTALL_DIR/" in */../*|*/./*|*//*) fail "Use a path without ., .. or repeated separators" ;; esac
	[[ ! "$INSTALL_DIR" =~ [[:cntrl:]] ]] || fail "Control characters are not allowed in the path"
	local parent=$INSTALL_DIR
	while [ "$parent" != / ]; do
		[ ! -L "$parent" ] || fail "Symbolic links are not allowed in the installation path: $parent"
		[ ! -e "$parent" ] || [ -d "$parent" ] || fail "Not a directory: $parent"
		parent=$(dirname "$parent")
	done
	parent=$INSTALL_DIR
	while [ ! -d "$parent" ]; do parent=$(dirname "$parent"); done
	[ -w "$parent" ] || fail "Directory is not writable: $parent (run with sudo or use --dir)"
	if [ -d "$INSTALL_DIR" ] && [ -n "$(ls -A "$INSTALL_DIR")" ]; then
		[ -f "$INSTALL_DIR/bin/goedge2-api" ] && [ ! -L "$INSTALL_DIR/bin" ] &&
			[ ! -L "$INSTALL_DIR/bin/goedge2-api" ] || fail "Target is not a recognized GoEdge2 installation"
	fi
	local entry
	for entry in "${MANAGED[@]}" configs data logs; do
		[ ! -L "$INSTALL_DIR/$entry" ] || fail "Refusing symbolic link: $INSTALL_DIR/$entry"
		[ ! -e "$INSTALL_DIR/$entry" ] || [ -d "$INSTALL_DIR/$entry" ] || fail "Expected directory: $INSTALL_DIR/$entry"
	done
}

ensure_dependencies() {
	local missing=() tool
	for tool in bash curl unzip jq; do
		command -v "$tool" >/dev/null 2>&1 || missing+=("$tool")
	done
	if ! command -v sha256sum >/dev/null 2>&1 && ! command -v shasum >/dev/null 2>&1; then
		missing+=(coreutils)
	fi
	if [ "${#missing[@]}" -gt 0 ]; then
		[ "$OS" = linux ] || fail "Install missing tools and retry: ${missing[*]} (e.g. brew install curl unzip jq coreutils)"
		log "Installing missing dependencies: ${missing[*]}"
		if command -v apt-get >/dev/null 2>&1; then
			apt-get update
			DEBIAN_FRONTEND=noninteractive apt-get install -y "${missing[@]}" ca-certificates
		elif command -v dnf >/dev/null 2>&1; then
			dnf install -y "${missing[@]}" ca-certificates
		elif command -v yum >/dev/null 2>&1; then
			yum install -y "${missing[@]}" ca-certificates
		elif command -v zypper >/dev/null 2>&1; then
			zypper --non-interactive install "${missing[@]}" ca-certificates
		else
			fail "Install missing dependencies and retry: ${missing[*]}"
		fi
	fi
	for tool in bash curl unzip jq; do command -v "$tool" >/dev/null 2>&1 || fail "Missing tool: $tool"; done
	if command -v sha256sum >/dev/null 2>&1; then HASH_TOOL=sha256sum
	elif command -v shasum >/dev/null 2>&1; then HASH_TOOL=shasum
	else fail "Missing SHA-256 tool"; fi
}

download() {
	[[ "$1" == https://* ]] || fail "Download URL must use HTTPS"
	curl --fail --location --show-error --silent --proto '=https' --proto-redir '=https' \
		--connect-timeout 15 --max-time 1800 --retry 3 --retry-delay 2 \
		--output "$2" "$1"
}

github_release() {
	download https://api.github.com/repos/goedge2/goedge2/releases/latest "$WORK_DIR/release.json"
	VERSION=$(jq -er 'select(.draft == false and .prerelease == false) | .tag_name | strings | select(test("^v?[0-9]+(\\.[0-9]+)*$"))' "$WORK_DIR/release.json") || fail "No valid stable GitHub release"
	local name="goedge2-api-${OS}-${ARCH}-v${VERSION#v}.zip"
	jq -e --arg name "$name" '[.assets[] | select(.name == $name)] | select(length == 1) | .[0]' \
		"$WORK_DIR/release.json" > "$WORK_DIR/asset.json" || fail "Release $VERSION has no unique asset $name"
	ASSET_URL=$(jq -er '.browser_download_url | strings | select(startswith("https://"))' "$WORK_DIR/asset.json") || fail "Invalid asset URL"
	DIGEST=$(jq -er '.digest | strings | select(test("^sha256:[a-fA-F0-9]{64}$")) | ltrimstr("sha256:") | ascii_downcase' "$WORK_DIR/asset.json") || fail "Release asset has no valid SHA-256 digest"
	log "Downloading $name from GitHub"
}

prepare_package() {
	case "$SOURCE" in github) github_release ;; *) fail "Unsupported source: $SOURCE" ;; esac
	download "$ASSET_URL" "$WORK_DIR/package.zip"
	local actual
	if [ "$HASH_TOOL" = sha256sum ]; then actual=$(sha256sum "$WORK_DIR/package.zip")
	else actual=$(shasum -a 256 "$WORK_DIR/package.zip"); fi
	[ "${actual%% *}" = "$DIGEST" ] || fail "SHA-256 verification failed"
	unzip -tq "$WORK_DIR/package.zip" >/dev/null || fail "Invalid ZIP archive"
	unzip -Z -1 "$WORK_DIR/package.zip" > "$WORK_DIR/entries"
	unzip -Z -l "$WORK_DIR/package.zip" > "$WORK_DIR/modes"
	local count listed entry relative mode
	count=$(unzip -Z -t "$WORK_DIR/package.zip"); count=${count%% *}
	listed=$(wc -l < "$WORK_DIR/entries")
	[[ "$count" =~ ^[0-9]+$ ]] && [ "$count" -eq "$listed" ] || fail "Invalid archive filenames"
	while IFS= read -r entry; do
		[[ ! "$entry" =~ [[:cntrl:]] ]] || fail "Control character in archive filename"
		case "$entry" in *'^'*) fail "Encoded control character in archive filename" ;; esac
		case "$entry" in goedge2-api/*) ;; *) fail "Unexpected archive path: $entry" ;; esac
		relative=${entry#goedge2-api/}
		case "/${relative%/}/" in */../*|*/./*|*//*|*\\*)
			[ -z "$relative" ] || fail "Unsafe archive path: $entry" ;;
		esac
		case "$relative" in ''|bin/*|web/*|deploy/*|installers/*|scripts/*|configs/*|data/|logs/) ;;
			*) fail "Unexpected package content: $entry" ;; esac
	done < "$WORK_DIR/entries"
	while IFS= read -r mode; do
		case "$mode" in
			Archive:*|'Zip file size:'*|*[0-9]' files,'*) continue ;;
			d?????????\ *|-?????????\ *) ;;
			*) fail "Unsupported ZIP entry type (links are not allowed)" ;;
		esac
	done < "$WORK_DIR/modes"
	[ "$(sort "$WORK_DIR/entries" | uniq -d | wc -l | tr -d ' ')" = 0 ] || fail "Duplicate archive paths"
	unzip -q "$WORK_DIR/package.zip" -d "$WORK_DIR/extracted"
	PACKAGE_DIR="$WORK_DIR/extracted/goedge2-api"
	[ -f "$PACKAGE_DIR/bin/goedge2-api" ] && [ ! -L "$PACKAGE_DIR/bin/goedge2-api" ] || fail "Missing bin/goedge2-api"
	chmod 755 "$PACKAGE_DIR/bin/goedge2-api"
	"$PACKAGE_DIR/bin/goedge2-api" -V >/dev/null || fail "The downloaded executable cannot run on this system"
}

check_service() {
	[ "$OS" = linux ] || return 0
	local load
	load=$(systemctl show "$SERVICE" --property=LoadState --value)
	if [ "$load" != not-found ]; then
		SERVICE_EXISTS=1
		if [ "$load" = loaded ]; then SERVICE_LOADED=1; fi
	fi
	if [ -e "$UNIT_DIR/$SERVICE" ] || [ -L "$UNIT_DIR/$SERVICE" ]; then SERVICE_EXISTS=1; fi
	return 0
}

has_config() {
	[ -e "$INSTALL_DIR/configs/goedge2.yaml" ] ||
		{ [ -e "$INSTALL_DIR/configs/api.yaml" ] && [ -e "$INSTALL_DIR/configs/db.yaml" ]; }
}

replace_package() {
	if [ "$OS" = linux ] && [ "$SERVICE_EXISTS" -eq 1 ]; then
		log "Replacing existing $SERVICE"
		if [ "$SERVICE_LOADED" -eq 1 ] || systemctl is-active --quiet "$SERVICE"; then
			if ! systemctl stop "$SERVICE"; then
				if systemctl is-active --quiet "$SERVICE"; then fail "Cannot stop existing $SERVICE"; fi
			fi
		fi
		systemctl disable "$SERVICE" >/dev/null 2>&1 || true
		if [ -e "$UNIT_DIR/$SERVICE" ] || [ -L "$UNIT_DIR/$SERVICE" ]; then
			rm -f -- "$UNIT_DIR/$SERVICE"
		fi
		systemctl daemon-reload
	fi
	local entry
	for entry in "${MANAGED[@]}"; do
		[ -d "$PACKAGE_DIR/$entry" ] || continue
		if [ -e "$INSTALL_DIR/$entry" ]; then rm -rf -- "${INSTALL_DIR:?}/$entry"; fi
		cp -Rp "$PACKAGE_DIR/$entry" "$INSTALL_DIR/$entry"
	done
	mkdir -p "$INSTALL_DIR/configs" "$INSTALL_DIR/data" "$INSTALL_DIR/logs"
	if [ -f "$PACKAGE_DIR/configs/goedge2.template.yaml" ] && [ ! -e "$INSTALL_DIR/configs/goedge2.template.yaml" ]; then
		cp "$PACKAGE_DIR/configs/goedge2.template.yaml" "$INSTALL_DIR/configs/"
	fi
}

initialize() {
	if has_config; then
		"$INSTALL_DIR/bin/goedge2-api" check-config || fail "Existing config is invalid; repair it before retrying"
		log "Keeping existing configuration; skipping setup"
		return
	fi
	log "Initializing configuration"
	local result=0
	if [ "${#SETUP_ARGS[@]}" -gt 0 ]; then
		(cd "$INSTALL_DIR" && ./bin/goedge2-api setup "${SETUP_ARGS[@]}") || result=$?
	else
		(cd "$INSTALL_DIR" && ./bin/goedge2-api setup < /dev/tty) || result=$?
	fi
	if [ "$result" -ne 0 ]; then
		printf 'Setup did not complete. Retry with: cd %q && ./bin/goedge2-api setup\n' "$INSTALL_DIR" >&2
		exit "$result"
	fi
	"$INSTALL_DIR/bin/goedge2-api" check-config || fail "Setup returned success without a valid local configuration"
}

start_service() {
	if [ "$OS" = linux ]; then
		"$INSTALL_DIR/bin/goedge2-api" service
		systemctl daemon-reload
		systemctl enable --now "$SERVICE"
		systemctl is-enabled --quiet "$SERVICE"
		systemctl is-active --quiet "$SERVICE"
	fi
}

cleanup() {
	local result=$?
	trap - EXIT INT TERM
	set +e
	if [ -n "$WORK_DIR" ]; then rm -rf -- "$WORK_DIR"; fi
	if [ -n "$LOCK_DIR" ]; then rmdir "$LOCK_DIR"; fi
	exit "$result"
}

main() {
	parse_args "$@"
	detect_platform
	check_target
	ensure_dependencies
	check_service
	if ! has_config && [ "${#SETUP_ARGS[@]}" -eq 0 ]; then
		( : < /dev/tty ) 2>/dev/null || fail "No interactive terminal; pass complete setup arguments after --"
	fi
	mkdir -p "$(dirname "$INSTALL_DIR")"
	local lock="${INSTALL_DIR}.install-lock"
	mkdir "$lock" 2>/dev/null || fail "Installation is already locked: $lock"
	LOCK_DIR=$lock
	trap cleanup EXIT
	trap 'exit 130' INT
	trap 'exit 143' TERM
	umask 077
	WORK_DIR=$(mktemp -d "${TMPDIR:-/tmp}/goedge2-install.XXXXXX")
	prepare_package
	check_target
	mkdir -p "$INSTALL_DIR"
	replace_package
	initialize
	start_service
	log "Installed $VERSION into $INSTALL_DIR"
	if [ "$OS" = darwin ]; then printf 'Start manually: cd %q && ./bin/goedge2-api start\n' "$INSTALL_DIR"; fi
}

if [ -z "${BASH_SOURCE[0]:-}" ] || [ "${BASH_SOURCE[0]}" = "$0" ]; then main "$@"; fi
