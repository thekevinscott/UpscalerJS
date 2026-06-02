# CI strategy & goals

1. **Run only what's relevant.** Actions should run *only* when relevant changes are pushed.
2. **CI gates main; main is never broken.** Never be surprised by a prod failure that CI didn't catch. CI must effectively gate — if it's green, main works.
3. **Workflows provably test what they claim.** Confidence that a workflow does what its name says, without manual verification each time.

Skipping a job is caching its pass/fail, keyed on changed paths. For any break caused by a *changed input*, a sound (over-approximating) path key satisfies both goals at once: if the key covers every real input of job J, then skipping J when the key is untouched is provably safe.

