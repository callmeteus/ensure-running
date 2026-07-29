# Publishing to npm

This package uses [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/) with GitHub Actions OIDC. No long-lived `NPM_TOKEN` is required for releases.

## Requirements (npm, 2026)

| Requirement | This repo |
|-------------|-----------|
| npm CLI >= 11.5.1 | `npm install -g npm@latest` in `publish.yml` |
| Node >= 22.14.0 for OIDC publish | Node 24 in `publish.yml` |
| GitHub-hosted runner | `ubuntu-latest` |
| `permissions.id-token: write` | Set in `publish.yml` |
| `repository.url` matches GitHub repo | Set in `package.json` |
| Public GitHub repo | Required for provenance attestations |
| Workflow filename matches npm config | `publish.yml` |

Provenance is generated automatically in CI via Trusted Publishing (OIDC). Local `npm run deploy` disables provenance with `--provenance=false` because attestations require a CI provider.

## One-time npm setup

1. Create the package on npm (first release only), or claim the name if it is yours:
   ```bash
   npm login
   npm publish
   ```
2. Open [npm package settings](https://www.npmjs.com/package/ensure-running) -> **Trusted publishing**.
3. Select **GitHub Actions** and configure:
   - **Organization or user:** `callmeteus`
   - **Repository:** `ensure-running`
   - **Workflow filename:** `publish.yml` (filename only, including `.yml`)
   - **Allowed actions:** `npm publish`
4. (Recommended) In **Publishing access**, set **Require two-factor authentication and disallow tokens** after Trusted Publishing works.

The workflow filename is case-sensitive and must match exactly.

## Release flow

1. Bump `version` in `package.json` and update `package-lock.json` if needed.
2. Commit and push to `master`.
3. Create and push a matching tag:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
4. GitHub Actions runs `.github/workflows/publish.yml`:
   - Verifies tag `vX.Y.Z` matches `package.json` version
   - Runs `npm run prepublishOnly` (lint, typecheck, coverage, build)
   - Runs `npm publish` via OIDC

## Workflows

| File | Trigger | Purpose |
|------|---------|---------|
| `.github/workflows/ci.yml` | push/PR to `master` or `main` | Lint, typecheck, tests, build on Node 20/22/24 |
| `.github/workflows/publish.yml` | push tag `v*` | Publish to npm with Trusted Publishing |

## Local publish (emergency only)

```bash
npm run deploy
```

Or after login:

```bash
npm login --registry=https://registry.npmjs.org
npm run deploy
```

If Yarn is your default package manager, its global registry may be `registry.yarnpkg.com`. This package forces `registry.npmjs.org` via `.npmrc` and `publishConfig.registry`.

Prefer tag-based CI publishes so provenance and Trusted Publishing stay consistent.

## Troubleshooting

| Error | Check |
|-------|-------|
| `ENEEDAUTH` | Trusted publisher workflow filename, repo owner/name, `id-token: write` |
| Tag/version mismatch | Tag must be `v` + exact `package.json` version |
| Provenance failed | Repo must be public; `repository.url` must match |
| `workflow_call` publish fails | npm validates the **caller** workflow name, not the reusable workflow file |

References:

- [Trusted publishing for npm packages](https://docs.npmjs.com/trusted-publishers/)
- [About npm provenance](https://docs.npmjs.com/generating-provenance-statements/)
