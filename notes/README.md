# notes/

The primary output of AI-agent sessions in this repo. See [`../AGENTS.md`](../AGENTS.md).

The agent's default job here is to discuss, understand, explore, and communicate —
not to write code. The durable result of that work lives here, as Markdown.

## What goes in a note

- A map of how some subsystem works, with `file:line` anchors.
- Options and their tradeoffs, with a recommendation.
- What was verified versus what was inferred.
- Open questions and what's worth deciding next.

A good note lets the maintainer act without re-deriving the agent's work.

## Conventions

- One topic per file. Descriptive, kebab-case names (e.g.
  `model-loading-paths.md`, `umd-vs-esm-delivery.md`).
- Date-stamp anything time-sensitive (findings, version-specific observations) so
  a later reader knows when it was true.
- Group related notes in subdirectories as the set grows (`notes/**/*.md`).
