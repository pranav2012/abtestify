#!/usr/bin/env bash
# Sets up the GitHub secrets, variable and environment the release workflow
# needs for crates.io, PyPI and Maven Central. Values are read hidden and
# piped straight into `gh secret set`; nothing is echoed or written to disk.
# Each step can be skipped and run again later. See RELEASING.md.
#
# Usage: scripts/setup-release-secrets.sh
set -euo pipefail

REPO="pranav2012/abtestify"
NAME="Pranav Agarwal"
EMAIL="p2012agarwal@gmail.com"

ask() { read -r -p "$1 [y/N] " reply; [[ "$reply" =~ ^[Yy]$ ]]; }
secret() {
    local value
    read -r -s -p "  $1: " value
    echo
    [ -n "$value" ] || { echo "  Empty; skipped."; return 1; }
    printf '%s' "$value" | gh secret set "$1" -R "$REPO"
}

command -v gh >/dev/null || { echo "Install the GitHub CLI first: brew install gh"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Sign in first: gh auth login"; exit 1; }

echo "== crates.io =="
echo "  Create a token at https://crates.io/settings/tokens (scopes: publish-new, publish-update)."
if ask "Add CARGO_REGISTRY_TOKEN now?"; then secret CARGO_REGISTRY_TOKEN || true; fi

echo
echo "== PyPI (pip) =="
echo "  First add a pending publisher at https://pypi.org/manage/account/publishing/"
echo "  project abtestify, owner pranav2012, repo abtestify, workflow release.yml, environment pypi."
if ask "Done that? Create the 'pypi' environment and set PYPI_ENABLED=true?"; then
    gh api -X PUT "repos/$REPO/environments/pypi" >/dev/null
    gh variable set PYPI_ENABLED -R "$REPO" --body true
    echo "  Environment 'pypi' and PYPI_ENABLED=true are set."
fi

echo
echo "== Maven Central (Java and Kotlin) =="
echo "  Sign in at https://central.sonatype.com with GitHub (verifies io.github.pranav2012),"
echo "  then Account > Generate User Token, which shows a username and a password."
if ask "Add MAVEN_CENTRAL_USERNAME and MAVEN_CENTRAL_PASSWORD now?"; then
    secret MAVEN_CENTRAL_USERNAME || true
    secret MAVEN_CENTRAL_PASSWORD || true
fi

echo
echo "== GPG signing key (required by Maven Central) =="
if ask "Generate a new signing key, publish it, and add SIGNING_KEY and SIGNING_PASSWORD?"; then
    command -v gpg >/dev/null || { echo "  Install GnuPG first: brew install gnupg"; exit 1; }
    read -r -s -p "  Choose a passphrase for the key: " pass; echo
    read -r -s -p "  Repeat it: " again; echo
    [ "$pass" = "$again" ] && [ -n "$pass" ] || { echo "  Passphrases don't match; skipped."; exit 1; }

    before=$(gpg --list-secret-keys --with-colons 2>/dev/null | awk -F: '/^fpr/ {print $10}')
    printf '%s' "$pass" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
        --quick-gen-key "$NAME <$EMAIL>" rsa4096 sign 3y
    fpr=$(gpg --list-secret-keys --with-colons | awk -F: '/^fpr/ {print $10}' | grep -vxF "$before" | tail -1)
    [ -n "$fpr" ] || { echo "  Couldn't find the new key."; exit 1; }
    echo "  Created key $fpr"

    gpg --keyserver hkps://keyserver.ubuntu.com --send-keys "$fpr"
    gpg --keyserver hkps://keys.openpgp.org --send-keys "$fpr" || true
    printf '%s' "$pass" | gpg --batch --pinentry-mode loopback --passphrase-fd 0 \
        --armor --export-secret-keys "$fpr" | gh secret set SIGNING_KEY -R "$REPO"
    printf '%s' "$pass" | gh secret set SIGNING_PASSWORD -R "$REPO"
    unset pass again
    echo "  Published the public key and set SIGNING_KEY and SIGNING_PASSWORD."
    echo "  keys.openpgp.org emails $EMAIL a link to confirm; click it."
fi

echo
echo "== Now set on $REPO =="
gh secret list -R "$REPO"
gh variable list -R "$REPO"
