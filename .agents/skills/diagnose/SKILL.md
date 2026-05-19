```markdown
---
name: diagnose
description: Disciplined diagnosis loop for hard bugs and performance regressions. Reproduce → minimise → hypothesise → instrument → fix → regression-test. Use when user says "diagnose this" / "debug this", reports a bug, says something is broken/throwing/failing, or describes a performance regression.
constraints:
- All Phase 1 feedback loops MUST be machine-executable complete scripts (shell/Python/JavaScript), containing full URLs/ports, authentication information (token to be provided by human), database connection strings.
- No Phase 1 script may contain `${todo}`, `${future}`, or any commented-out functionality.
- "Actually running" in Phase 2 means the script was executed by `bash` / `python` / `node` and its output (stdout/stderr) is recorded as evidence in the current session log.
- If the Agent's environment cannot meet these constraints, it MUST explicitly state this in the Phase 1 report.
---

# Diagnose

A discipline for hard bugs. Skip phases only when explicitly justified.

When exploring the codebase, use the project's domain glossary to get a clear mental model of the relevant modules, and check ADRs in the area you're touching.

## Phase 1 — Build a feedback loop

**This is the skill.** Everything else is mechanical. If you have a fast, deterministic, agent-runnable pass/fail signal for the bug, you will find the cause — bisection, hypothesis-testing, and instrumentation all just consume that signal. If you don't have one, no amount of staring at code will save you.

Spend disproportionate effort here. **Be aggressive. Be creative. Refuse to give up.**

### Prerequisite checks before building

Before starting to build a feedback loop, verify the following three elements are in place. If any one is missing, STOP and report the specific deficiency. Do not proceed to Phase 2 with a "theoretically reproducible" claim while dependencies are unmet.

1. **[Environment ready]** 
   - Is the target service accessible? Verify with `curl -v <endpoint>`.
   - Is the database connected? Verify with `SELECT 1`.
   - Are test accounts / data available? (authentication token, seed data)
   - If missing, must use `apt install`, `docker compose up`, or similar to initialise.

2. **[Test data exists]**
   - Does the input data required by the task exist? (e.g., specific Planet configuration, Analytical Pipeline template)
   - If test data needs to be created, the creation process must be output (SQL INSERT / API POST).

3. **[Script completeness]**
   - The loop script must be a complete shell/python script. It must NOT contain placeholders like `TODO`, `...`.
   - All API endpoints must be full URLs (e.g., `https://staging.api/v2/sessions`, not `/sessions`).
   - **All commented-out code blocks must be removed or activated. No missing-implementation comments allowed.**
   - **Any polling, retry, or wait logic must be fully implemented (no "to be implemented by user" comments).**
   - **The script must be continuously executable from start to finish without manual intervention (except initial credential injection).**

4. **[Environment Dependency Assessment] — NEW: applicable to non-deterministic bugs**  
   If the triggering condition of the bug depends on uncontrolled external environment variables (e.g., network latency, load balancing, CPU contention on a shared cluster), the following must be assessed before building the loop:
   - List all critical environment parameters and their current state.
   - Evaluate whether the Agent can modify these parameters (`apt install`, config file changes, environment variables).
   - If a critical parameter is uncontrollable AND cannot be simulated via software means (e.g., injecting sleeps, `tc`), the Agent MUST immediately declare "user assistance required" and provide a specific request.
   
   **Example output for a failed assessment:**  
   ```
   Critical parameter analysis:
   - Required: Archive database latency of 150-200ms
   - Current: 50-500ms (uncontrollable)
   - Latency injection tools (tc netem) unavailable
   - Conclusion: Cannot build a reliable loop autonomously. User needs to install tc or provide a latency controller.
   ```

#### [Optional] Script blueprint review — only required under these conditions

Before writing the full script, output a flowchart of the execution plan if:

a) The script involves a complex multi-step API call chain (≥5 steps).  
b) The script includes destructive operations that could cause data pollution/deletion.  
c) The script needs to call a production environment.

