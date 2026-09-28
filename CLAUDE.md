## Dev environment (NixOS)

This project's toolchain comes from the Nix dev shell in `flake.nix`, loaded
automatically by direnv on `cd`. There is deliberately no system-wide
interpreter or runtime on this host — "not installed on the host" is the
expected state, not a problem to work around.

Do **not** use `nix-shell -p`, do **not** install tools globally, and do **not**
shell into a Docker container just to get a runtime. Instead run every command
through the dev shell:

    direnv exec . <command>

Examples:

    direnv exec . npm install
    direnv exec . npm run build

`direnv exec .` works from a non-interactive shell, which the plain direnv
hook does not — that is why agents must use it explicitly rather than assuming
the environment is already loaded.
