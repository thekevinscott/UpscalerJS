# CI strategy & goals

_Last substantive update: 2026-06-01._

The maintainer's standing goals for CI in this repo, the principles they imply, the
current state of the workflows, and the open decisions. New CI work should be checked
against the three goals below.

## The three goals (maintainer intent, verbatim)

1. **Run only what's relevant.** Actions should run *only* when relevant changes are
   pushed. No BrowserStack run for a docs-only change.
2. **CI gates main; main is never broken.** Never be surprised by a prod failure that
   CI didn't catch. CI must effectively gate — if it's green, main works. (This was
   violated on 2026-05-30/06-01 by the docs deploy; see Incident below.)
3. **Workflows provably test what they claim.** Confidence that a workflow does what its
   name says, without manual verification each time.

**These are mostly *not* in tension.** Skipping a job is caching its pass/fail, keyed on
changed paths. For any break caused by a *changed input*, a sound (over-approximating)
path key satisfies both goals at once: if the key covers every real input of job J, then
skipping J when the key is untouched is provably safe. That's an engineering problem —
keep the key complete — not a goal conflict.

Two break-classes sit outside path filtering, but running the full suite per-PR
**doesn't catch them either**, so they aren't arguments against skipping:
- *Non-deterministic builds / upstream drift* — can break main *after* the gate goes
  green (time-of-check ≠ time-of-use). Affects every CI strategy equally. Backstop:
  hermetic builds (frozen lockfile, pinned binaries/images), not more jobs.
- *Cross-PR interactions* — two PRs green alone, broken once merged. Only a merge queue
  (test against latest main) catches it, skip or no skip. Edge case.

So the real shape: build a **sound filter** (resolves the diff-caused class), and add
**hermetic builds + a merge queue** as backstops — backstops you'd want regardless of
skipping. There is no residual case where "run everything per-PR" beats "skip soundly."
The one genuine skip-specific rule that remains: skip only on *provable* disjointness
(over-approximate), never on merely-probable irrelevance — an unsound key is the only way
skipping itself punctures Goal 2.

## What each goal requires (acceptance criteria)

### Goal 1 — relevance-scoped runs
- Per-job firing keyed to changed paths (a `changes` detector job whose outputs gate
  each downstream job).
- **Soundness rule:** a job may be skipped only when its inputs are *provably disjoint*
  from the change set. On any ambiguity, run it. Root/build/CI/lockfile changes
  (`package.json`, `pnpm-lock.yaml`, `tsconfig*`, workflow files, composite actions)
  force the full suite — these can affect anything.
- Path→job mapping must respect the real dependency graph, not surface folder names.
  E.g. the core package builds into every integration test; a non-default model only
  affects the model-suite jobs, because the lighter integrations bundle `default-model`.

### Goal 2 — CI as a true gate (the hard one)
The 2026 docs incident is the worked example of how this breaks. Rules derived from it:
- **No prod artifact may have its *only* validation run post-merge.** Anything that can
  reach production (the docs deploy, a published package) must be built/validated by a
  **required PR check before merge**. A workflow that runs only on `push: main` can
  never gate a PR — it runs after the decision is already made.
- **PR-check environment must match prod environment.** Same Node version, same install
  path, same cold-cache behaviour. Environment *drift* between the PR build and the prod
  build is itself the bug — a green PR on Node 20 told us nothing about a Node-16 deploy.
- **Required checks must actually be required, and skipped == pass.** If Goal 1 skips a
  job, branch protection must treat `skipped` as green (decided approach), AND the set of
  *required* checks must still cover every prod path. Skipping must never remove a
  required gate — only defer an irrelevant one.
- **Branch protection is the enforcement point.** `if:`-gating in YAML is necessary but
  not sufficient; the repo's branch-protection required-checks list (GitHub settings, not
  in-repo) is what makes "main is never broken" real. Keep them in sync.