**The blueprint is NOT required (and may be skipped) for:**
- Simple sequential HTTP calls (≤3 steps)
- Read-only operations
- Experimental probe scripts (need fast iteration)
- Tentative scripts for latency-sensitive bugs (need multiple rapid attempts)

The blueprint must cover at least:
- API call sequence (method, endpoint, payload)
- Assertion points (status check, field extraction)
- Loop control (5 iterations, 80% threshold check for non-deterministic bugs)
- Exit conditions (success / failure / must-stop)

If you skip this step, you MUST state the reason in the final report.

If you are at this step and the blueprint is required but the user has not confirmed it, do not proceed to writing the script.

### Ways to construct one — try them in roughly this order

1. **Failing test** at whatever seam reaches the bug — unit, integration, e2e.
2. **Curl / HTTP script** against a running dev server.
3. **CLI invocation** with a fixture input, diffing stdout against a known-good snapshot.
4. **Headless browser script** (Playwright / Puppeteer) — drives the UI, asserts on DOM/console/network.
5. **Replay a captured trace.** Save a real network request / payload / event log to disk; replay it through the code path in isolation.
6. **Throwaway harness.** Spin up a minimal subset of the system (one service, mocked deps) that exercises the bug code path with a single function call.
7. **Property / fuzz loop.** If the bug is "sometimes wrong output", run 1000 random inputs and look for the failure mode.
8. **Bisection harness.** If the bug appeared between two known states (commit, dataset, version), automate "boot at state X, check, repeat" so you can `git bisect run` it.
9. **Differential loop.** Run the same input through old-version vs new-version (or two configs) and diff outputs.
10. **HITL bash script.** Last resort. If a human must click, drive _them_ with `scripts/hitl-loop.template.sh` so the loop is still structured. Captured output feeds back to you.

#### Special case: A/B mode — for latency / race condition bugs

When environment parameters for the bug are uncontrollable, use a "multi-strategy parallel probing" approach:
- Write 2-3 scripts with different strategies simultaneously (e.g., different sleep timings, different concurrency levels, different request patterns).
- Run each script 3 times and record the success rate.
- Report which strategy performs best, then optimise based on the best performer.

**Rationale:** Avoids wasting excessive time chasing a "perfect loop". Rapidly finds the best achievable signal in the current environment.

Build the right feedback loop, and the bug is 90% fixed.

### Iterate on the loop itself

Treat the loop as a product. Once you have _a_ loop, ask:

- Can I make it faster? (Cache setup, skip unrelated init, narrow the test scope.)
- Can I make the signal sharper? (Assert on the specific symptom, not "didn't crash".)
- Can I make it more deterministic? (Pin time, seed RNG, isolate filesystem, freeze network.)

A 30-second flaky loop is barely better than no loop. A 2-second deterministic loop is a debugging superpower.

### Enforce execution evidence

After building each feedback loop, it MUST meet at least one of the following verification criteria (multiple is better). A loop that meets none of these criteria is considered incomplete.

1. **[API/DB Call Record]** Output at least one complete API request-response log, containing:
   - Request method, endpoint, request body
   - Response status code, response body
   - Session ID returned by the target system (if any)
2. **[Database Query Result]** Output at least one explicit database query statement and its return result
3. **[Log File Generation]** After the loop runs, generate a log file at a clearly specified path that can be read by `cat` or `grep`
4. **[Assertion Result]** Output an explicit pass/fail assertion result (e.g., `assert count == 1`, and `exit 1` on failure)

If the Agent cannot output any execution evidence due to environmental constraints, it MUST explicitly list the specific elements that caused the failure (e.g., missing API key, container not running, database unreachable).

#### Request-response logging standard for ALL scripts using HTTP

For every API call, the script MUST output complete request and response logs, including at minimum:
- Request method (e.g., POST, GET)
- Full endpoint URL (scheme, host, port)
- Request body (JSON payload)
- Response status code
- Response body (at least first 500 characters or key fields)
  
