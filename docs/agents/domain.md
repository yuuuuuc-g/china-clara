# Domain Docs

This repo uses a single-context domain documentation layout.

Read these files before architecture, debugging, or test-design work:

- `CONTEXT.md` for the project language, entities, and relationships.
- `docs/adr/` for formal architecture decisions.
- `docs/decisions/` for additional project decisions that have not been promoted to ADRs.
- `AGENTS.md` for stack, style, performance, and workflow rules.

If any of these files do not exist, proceed silently. The producer skill (`/grill-with-docs`) creates them lazily when terms or decisions get resolved.

## File Structure

```text
/
├── CONTEXT.md
├── docs/adr/
└── docs/decisions/
```

## Use The Glossary

When output names a domain concept, use the term as defined in `CONTEXT.md`. If a needed concept is missing, note it for `/grill-with-docs`.

## Preserve Decisions

If output contradicts an existing ADR or decision note, surface it explicitly instead of silently overriding it. When a decision changes project language or architecture, update `CONTEXT.md` or add an ADR/decision note in the same change.
