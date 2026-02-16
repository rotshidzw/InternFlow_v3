# Implementation Playbook

## Windows watchpack/pagefile.sys issue
If Next.js watcher errors on Windows paths like `C:\pagefile.sys`, keep file watching scoped to the project and optionally enable polling:

1. In `.env`, set `WATCHPACK_POLLING=true` when native watch events are unstable.
2. `apps/web/next.config.mjs` already ignores root Windows system paths and node_modules for dev watch.
3. Restart `npm run dev` after changing watch settings.

This prevents accidental scanning of the `C:` root and avoids `pagefile.sys` permission errors.