Format example:  
```
[REQ] POST https://api.example.com/v2/sessions | body: {"name": "test"}
[RES] 200 | body: {"session_id": "abc123", "status": "completed"}
```

#### Field extraction + assertion standard

The script MUST explicitly extract and output the following fields from the response object to stdout:
- `session_id` (if absent, output "session_id: null")
- `status` (if absent, output "status: null")

Assertion statements MUST output a clear PASS/FAIL signal using `exit 0`/`exit 1`.  
For non-deterministic bugs requiring 5 consecutive runs, each run's verdict must be output immediately after that run completes.

### Non-deterministic bugs

The goal is not a clean repro but a **higher reproduction rate**. Loop the trigger 100×, parallelise, add stress, narrow timing windows, inject sleeps. A 50%-flake bug is debuggable; 1% is not — keep raising the rate until it's debuggable.

After constructing the loop for a non-deterministic bug, it MUST meet the following standards:

1. **[Consecutive Run Requirement]** The same loop MUST be run at least 5 times consecutively, without human intervention, in a single Agent session.
2. **[Reproduction Rate Threshold]** The original bug MUST reproduce in at least 4 out of 5 runs (80%).
3. **[Time Constraint]** A single loop run, from trigger to assertion output, MUST be ≤10 seconds (parallel copies may be used to accelerate).

If the problem reproduces fewer than 4 times in 5 consecutive runs, **stop and say so explicitly**. List the reproduction status for each run (PASS/FAIL sequence), and explain why the reproduction rate cannot be further improved. At this point, the Agent should request user assistance (e.g., stress injection tools, environment variable configuration) rather than fabricating hypotheses on its own.

**Note:** Running 5 times and then "assuming a scenario where it would reproduce" is not an acceptable substitute for reproduction. Every reproduction must have actual output.

#### Execution evidence rule (replaces loose requirements)

- The script MUST actually execute, and its output (stdout/stderr) MUST be recorded as retrievable evidence in the current session.
- If execution is impossible (e.g., no API endpoint access), the Agent MUST explicitly state the specific cause of inability, rather than "assume it would have run".
- After execution completes, the Agent MUST output the full stdout/stderr text, not just a summary.

#### Mandatory stop-and-ask-for-help condition — NEW

When ALL of the following conditions are true simultaneously, you MUST stop and ask for user help:
1. You have tried at least 3 different loop-building strategies.
2. Each strategy has been run at least 5 times.
3. The critical environment control variables (e.g., network latency) have been confirmed as unmodifiable.
4. The highest success rate across all strategies is below 60%.

In this case you MUST explicitly output:
- Each strategy and its success rate
- Specific measurements of the environment's critical variables
- The specific tools or permissions you need the user to install/provide
- The estimated improvement in success rate once assistance is received

### When you genuinely cannot build a loop

Stop and say so explicitly. List what you tried. Ask the user for: (a) access to whatever environment reproduces it, (b) a captured artifact (HAR file, log dump, core dump, screen recording with timestamps), or (c) permission to add temporary production instrumentation. Do **not** proceed to hypothesise without a loop.

#### Feedback loop quality score — NEW

Score your current loop on a scale of 1–5 to determine whether it is worth proceeding to Phase 2:

- **5:** Deterministic repro, ≤2 seconds, zero manual intervention
- **4:** ≥90% reproduction rate, ≤5 seconds, only requires initial credentials
- **3:** ≥70% reproduction rate, ≤10 seconds, minor manual intervention needed
- **2:** ≥50% reproduction rate, ≤30 seconds, requires significant manual intervention
- **1:** <50% reproduction rate, requires extensive manual operation

**If score is ≤3:** Optimise the loop first before proceeding to Phase 2.  
**If score is ≤3 and you have exhausted all optimisation attempts in the current environment:** Note this in the report and explain why further improvement is not possible.

Do not proceed to Phase 2 until you have a loop you believe in.

