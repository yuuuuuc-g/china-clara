# Issue Tracker

Work for this repo is tracked in GitHub Issues for `yuuuuuc-g/knowledge-galaxy`.

Use the GitHub CLI (`gh`) when a skill needs to create, read, label, or update issues. Infer the repo from `git remote -v`; `gh` does this automatically when run inside a clone.

## Conventions

- **Create an issue**: `gh issue create --title "..." --body "..."`
- **Read an issue**: `gh issue view <number> --comments`
- **List issues**: `gh issue list --state open --json number,title,body,labels,comments`
- **Comment on an issue**: `gh issue comment <number> --body "..."`
- **Apply / remove labels**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Close**: `gh issue close <number> --comment "..."`

Before creating a new issue, search existing open issues to avoid duplicates.

If GitHub is unavailable, write a local draft under `.scratch/` and tell the user what could not be published.
