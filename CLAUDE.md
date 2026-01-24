Written in TypeScript and uses Node.js's native support for running TypeScript
directly.  OXC is used for formatting (oxfmt) and linting (oxlint).  Tests are
written using Node.js's builtin testing library.  See `package.json` scripts.

- Type safety is CRITICAL.
- NEVER use "any"
- NEVER use "as" casts
- NEVER use "as unknown"

When you hit surprising scenarios, DO NOT find workarounds.  Pause and surface the issue to the user.

Endeavor to keep bundle size small.  (Bundle size is not important for test files.)