## Phase 2 — Reproduce

Run the loop. Watch the bug appear.

Confirm:

- [ ] The loop produces the failure mode the **user** described — not a different failure that happens to be nearby. Wrong bug = wrong fix.
- [ ] The failure is reproducible across multiple runs (or, for non-deterministic bugs, reproducible at a high enough rate to debug against).
- [ ] You have captured the exact symptom (error message, wrong output, slow timing) so later phases can verify the fix actually addresses it.
- [ ] Evidence of the feedback loop script's actual execution has been recorded and output, including:
    - The script's shebang and absolute path of execution
    - Full stdout/stderr from at least one complete run
    - If external files (SQL, YAML, JSON) are referenced, confirm they were actually read (e.g., by `cat`ing them then injecting)
- [ ] The core symptom of the bug uses a clear, quantifiable assertion. For this task ("Session count"):
    - ✅ `count=$(curl ... | jq '.sessions | length'); assert $count -eq 1`
    - ❌ Fuzzy patterns like `if [[ "$output" == *"duplicate"* ]]` are NOT acceptable.

Do not proceed until you reproduce the bug.

## Phase 3 — Hypothesise

Generate **3–5 ranked hypotheses** before testing any of them. Single-hypothesis generation anchors on the first plausible idea.

Each hypothesis must be **falsifiable**: state the prediction it makes.

> Format: "If <X> is the cause, then <changing Y> will make the bug disappear / <changing Z> will make it worse."

If you cannot state the prediction, the hypothesis is a vibe — discard or sharpen it.

**Show the ranked list to the user before testing.** They often have domain knowledge that re-ranks instantly ("we just deployed a change to #3"), or know hypotheses they've already ruled out. Cheap checkpoint, big time saver. Don't block on it — proceed with your ranking if the user is AFK.

## Phase 4 — Instrument

Each probe must map to a specific prediction from Phase 3. **Change one variable at a time.**

Tool preference:

1. **Debugger / REPL inspection** if the env supports it. One breakpoint beats ten logs.
2. **Targeted logs** at the boundaries that distinguish hypotheses.
3. Never "log everything and grep".

**Tag every debug log** with a unique prefix, e.g. `[DEBUG-a4f2]`. Cleanup at the end becomes a single grep. Untagged logs survive; tagged logs die.

**Perf branch.** For performance regressions, logs are usually wrong. Instead: establish a baseline measurement (timing harness, `performance.now()`, profiler, query plan), then bisect. Measure first, fix second.

## Phase 5 — Fix + regression test

Write the regression test **before the fix** — but only if there is a **correct seam** for it.

A correct seam is one where the test exercises the **real bug pattern** as it occurs at the call site. If the only available seam is too shallow (single-caller test when the bug needs multiple callers, unit test that can't replicate the chain that triggered the bug), a regression test there gives false confidence.

**If no correct seam exists, that itself is the finding.** Note it. The codebase architecture is preventing the bug from being locked down. Flag this for the next phase.

If a correct seam exists:

1. Turn the minimised repro into a failing test at that seam.
2. Watch it fail.
3. Apply the fix.
4. Watch it pass.
5. Re-run the Phase 1 feedback loop against the original (un-minimised) scenario.

## Phase 6 — Cleanup + post-mortem

Required before declaring done:

- [ ] Original repro no longer reproduces (re-run the Phase 1 loop)
- [ ] Regression test passes (or absence of seam is documented)
- [ ] All `[DEBUG-...]` instrumentation removed (`grep` the prefix)
- [ ] Throwaway prototypes deleted (or moved to a clearly-marked debug location)
- [ ] The hypothesis that turned out correct is stated in the commit / PR message — so the next debugger learns

**Then ask: what would have prevented this bug?** If the answer involves architectural change (no good test seam, tangled callers, hidden coupling) hand off to the `/improve-codebase-architecture` skill with the specifics. Make the recommendation **after** the fix is in, not before — you have more information now than when you started.
```