### Goal 3 — provably-correct workflows
Workflow firing logic must be asserted by something other than eyeballing YAML. Options,
in ascending fidelity/cost (researched 2026-06-01, sources below):
- **Static:** [`actionlint`](https://github.com/rhysd/actionlint) — validates `if:`
  expression *syntax* and context typos. Cheap; run in CI always. Does not evaluate truth.
- **Expression-level:** [`@actions/expressions`](https://github.com/actions/languageservices)
  — GitHub's own evaluator (the engine behind their VS Code extension). Feed an `if:`
  string + a mock `needs.*.outputs` context, assert true/false. Unit-tests the gating
  logic directly. Caveat: `@actions/`-scoped but semi-internal ("not taking
  contributions"); treat the API as drift-prone.
- **End-to-end:** [`act`](https://github.com/nektos/act) / [`act-js` + `mock-github`](https://www.redhat.com/en/blog/testing-github-actions-locally)
  — runs the graph in Docker, asserts which jobs fire. Highest fidelity for "does it
  actually run," but: act uses a *reimplementation* of the expression engine (divergences
  exist, e.g. [act#841](https://github.com/nektos/act/issues/841)), and
  [`dorny/paths-filter`](https://github.com/dorny/paths-filter) needs a `git`-equipped
  runner image + a synthetic event payload to work under act.
- **Best ergonomics for "change X fires jobs Y":** extract the path→job rules into a
  small tested module (vitest) — fast, deterministic, and the test doubles as
  PR-visible documentation. `paths-filter` matches globs with **picomatch**, so a
  re-implementation would use the same matcher.

Decision on which mechanism to adopt is **open** (see below).

## Current state (verified 2026-06-01)

Four workflows in `.github/workflows/`:
- **`tests.yml`** — 14 jobs, `on: [push]`, **no path filtering** (every job runs every
  push). Jobs: lint; unit browser vite/playwright; unit node; shared unit; internals
  unit; codecov upload; integration clientside/serverside/browserstack/memory; model
  integration browser/node; build-docs. Node 20 throughout.
- **`docs.yml`** — "Deploy Docs", `on: push: branches: [main]` **only**, builds on
  **Node 16** then deploys to GitHub Pages (`actions/deploy-pages`).
- **`browserlist.yml`** — scheduled Browserslist DB update PR.
- **`pr-monitor.yml`** — `CI Gate` aggregate check (`clankerbot/pr-monitor`) on PRs.

Docs hosting = **GitHub Pages** (custom domain `upscalerjs.com` via `CNAME`), not Netlify
— `netlify.toml` is vestigial (build config commented out; only a legacy
`Cross-Origin-Embedder-Policy: require-corp` header remains). The live demo loads the
WebGL tfjs backend and does **not** require cross-origin isolation, so that header is not
a live constraint. History: moved Netlify→Pages June 2023 (#990); the driver was build
complexity (Netlify needed DVC to pull model files), eliminated Oct 2023 when DVC was
replaced by Git LFS (#1180) — so the original blocker to a preview-deploy host no longer
exists. (Netlify-return evaluation forked to a separate effort.)

## Incident: docs deploy broke main (2026-05-30 → 06-01)

PR #1321 merged green, then "Deploy Docs" failed on `main`. Root cause: `esbuild@0.25.0`
(direct dep, bumped in #1306) vs `esbuild@0.19.12` (transitive via Docusaurus); on a
**cold-cache, Node-16** fresh install the esbuild 0.25.0 `postinstall` binary check
resolved the 0.19.12 binary and aborted (`Expected "0.25.0" but got "0.19.12"`).

Why CI missed it — the Goal-2 failure, precisely:
- The job that failed (`docs.yml` build, Node 16) **only runs post-merge** — never a PR
  check.
- The PR *did* build docs, but via `tests.yml build-docs` on **Node 20**, a different
  environment that didn't reproduce the fault.
- So "docs build" was nominally covered but actually validated in the wrong environment,
  after the merge decision.

Fix direction (not the esbuild pin itself, the structural gap): validate the docs build
on PRs in the **same environment as the deploy** (align Node version; exercise the cold
install), and keep the Pages deploy as the only main-only step. Do **not** naively add
`pull_request` to `docs.yml` — its `deploy` job would push PR content to the live site
(Pages has one production environment, no per-PR previews). Either align
`tests.yml build-docs` to the deploy env, or gate `docs.yml`'s `deploy` job to
`push`+`main` while letting `build` run on PRs.

## Open decisions

- **Goal-1 skip aggressiveness** — exact path→job matrix and how conservative the
  fallbacks are. (A draft matrix + a `changes`-job implementation exists on branch
  `ci/conditional-gate-1320`, worktree `.worktrees/ci-conditional-gate-1320`, uncommitted.)
- **Goal-3 mechanism** — which testing approach to adopt (extract+vitest vs
  `@actions/expressions` unit tests vs `act-js`). Undecided.
- **Branch-protection config** — make skipped required checks count as green, and ensure
  required-checks still cover every prod path. GitHub settings, out-of-repo.
- **Docs PR validation** — align env / restructure docs build-vs-deploy so the incident
  class can't recur. Possibly subsumed by a preview-deploy host decision (forked).

## Sources
- [actions/languageservices](https://github.com/actions/languageservices) ·
  [expressions package (DeepWiki)](https://deepwiki.com/actions/languageservices/2.1-expressions-package)
- [GitHub Docs: evaluate expressions](https://docs.github.com/en/actions/reference/evaluate-expressions-in-workflows-and-actions)
- [nektos/act](https://github.com/nektos/act) · [act usage guide](https://nektosact.com/usage/index.html) · [act#841](https://github.com/nektos/act/issues/841)
- [dorny/paths-filter](https://github.com/dorny/paths-filter) (globs via picomatch)
- [act-js + mock-github (Red Hat)](https://www.redhat.com/en/blog/testing-github-actions-locally)
- [actionlint](https://github.com/rhysd/actionlint)
