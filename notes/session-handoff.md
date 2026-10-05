# Session Handoff Doc

Maintain one ongoing handoff doc per session and deliver it to the user as a downloadable markdown file at every **stopping point**: after each major unit of work lands (a push, a green CI run, a finished investigation, a merged PR) or when blocked on user input. A stopping point marks a checkpoint, not the end -- send the doc, then keep working.

- Keep it in the session scratchpad / `/tmp` (e.g. `<scratchpad>/handoff.md`). It is conversation-scoped: NEVER commit it, stage it, or place it anywhere in the repo tree.
- Update the same doc in place and re-send it at each checkpoint (in hosted sessions, attach it via the file-delivery tool; locally, print its full contents to the screen along with its path), so the freshest copy sits near the bottom of the conversation.
- Write it standalone, so a brand-new session with zero context can resume from it alone: task + status (done / in progress / next), branches/PRs/issues with numbers and CI state, key decisions and discovered constraints (one-line reasons), exact next commands to run, anything waiting on the user.

Purpose: the prompt cache survives at most an hour of inactivity, so resuming a long conversation after hours away reprocesses the entire history at full cost. A current handoff doc near the end of the transcript lets the user scroll up, grab it, and start a cheap fresh session from the doc instead of resuming the stale one.
