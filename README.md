# Naylence Core TypeScript

TypeScript/JavaScript port of the naylence-core-python project.

## Project Status

### ✅ Completed
- **Project Setup**: Full TypeScript project with build tools for both Node.js and browser compatibility
- **Address Module**: Complete port of address validation and parsing
- **Utility Modules**: ID generation with async support for browser/Node.js environments  
- **Core Configuration**: Config classes and factory patterns
- **FameFabric**: Base fabric class with context management
- **Build System**: Multi-target builds (CJS, ESM, browser)
- **Testing**: Jest setup with basic tests

### 🚧 Partially Completed
- **Core Modules**: Basic structure for FameFabric, but missing protocol, handlers, services

### ❌ Not Yet Ported
- Channel, connector, handlers modules
- Protocol (envelopes, frames, security)
- RPC system
- Service framework
- Full factory integration with naylence-factory

## Key Implementation Decisions

### 1. ID Generation Async Challenge
**Challenge**: Browser crypto APIs are async while Python's are sync.

**Solution**: Provided both sync (`generateId`) and async (`generateIdAsync`) variants:
- `generateId()`: Works synchronously in Node.js, throws in browser for fingerprint mode
- `generateIdAsync()`: Works in both environments, should be preferred

### 2. Browser/Node.js Compatibility
**Implementation**: Used feature detection instead of build-time switches:
```typescript
// Crypto detection
if (typeof crypto !== 'undefined' && crypto.subtle) {
  // Browser crypto
} else if (typeof globalThis !== 'undefined' && (globalThis as any).require) {
  // Node.js crypto
}
```

### 3. Type Safety vs Python Flexibility
**Approach**: Used Zod for runtime validation while maintaining TypeScript compile-time safety, similar to Pydantic's approach in Python.

## Usage

```typescript
import { FameAddress, generateIdAsync, FameFabric } from 'naylence-core';

// Address validation
const address = new FameAddress('service@host.domain/api/v1');

// ID generation (async recommended for browser compatibility)
const id = await generateIdAsync({ length: 16, mode: 'random' });

// Fabric usage (when fully implemented)
const fabric = await FameFabric.create({ /* config */ });
await fabric.use(async (f) => {
  // Use fabric
});
```

## Next Steps

To complete the port, the following modules need implementation:

1. **Protocol Layer** (`protocol/`):
   - `envelope.ts` - Message envelopes
   - `frames.ts` - Protocol frames
   - `security-header.ts` - Security headers

2. **Handler System** (`handlers/`):
   - `handlers.ts` - Message and RPC handlers

3. **Service Framework** (`service/`):
   - `fame-service.ts` - Service base classes
   - `capabilities.ts` - Service capabilities

4. **Channel System** (`channel/`):
   - `channel.ts` - Communication channels
   - `binding.ts` - Channel bindings

5. **Connector Framework** (`connector/`):
   - `connector.ts` - Connection management

6. **RPC System** (`rpc/`):
   - `jsonrpc.ts` - JSON-RPC implementation

## Build Targets

- **CJS**: `dist/cjs/` - CommonJS for Node.js
- **ESM**: `dist/esm/` - ES modules for modern Node.js
- **Browser**: `dist/browser/` - Browser-compatible bundle
- **Types**: `dist/types/` - TypeScript declarations

## Testing

```bash
npm test        # Run all tests
npm run build   # Build all targets
```