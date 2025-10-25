[![Join our Discord](https://img.shields.io/badge/Discord-Join%20Chat-blue?logo=discord)](https://discord.gg/nwZAeqdv7y)

# Naylence Fame Core

**Fame Core** is the low-level messaging backbone for the [Naylence](https://github.com/naylence) platform, providing the essential types, protocols, and interfaces for high-performance, addressable, and semantically routable message passing between AI agents and services.

> Part of the Naylence stack. See the full platform [here](https://github.com/naylence).

## Development & Publishing

This project uses npm for dependency management and GitHub Actions for automated testing and publishing.

### Local Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Run linting
npm run lint

# Build package
npm run build
```

#### Using local sibling dependencies during development

This project depends on `naylence-factory`. In development, you can point npm to a local checkout without changing `package.json`:

```bash
# Option A: temporary override using npm link
cd ../naylence-factory-ts
npm link
cd ../naylence-core-ts
npm link naylence-factoria

# Option B: direct path in package.json (temporary)
npm install ../naylence-factory-ts

# Option C: using file: protocol
npm install --save-dev file:../naylence-factory-ts
```

When committing, keep `package.json` referencing the normal package (not the local path). CI will install from npm registry via configured sources.

### Publishing

- **Automatic**: Create a GitHub release to automatically publish to npm
- **Manual**: Use the "Publish to npm" workflow dispatch to publish to npm test registry or npm
- **Local**: Use `npm publish --registry https://registry.npmjs.org/` for local testing
