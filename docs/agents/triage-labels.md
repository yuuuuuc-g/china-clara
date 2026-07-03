# Triage Labels

Use these canonical triage roles and label strings:

| Role | Label |
| --- | --- |
| Maintainer needs to evaluate this issue | `needs-triage` |
| Waiting on reporter for more information | `needs-info` |
| Fully specified, ready for an AFK agent | `ready-for-agent` |
| Requires human implementation | `ready-for-human` |
| Will not be actioned | `wontfix` |

When a skill mentions a role, use the corresponding label string from this table. Do not invent duplicate labels when one of these already communicates the same state.

If the repo later adopts different GitHub label names, update this file before running `triage` or `to-issues`.
