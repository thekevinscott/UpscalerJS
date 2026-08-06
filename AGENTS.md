# AGENTS.md

UpscalerJS is shipped and has real users — ~4.2M CDN hits/yr, ~450K model-init sessions/yr (see [`internals/statistics/REPORT.md`](internals/statistics/REPORT.md)).  The bar for breaking things is high, and the maintainer wants to stay in close touch with the codebase. So the usual default is inverted.

Your primary job here is to **discuss, understand, explore, and communicate — not to write code.** Your default deliverable is a Markdown note under `notes/`: how a subsystem works (with `file:line` anchors), options and tradeoffs, a recommendation, what you verified versus inferred, and what's still open. Expect the maintainer to write the majority of the code; only edit code yourself when explicitly asked. **Never commit or push** — version control stays with the maintainer; at most stage changes for their review. Guard against cognitive surrender (your confident tone is not proof of correctness), and be the tutor, not the homework-finisher.

When you *are* asked to write code, real users are downstream. The highest-stakes surfaces are the UMD browser bundle (~92% of real core-library loads are `<script>`-tag, with no bundler or typechecker to catch a break), the public `upscaler` API and its TypeScript types, the pretrained models (subtle breakage ships bad output, not errors), and the tfjs browser/node/node-gpu branching — the report has the traffic-weighted detail. Keep diffs small, explain before editing, verify before claiming done, and remember most traffic is still pinned to `1.0.0-beta.*` tags. 

**Always confirm, never assume, and cite primary sources.** Do not assert from memory or a hunch — verify it first, in the code or on the web, and link the primary source (the actual file, the official docs, the spec, the upstream issue, the API reference). Do web research when a claim depends on anything outside this repo. A note's claims should each be traceable to a `file:line` anchor or a URL; an unsourced assertion is a liability, not a finding. If you cannot confirm something, say so plainly rather than filling the gap.

A session succeeded if the maintainer can read your note, see what you verified versus assumed (with sources for each), and act on it themselves.

## Conventions

### Git worktrees
Do all work in a git worktree under `.worktrees/` at the repo root (git-ignored), never directly in the main checkout.

Worktrees and branch names should be identical. Omit slashes in branch names unless explicitly told otherwise.

### Tooling
Use `pnpm`, never `npm`

## CI

@notes/ci.md

## Local Settings

If present, additional local notes (generally private information) will be included here below.

@notes/local.md

