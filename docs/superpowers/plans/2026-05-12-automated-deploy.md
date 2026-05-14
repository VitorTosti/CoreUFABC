# Automated Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an automated deployment pipeline for CoreUFABC that installs dependencies, checks dependency risk, runs tests, builds the Vite site, and only then deploys production.

**Architecture:** Keep deployment logic in versioned npm scripts and GitHub Actions workflows so local and CI behavior stay aligned. Use Vercel as the primary automated deployment target via CLI and GitHub repository secrets; include a Netlify workflow variant if the project chooses Netlify later.

**Tech Stack:** React, Vite, Node.js test runner, npm, GitHub Actions, Vercel CLI, optional Netlify CLI.

---

## File Structure

- Modify: `package.json`
  - Owns automation entrypoints: dependency audit, full validation, and deployment scripts.
- Modify: `package-lock.json`
  - Captures any CLI dependency added by `npm install --save-dev`.
- Create: `.github/workflows/ci.yml`
  - Runs on pull requests and pushes to `main`; blocks regressions before merge.
- Create: `.github/workflows/deploy-vercel.yml`
  - Runs production deployment only after tests and build pass.
- Optional create: `.github/workflows/deploy-netlify.yml`
  - Alternative production deployment if CoreUFABC chooses Netlify instead of Vercel.
- Create: `docs/deployment.md`
  - Documents required secrets, branch behavior, and exact local verification commands.

## Deployment Policy

- Pull requests run install, production dependency audit, tests, and build.
- Pushes to `main` run the same verification.
- Production deploy runs only from `main`.
- Production deploy never runs before `npm test` and `npm run build`.
- Deployment credentials stay in GitHub Actions secrets, never in repository files.

## Required GitHub Secrets For Vercel

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Optional GitHub Secrets For Netlify

- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

### Task 1: Add NPM Automation Scripts

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Install deployment CLI dependency**

Run:

```powershell
npm install --save-dev vercel
```

Expected: `package.json` gains `vercel` in `devDependencies`; `package-lock.json` updates.

- [ ] **Step 2: Update scripts in `package.json`**

Replace the `scripts` object with:

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "test": "node --test",
  "audit:prod": "npm audit --omit=dev --audit-level=high",
  "check": "npm run audit:prod && npm test && npm run build",
  "deploy:vercel": "vercel deploy --prod --yes"
}
```

- [ ] **Step 3: Verify local automation path**

Run:

```powershell
npm run check
```

Expected: production audit passes, `node --test` passes, and Vite writes a production build to `dist/`.

- [ ] **Step 4: Commit**

Run:

```powershell
git add package.json package-lock.json
git commit -m "chore: add deploy automation scripts"
```

Expected: commit succeeds after the repository has an initial tracked baseline.

### Task 2: Add CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create CI workflow**

Create `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

permissions:
  contents: read

jobs:
  validate:
    name: Validate
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Audit production dependencies
        run: npm run audit:prod

      - name: Run tests
        run: npm test

      - name: Build site
        run: npm run build
```

- [ ] **Step 2: Verify YAML exists**

Run:

```powershell
Get-Content .github\workflows\ci.yml
```

Expected: file contains one `validate` job with install, audit, test, and build steps in that order.

- [ ] **Step 3: Commit**

Run:

```powershell
git add .github/workflows/ci.yml
git commit -m "ci: validate pull requests and main"
```

Expected: commit succeeds.

### Task 3: Add Vercel Production Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy-vercel.yml`

- [ ] **Step 1: Create deployment workflow**

Create `.github/workflows/deploy-vercel.yml` with:

```yaml
name: Deploy Vercel

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-vercel-production
  cancel-in-progress: false

jobs:
  deploy:
    name: Test, build, and deploy
    runs-on: ubuntu-latest

    env:
      VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
      VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Audit production dependencies
        run: npm run audit:prod

      - name: Run tests
        run: npm test

      - name: Build site
        run: npm run build

      - name: Deploy production
        run: npm run deploy:vercel -- --token=${{ secrets.VERCEL_TOKEN }}
```

- [ ] **Step 2: Check secret names**

Run:

```powershell
Select-String -Path .github\workflows\deploy-vercel.yml -Pattern "VERCEL_TOKEN","VERCEL_ORG_ID","VERCEL_PROJECT_ID"
```

Expected: all three secret names appear in the workflow.

- [ ] **Step 3: Verify local predeploy gate**

Run:

```powershell
npm run check
```

Expected: deployment gate passes locally before pushing.

- [ ] **Step 4: Commit**

Run:

```powershell
git add .github/workflows/deploy-vercel.yml
git commit -m "ci: deploy production to vercel after validation"
```

Expected: commit succeeds.

### Task 4: Document Deployment Operations

**Files:**
- Create: `docs/deployment.md`

- [ ] **Step 1: Create deployment documentation**

Create `docs/deployment.md` with:

```markdown
# Deployment

CoreUFABC deploys through GitHub Actions. Production deploys run only from `main` and only after dependency audit, tests, and production build pass.

## Local Verification

Run the complete local gate before opening a pull request:

```powershell
npm run check
```

This runs:

```powershell
npm run audit:prod
npm test
npm run build
```

## GitHub Actions

- `.github/workflows/ci.yml` validates pull requests and pushes to `main`.
- `.github/workflows/deploy-vercel.yml` deploys production from `main` after the same validation sequence.

## Required Vercel Secrets

Add these repository secrets in GitHub:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Production Deploy Rule

Do not deploy from a local machine. Push to `main` and let GitHub Actions run the production workflow.
```

- [ ] **Step 2: Confirm docs mention the gate**

Run:

```powershell
Select-String -Path docs\deployment.md -Pattern "npm run check","Do not deploy from a local machine"
```

Expected: both operational rules appear.

- [ ] **Step 3: Commit**

Run:

```powershell
git add docs/deployment.md
git commit -m "docs: document automated deployment"
```

Expected: commit succeeds.

### Task 5: Optional Netlify Variant

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `.github/workflows/deploy-netlify.yml`

- [ ] **Step 1: Install Netlify CLI only if Netlify is selected**

Run:

```powershell
npm install --save-dev netlify-cli
```

Expected: `netlify-cli` appears in `devDependencies`.

- [ ] **Step 2: Add Netlify deploy script**

Add this script to `package.json`:

```json
{
  "deploy:netlify": "netlify deploy --prod --dir=dist"
}
```

- [ ] **Step 3: Create Netlify workflow**

Create `.github/workflows/deploy-netlify.yml` with:

```yaml
name: Deploy Netlify

on:
  push:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-netlify-production
  cancel-in-progress: false

jobs:
  deploy:
    name: Test, build, and deploy
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Audit production dependencies
        run: npm run audit:prod

      - name: Run tests
        run: npm test

      - name: Build site
        run: npm run build

      - name: Deploy production
        run: npm run deploy:netlify -- --auth=${{ secrets.NETLIFY_AUTH_TOKEN }} --site=${{ secrets.NETLIFY_SITE_ID }}
```

- [ ] **Step 4: Commit**

Run:

```powershell
git add package.json package-lock.json .github/workflows/deploy-netlify.yml
git commit -m "ci: add netlify production deployment"
```

Expected: commit succeeds if Netlify is the chosen host.

## Self-Review

- Spec coverage: The plan covers package scripts, dependency security gate, CI validation, Vercel deploy, optional Netlify deploy, and deployment documentation.
- Placeholder scan: No task uses placeholder language; each file creation step includes concrete content.
- Type consistency: Script names are consistent across `package.json`, CI, deploy workflows, and documentation.
