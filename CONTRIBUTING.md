# Contributing to liberatingscripture.org

Thanks for taking an interest in the **Liberating Scripture Collective (LSC)**
and the site that represents it. This is a small, mostly one-person project,
so contributions of any size are genuinely welcome — from a typo fix to a
collaboration idea.

## Content and mission feedback

If you've got feedback on the mission, the copy, an idea for collaboration,
scholarship, accessibility work, or art, the best way to reach out is the
[contact form](https://liberatingscripture.org/contact/). That feedback goes
directly to the team and is read personally. You don't need a GitHub account
or any technical background to do this; a plain message through the form is
perfect.

## Reporting issues or proposing changes

Technical issues (broken links, rendering bugs, accessibility problems, build
failures) are welcome as GitHub issues or pull requests here in the repo.

- **Issues**: describe what you saw, what you expected, and how to reproduce
  it if possible. A URL or screenshot helps a lot.
- **Pull requests**: small, focused PRs are easiest to review. If you're
  planning something larger (a new feature, a structural change), consider
  opening an issue first to talk it through.

## Repo internals

`CLAUDE.md` at the repo root is the deep reference for how everything fits
together: tech stack, directory layout, deployment, and conventions. It's
written for an AI coding assistant, but it's just as useful for a human
contributor getting oriented.

## Local development

```sh
npm install      # Install dependencies
npm run dev      # Start the dev server at localhost:4321
npm run check    # Type-check before opening a PR
npm run build    # Production build
```

Please run `npm run check` and `npm run build` before opening a PR — both
also run in CI, but catching issues locally first keeps review fast.
