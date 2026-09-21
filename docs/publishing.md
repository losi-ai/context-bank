# Publishing Losi Context Bank packages

Packages are scoped **`@losi-ai/*`** in the monorepo
[`losi-ai/context-bank`](https://github.com/losi-ai/context-bank).

## Where they go

| Registry | Who installs | Auth to publish |
| --- | --- | --- |
| **npmjs.org** (primary) | npm, yarn, pnpm, bun — no special config | `NPM_TOKEN` secret (Automation token on the npm `@losi-ai` org) |
| **GitHub Packages** | needs `.npmrc` scope mapping | `GITHUB_TOKEN` in Actions (`packages: write`) |

One publish to npmjs is enough for **every** Node package manager. Yarn/pnpm/bun
all read the same registry; you do not publish separately “for yarn”.

## Consumer install (npmjs)

```bash
npm  install @losi-ai/core @losi-ai/openai
yarn add     @losi-ai/core @losi-ai/openai
pnpm add     @losi-ai/core @losi-ai/openai
bun  add     @losi-ai/core @losi-ai/openai
```

## GitHub Packages

Scope `@losi-ai` matches the GitHub org **`losi-ai`**, so GPR publish works
from this repo with `GITHUB_TOKEN`.

### Consumer install from GitHub Packages

```ini
# .npmrc
@losi-ai:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=GITHUB_PAT_CLASSIC
```

Then the same `npm` / `yarn` / `pnpm` / `bun` add commands work; the client
routes `@losi-ai/*` to GPR via `.npmrc`.

Use a classic PAT with `read:packages` (and `repo` if the package is private).

## Release steps

1. Ensure `NPM_TOKEN` is set: repo **Settings → Secrets → Actions**.
2. **Releases → Draft a new release** (tag `v0.1.0`) → Publish.
3. Workflow [publish-packages.yml](../.github/workflows/publish-packages.yml) runs:
   - build + test
   - publish all workspaces to npmjs
   - publish all workspaces to GitHub Packages

Do **not** put `"publishConfig": { "registry": "https://npm.pkg.github.com" }`
in package.json — that would send every publish to GPR and break npmjs.
The Actions job overrides `--registry` only for the GPR step.

## Local dry-run

```bash
npm run build:serial
npm publish -w @losi-ai/core --dry-run
```
