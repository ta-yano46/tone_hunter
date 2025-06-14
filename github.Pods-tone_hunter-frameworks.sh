#!/bin/sh
set -e
set -u
set -o pipefail

echo "Pods-frameworks(${LINENO})"
function on_error {
  echo "$(realpath -mq "${0}"):$1: error: Unexpected failure"
}
echo "Pods-frameworks(${LINENO})"
trap 'on_error $LINENO' ERR
echo "Pods-frameworks(${LINENO})"
if [ -z ${FRAMEWORKS_FOLDER_PATH+x} ]; then
  # If FRAMEWORKS_FOLDER_PATH is not set, then there's nowhere for us to copy
  # frameworks to, so exit 0 (signalling the script phase was successful).
  exit 0
fi
echo "Pods-frameworks(${LINENO})"
echo "mkdir -p ${CONFIGURATION_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
echo "Pods-frameworks(${LINENO})"
mkdir -p "${CONFIGURATION_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
echo "Pods-frameworks(${LINENO})"
COCOAPODS_PARALLEL_CODE_SIGN="${COCOAPODS_PARALLEL_CODE_SIGN:-false}"
echo "Pods-frameworks(${LINENO})"
SWIFT_STDLIB_PATH="${TOOLCHAIN_DIR}/usr/lib/swift/${PLATFORM_NAME}"
echo "Pods-frameworks(${LINENO})"
BCSYMBOLMAP_DIR="BCSymbolMaps"
echo "Pods-frameworks(${LINENO})"
# This protects against multiple targets copying the same framework dependency at the same time. The solution
# was originally proposed here: https://lists.samba.org/archive/rsync/2008-February/020158.html
echo "Pods-frameworks(${LINENO})"
RSYNC_PROTECT_TMP_FILES=(--filter "P .*.??????")
echo "Pods-frameworks(${LINENO})"
# Copies and strips a vendored framework
install_framework()
{
echo "Pods-frameworks(${LINENO})"
  if [ -r "${BUILT_PRODUCTS_DIR}/$1" ]; then
    local source="${BUILT_PRODUCTS_DIR}/$1"
  elif [ -r "${BUILT_PRODUCTS_DIR}/$(basename "$1")" ]; then
    local source="${BUILT_PRODUCTS_DIR}/$(basename "$1")"
  elif [ -r "$1" ]; then
    local source="$1"
  fi
echo "Pods-frameworks(${LINENO})"
  local destination="${TARGET_BUILD_DIR}/${FRAMEWORKS_FOLDER_PATH}"
echo "Pods-frameworks(${LINENO})"
  if [ -L "${source}" ]; then
    echo "Symlinked..."
    source="$(readlink -f "${source}")"
  fi
echo "Pods-frameworks(${LINENO})"
  if [ -d "${source}/${BCSYMBOLMAP_DIR}" ]; then
    # Locate and install any .bcsymbolmaps if present, and remove them from the .framework before the framework is copied
echo "Pods-frameworks(${LINENO})"
    find "${source}/${BCSYMBOLMAP_DIR}" -name "*.bcsymbolmap"|while read f; do
      echo "Installing $f"
      install_bcsymbolmap "$f" "$destination"
      rm "$f"
    done
echo "Pods-frameworks(${LINENO})"
    rmdir "${source}/${BCSYMBOLMAP_DIR}"
      rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --links --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${DERIVED_FILES_DIR}/${basename}.dSYM" "${DWARF_DSYM_FOLDER_PATH}"
    else
echo "Pods-frameworks(${LINENO})"
      # The dSYM was not stripped at all, in this case touch a fake folder so the input/output paths from Xcode do not reexecute this script because the file is missing.
      mkdir -p "${DWARF_DSYM_FOLDER_PATH}"
      touch "${DWARF_DSYM_FOLDER_PATH}/${basename}.dSYM"
echo "Pods-frameworks(${LINENO})"
    fi
  fi
}
echo "Pods-frameworks(${LINENO})"
# Used as a return value for each invocation of `strip_invalid_archs` function.
STRIP_BINARY_RETVAL=0
echo "Pods-frameworks(${LINENO})"
# Strip invalid architectures
echo "Pods-frameworks(${LINENO})"
strip_invalid_archs() {
  binary="$1"
  warn_missing_arch=${2:-true}
  # Get architectures for current target binary
  binary_archs="$(lipo -info "$binary" | rev | cut -d ':' -f1 | awk '{$1=$1;print}' | rev)"
  # Intersect them with the architectures we are building for
  intersected_archs="$(echo ${ARCHS[@]} ${binary_archs[@]} | tr ' ' '\n' | sort | uniq -d)"
  # If there are no archs supported by this binary then warn the user
  if [[ -z "$intersected_archs" ]]; then
    if [[ "$warn_missing_arch" == "true" ]]; then
      echo "warning: [CP] Vendored binary '$binary' contains architectures ($binary_archs) none of which match the current build architectures ($ARCHS)."
    fi
    STRIP_BINARY_RETVAL=1
    return
  fi
  stripped=""
  for arch in $binary_archs; do
    if ! [[ "${ARCHS}" == *"$arch"* ]]; then
      # Strip non-valid architectures in-place
      lipo -remove "$arch" -output "$binary" "$binary"
      stripped="$stripped $arch"
    fi
  done
  if [[ "$stripped" ]]; then
    echo "Stripped $binary of architectures:$stripped"
  fi
  STRIP_BINARY_RETVAL=0
}
# Copies the bcsymbolmap files of a vendored framework
install_bcsymbolmap() {
echo "Pods-frameworks(${LINENO})"
    local bcsymbolmap_path="$1"
    local destination="${BUILT_PRODUCTS_DIR}"
    echo "rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${bcsymbolmap_path}" "${destination}""
    rsync --delete -av "${RSYNC_PROTECT_TMP_FILES[@]}" --filter "- CVS/" --filter "- .svn/" --filter "- .git/" --filter "- .hg/" --filter "- Headers" --filter "- PrivateHeaders" --filter "- Modules" "${bcsymbolmap_path}" "${destination}"
}
# Signs a framework with the provided identity
code_sign_if_enabled() {
echo "Pods-frameworks(${LINENO})"
  if [ -n "${EXPANDED_CODE_SIGN_IDENTITY:-}" -a "${CODE_SIGNING_REQUIRED:-}" != "NO" -a "${CODE_SIGNING_ALLOWED}" != "NO" ]; then
    # Use the current code_sign_identity
    echo "Code Signing $1 with Identity ${EXPANDED_CODE_SIGN_IDENTITY_NAME}"
    local code_sign_cmd="/usr/bin/codesign --force --sign ${EXPANDED_CODE_SIGN_IDENTITY} ${OTHER_CODE_SIGN_FLAGS:-} --preserve-metadata=identifier,entitlements '$1'"
    if [ "${COCOAPODS_PARALLEL_CODE_SIGN}" == "true" ]; then
      code_sign_cmd="$code_sign_cmd &"
    fi
    echo "$code_sign_cmd"
    eval "$code_sign_cmd"
  fi
}
echo "Pods-frameworks(${LINENO})"
if [[ "$CONFIGURATION" == "Debug" ]]; then
echo "Pods-frameworks(${LINENO})"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/hermes-engine/Pre-built/hermes.framework"
fi
echo "Pods-frameworks(${LINENO})"
if [[ "$CONFIGURATION" == "Release" ]]; then
echo "Pods-frameworks(${LINENO})"
  install_framework "${PODS_XCFRAMEWORKS_BUILD_DIR}/hermes-engine/Pre-built/hermes.framework"
fi
echo "Pods-frameworks(${LINENO})"
if [ "${COCOAPODS_PARALLEL_CODE_SIGN}" == "true" ]; then
  wait
fi
