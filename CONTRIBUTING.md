# Contributing to Markora

Thank you for your interest in contributing to Markora! We welcome contributions from the community and are excited to have you on board.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Coding Guidelines](#coding-guidelines)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind and constructive in all interactions.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/markora.git
   cd markora
   ```
3. **Add the upstream remote**:
   ```bash
   git remote add upstream git.com:Refinex-Space/markora.git
   ```

---

## Development Setup

### Prerequisites

- **Node.js** >= 20
- **Bun** >= 1.3.5 (package manager)

### Install Dependencies

```bash
bun install
```

### Start Development Server

```bash
bun dev
```

This starts the development server with hot reloading for both the web app and the markora package.

### Build

```bash
bun run build
```

### Lint & Format

```bash
# Lint all packages
bun run lint

# Format code with Prettier
bun run format
```

---

## Project Structure

This is a monorepo managed with [Turborepo](https://turbo.build/repo).

```
markora/
├── playground/
│   └── react-playground/ # Next.js web application (playground)
├── packages/
│   └── markora/          # Core library (published to npm)
│       ├── src/
│       │   ├── editor/   # CodeMirror editor integration
│       │   ├── plugins/  # Built-in plugins
│       │   └── preview/  # Static HTML renderer
│       └── package.json
├── package.json          # Root workspace config
├── turbo.json            # Turborepo config
└── README.md
```

---

## Making Changes

### Branch Naming

Use descriptive branch names:

- `feature/add-table-plugin` – New features
- `fix/image-rendering-bug` – Bug fixes
- `docs/update-readme` – Documentation
- `refactor/plugin-architecture` – Code refactoring

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add table plugin support
fix: resolve image widget rendering issue
docs: update installation instructions
refactor: simplify plugin registration
chore: update dependencies
```

### Changesets

We use [Changesets](https://github.com/changesets/changesets) for versioning. If your change affects the public API or fixes a bug, add a changeset:

```bash
bun run changeset
```

Follow the prompts to describe your changes. This creates a file in `.changeset/` that will be used to generate the changelog.

---

## Submitting a Pull Request

1. **Sync with upstream**:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Push your branch**:

   ```bash
   git push origin your-branch-name
   ```

3. **Open a Pull Request** on GitHub against the `main` branch.

4. **Fill out the PR template** with:
   - A clear description of the changes
   - Related issue numbers (if any)
   - Screenshots for UI changes

5. **Wait for review** – maintainers will review your PR and may request changes.

---

## Coding Guidelines

### TypeScript

- Use strict TypeScript – avoid `any` where possible.
- Export types from `index.ts` files.
- Use descriptive variable and function names.

### Code Style

- We use **Prettier** for formatting – run `bun run format` before committing.
- We use **ESLint** for linting – run `bun run lint` to check for issues.

### Plugins

When creating a new plugin:

1. Create a new file in `packages/markora/src/plugins/`.
2. Extend the `MarkoraPlugin` base class.
3. Export the plugin from `packages/markora/src/plugins/index.ts`.
4. Add the plugin to `allPlugins` array if it should be included by default.
5. Update documentation if needed.

### Testing

- Test your changes in the playground app (`playground/react-playground`).
- Ensure the build passes: `bun run build`.
- Ensure linting passes: `bun run lint`.

---

## Reporting Issues

Found a bug or have a feature request? [Open an issue](https://github.com/Refinex-Space/markora/issues/new) with:

- **Bug reports**: Steps to reproduce, expected behavior, actual behavior, screenshots if applicable.
- **Feature requests**: Clear description of the feature and its use case.

---

## Questions?

Feel free to open a [Discussion](https://github.com/Refinex-Space/markora/discussions) or reach out to the maintainers.

Thank you for contributing! 🎉
