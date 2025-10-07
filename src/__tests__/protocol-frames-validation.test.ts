import { z } from 'zod';
import {
  FameFrameSchema,
  DeliveryAckFrameSchema,
  StickinessSchema,
  AddressBindFrameSchema,
  AddressBindAckFrameSchema,
  AddressUnbindFrameSchema,
  AddressUnbindAckFrameSchema,
  NodeHeartbeatFrameSchema,
  NodeHeartbeatAckFrameSchema,
  DataFrameSchema,
  NodeHelloFrameSchema,
  NodeWelcomeFrameSchema,
  NodeAttachFrameSchema,
  NodeAttachAckFrameSchema,
  CapabilityAdvertiseFrameSchema,
  CapabilityAdvertiseAckFrameSchema,
  CapabilityWithdrawFrameSchema,
  CapabilityWithdrawAckFrameSchema,
  KeyAnnounceFrameSchema,
  KeyRequestFrameSchema,
  SecureOpenFrameSchema,
  SecureAcceptFrameSchema,
  SecureCloseFrameSchema,
  FameFrameUnionSchema,
  type FameFrame,
  type DeliveryAckFrame,
  type Stickiness,
  type AddressBindFrame,
  type AddressBindAckFrame,
  type AddressUnbindFrame,
  type AddressUnbindAckFrame,
  type NodeHeartbeatFrame,
  type NodeHeartbeatAckFrame,
  type DataFrame,
  type NodeHelloFrame,
  type NodeWelcomeFrame,
  type NodeAttachFrame,
  type NodeAttachAckFrame,
  type CapabilityAdvertiseFrame,
  type CapabilityAdvertiseAckFrame,
  type CapabilityWithdrawFrame,
  type CapabilityWithdrawAckFrame,
  type KeyAnnounceFrame,
  type KeyRequestFrame,
  type SecureOpenFrame,
  type SecureAcceptFrame,
  type SecureCloseFrame,
  type FameFrameUnion,
} from '../naylence/fame/core/protocol/frames';
import { DeliveryOriginType } from '../naylence/fame/core/protocol/origin-type';

describe('FameFrameSchema', () => {
  it('should validate basic frame structure', () => {
    const frame = { type: 'TestFrame' };
    const result = FameFrameSchema.parse(frame);
    expect(result).toEqual({ type: 'TestFrame' });
  });

  it('should require type field', () => {
    expect(() => FameFrameSchema.parse({})).toThrow();
  });
});

describe('DeliveryAckFrameSchema', () => {
  it('should create with default values', () => {
    const result = DeliveryAckFrameSchema.parse({});
    expect(result).toEqual({
      type: 'DeliveryAck',
      ok: true,
    });
  });

  it('should validate with all fields', () => {
    const frame = {
      type: 'DeliveryAck' as const,
      ok: false,
      code: 'ERROR_CODE',
      reason: 'Test reason',
      refId: 'ref-123',
    };
    const result = DeliveryAckFrameSchema.parse(frame);
    expect(result).toEqual(frame);
  });

  it('should validate with minimal fields', () => {
    const frame = { ok: false };
    const result = DeliveryAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'DeliveryAck',
      ok: false,
    });
  });
});

describe('StickinessSchema', () => {
  it('should create with default version', () => {
    const result = StickinessSchema.parse({});
    expect(result).toEqual({ version: 1 });
  });

  it('should validate all modes', () => {
    const stickiness = {
      mode: 'aft' as const,
      supportedModes: ['aft' as const, 'attr' as const],
      enabled: true,
      ttlSec: 300,
      version: 2,
    };
    const result = StickinessSchema.parse(stickiness);
    expect(result).toEqual(stickiness);
  });

  it('should validate attr mode', () => {
    const stickiness = { mode: 'attr' as const };
    const result = StickinessSchema.parse(stickiness);
    expect(result).toEqual({ mode: 'attr', version: 1 });
  });

  it('should reject invalid mode', () => {
    expect(() => StickinessSchema.parse({ mode: 'invalid' })).toThrow();
  });
});

describe('AddressBindFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should validate with required fields', () => {
    const frame = { address: validAddress };
    const result = AddressBindFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressBind',
      address: expect.any(String), // FameAddress instance
    });
    expect(result.address.toString()).toBe(validAddress);
  });

  it('should validate with optional fields', () => {
    const frame = {
      address: validAddress,
      encryptionKeyId: 'key-123',
      physicalPath: '/physical/path',
    };
    const result = AddressBindFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressBind',
      address: expect.any(String),
      encryptionKeyId: 'key-123',
      physicalPath: '/physical/path',
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('AddressBindAckFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should extend DeliveryAckFrame', () => {
    const frame = { address: validAddress };
    const result = AddressBindAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressBindAck',
      ok: true,
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });

  it('should validate with ack fields', () => {
    const frame = {
      address: validAddress,
      ok: false,
      code: 'BIND_ERROR',
      reason: 'Address already bound',
    };
    const result = AddressBindAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressBindAck',
      address: expect.any(String),
      ok: false,
      code: 'BIND_ERROR',
      reason: 'Address already bound',
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('AddressUnbindFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should validate with address', () => {
    const frame = { address: validAddress };
    const result = AddressUnbindFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressUnbind',
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('AddressUnbindAckFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should extend DeliveryAckFrame', () => {
    const frame = { address: validAddress };
    const result = AddressUnbindAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'AddressUnbindAck',
      ok: true,
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('NodeHeartbeatFrameSchema', () => {
  it('should validate with defaults', () => {
    const result = NodeHeartbeatFrameSchema.parse({});
    expect(result).toEqual({ type: 'NodeHeartbeat' });
  });

  it('should validate with all optional fields', () => {
    const frame = {
      address: 'test@localhost/test',
      systemId: 'system-123',
      payload: { custom: 'data' },
    };
    const result = NodeHeartbeatFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeHeartbeat',
      address: expect.any(String),
      systemId: 'system-123',
      payload: { custom: 'data' },
    });
    expect(result.address?.toString()).toBe('test@localhost/test');
  });
});

describe('NodeHeartbeatAckFrameSchema', () => {
  it('should extend DeliveryAckFrame', () => {
    const result = NodeHeartbeatAckFrameSchema.parse({});
    expect(result).toEqual({
      type: 'NodeHeartbeatAck',
      ok: true,
    });
  });

  it('should validate with all fields', () => {
    const frame = {
      address: 'test@localhost/test',
      routingEpoch: 'epoch-456',
      payload: { routing: 'info' },
      ok: false,
    };
    const result = NodeHeartbeatAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeHeartbeatAck',
      address: expect.any(String),
      routingEpoch: 'epoch-456',
      payload: { routing: 'info' },
      ok: false,
    });
    expect(result.address?.toString()).toBe('test@localhost/test');
  });
});

describe('DataFrameSchema', () => {
  it('should validate basic data frame', () => {
    const frame = { payload: { data: 'test' } };
    const result = DataFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'Data',
      payload: { data: 'test' },
    });
  });

  it('should validate with all fields', () => {
    const frame = {
      fid: 'frame-123',
      codec: 'json' as const,
      payload: { data: 'test' },
      pd: 'digest-hash',
      cid: 'channel-456',
    };
    const result = DataFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'Data',
      ...frame,
    });
  });

  it('should validate b64 codec', () => {
    const frame = {
      codec: 'b64' as const,
      payload: 'dGVzdA==',
    };
    const result = DataFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'Data',
      ...frame,
    });
  });

  it('should validate nonce with correct length', () => {
    // 12-byte nonce encoded as base64 (16 characters)
    const validNonce = btoa('123456789012'); // 12 bytes
    const frame = {
      payload: { data: 'test' },
      nonce: validNonce,
    };
    const result = DataFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'Data',
      payload: { data: 'test' },
      nonce: validNonce,
    });
  });

  it('should reject nonce with incorrect length', () => {
    const invalidNonce = btoa('short'); // 5 bytes, not 12
    const frame = {
      payload: { data: 'test' },
      nonce: invalidNonce,
    };
    expect(() => DataFrameSchema.parse(frame)).toThrow(
      'Nonce must be exactly 12 bytes'
    );
  });

  it('should reject invalid base64 nonce', () => {
    const frame = {
      payload: { data: 'test' },
      nonce: 'invalid-base64!',
    };
    expect(() => DataFrameSchema.parse(frame)).toThrow('Invalid base64 nonce');
  });

  it('should reject invalid codec', () => {
    const frame = {
      payload: { data: 'test' },
      codec: 'invalid',
    };
    expect(() => DataFrameSchema.parse(frame)).toThrow();
  });
});

describe('NodeHelloFrameSchema', () => {
  it('should validate with required fields', () => {
    const frame = {
      systemId: 'system-123',
      instanceId: 'instance-456',
    };
    const result = NodeHelloFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeHello',
      ...frame,
    });
  });

  it('should validate with all optional fields', () => {
    const frame = {
      systemId: 'system-123',
      logicals: ['logical1', 'logical2'],
      capabilities: ['cap1', 'cap2'],
      supportedTransports: ['tcp', 'websocket'],
      regionHint: 'us-west-2',
      instanceId: 'instance-456',
      securitySettings: {
        requireEncryption: true,
        allowedCiphers: ['AES-256'],
      },
    };
    const result = NodeHelloFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeHello',
      systemId: 'system-123',
      logicals: ['logical1', 'logical2'],
      capabilities: ['cap1', 'cap2'],
      supportedTransports: ['tcp', 'websocket'],
      regionHint: 'us-west-2',
      instanceId: 'instance-456',
      securitySettings: {
        requireEncryption: true,
        allowedCiphers: ['AES-256'],
        signingMaterial: 'raw-key', // Default value
      },
    });
  });
});

describe('NodeWelcomeFrameSchema', () => {
  it('should validate with required fields', () => {
    const frame = {
      systemId: 'system-123',
      instanceId: 'instance-456',
    };
    const result = NodeWelcomeFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeWelcome',
      ...frame,
    });
  });

  it('should validate with all optional fields', () => {
    const frame = {
      systemId: 'system-123',
      targetSystemId: 'target-789',
      targetPhysicalPath: '/target/path',
      instanceId: 'instance-456',
      assignedPath: '/assigned/path',
      acceptedCapabilities: ['cap1'],
      acceptedLogicals: ['logical1'],
      rejectedLogicals: ['logical2'],
      connectionGrants: [{ grant: 'data' }],
      expiresAt: '2024-12-01T00:00:00Z',
      metadata: { key: 'value' },
      reason: 'Welcome reason',
      securitySettings: { requireEncryption: false },
    };
    const result = NodeWelcomeFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeWelcome',
      systemId: 'system-123',
      targetSystemId: 'target-789',
      targetPhysicalPath: '/target/path',
      instanceId: 'instance-456',
      assignedPath: '/assigned/path',
      acceptedCapabilities: ['cap1'],
      acceptedLogicals: ['logical1'],
      rejectedLogicals: ['logical2'],
      connectionGrants: [{ grant: 'data' }],
      expiresAt: '2024-12-01T00:00:00Z',
      metadata: { key: 'value' },
      reason: 'Welcome reason',
      securitySettings: {
        requireEncryption: false,
        signingMaterial: 'raw-key', // Default value
      },
    });
  });

  it('should reject invalid datetime', () => {
    const frame = {
      systemId: 'system-123',
      instanceId: 'instance-456',
      expiresAt: 'invalid-date',
    };
    expect(() => NodeWelcomeFrameSchema.parse(frame)).toThrow();
  });
});

describe('NodeAttachFrameSchema', () => {
  it('should validate with required fields', () => {
    const frame = {
      systemId: 'system-123',
      instanceId: 'instance-456',
    };
    const result = NodeAttachFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeAttach',
      originType: DeliveryOriginType.DOWNSTREAM,
      ...frame,
    });
  });

  it('should validate with all optional fields', () => {
    const frame = {
      originType: DeliveryOriginType.UPSTREAM,
      systemId: 'system-123',
      instanceId: 'instance-456',
      assignedPath: '/assigned/path',
      capabilities: ['cap1', 'cap2'],
      acceptedLogicals: ['logical1'],
      keys: [{ keyId: 'key1', keyData: 'data' }],
      callbackGrants: [{ callback: 'grant' }],
      stickiness: {
        mode: 'aft' as const,
        enabled: true,
        ttlSec: 600,
      },
    };
    const result = NodeAttachFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeAttach',
      originType: DeliveryOriginType.UPSTREAM,
      systemId: 'system-123',
      instanceId: 'instance-456',
      assignedPath: '/assigned/path',
      capabilities: ['cap1', 'cap2'],
      acceptedLogicals: ['logical1'],
      keys: [{ keyId: 'key1', keyData: 'data' }],
      callbackGrants: [{ callback: 'grant' }],
      stickiness: {
        mode: 'aft',
        enabled: true,
        ttlSec: 600,
        version: 1, // Default value
      },
    });
  });

  it('should validate different origin types', () => {
    const frame = {
      originType: DeliveryOriginType.PEER,
      systemId: 'system-123',
      instanceId: 'instance-456',
    };
    const result = NodeAttachFrameSchema.parse(frame);
    expect(result.originType).toBe(DeliveryOriginType.PEER);
  });
});

describe('NodeAttachAckFrameSchema', () => {
  it('should extend DeliveryAckFrame', () => {
    const result = NodeAttachAckFrameSchema.parse({});
    expect(result).toEqual({
      type: 'NodeAttachAck',
      ok: true,
    });
  });

  it('should validate with all fields', () => {
    const frame = {
      targetSystemId: 'target-789',
      assignedPath: '/assigned/path',
      targetPhysicalPath: '/target/physical',
      routingEpoch: 'epoch-123',
      keys: [{ keyId: 'key1' }],
      expiresAt: '2024-12-01T00:00:00Z',
      stickiness: {
        mode: 'attr' as const,
        enabled: false,
      },
      ok: false,
      reason: 'Attach failed',
    };
    const result = NodeAttachAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'NodeAttachAck',
      targetSystemId: 'target-789',
      assignedPath: '/assigned/path',
      targetPhysicalPath: '/target/physical',
      routingEpoch: 'epoch-123',
      keys: [{ keyId: 'key1' }],
      expiresAt: '2024-12-01T00:00:00Z',
      stickiness: {
        mode: 'attr',
        enabled: false,
        version: 1, // Default value
      },
      ok: false,
      reason: 'Attach failed',
    });
  });
});

describe('CapabilityAdvertiseFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should validate with required fields', () => {
    const frame = {
      capabilities: ['cap1', 'cap2'],
      address: validAddress,
    };
    const result = CapabilityAdvertiseFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'CapabilityAdvertise',
      capabilities: ['cap1', 'cap2'],
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('CapabilityAdvertiseAckFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should extend DeliveryAckFrame', () => {
    const frame = {
      capabilities: ['cap1'],
      address: validAddress,
    };
    const result = CapabilityAdvertiseAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'CapabilityAdvertiseAck',
      ok: true,
      capabilities: ['cap1'],
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('CapabilityWithdrawFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should validate with required fields', () => {
    const frame = {
      capabilities: ['cap1', 'cap2'],
      address: validAddress,
    };
    const result = CapabilityWithdrawFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'CapabilityWithdraw',
      capabilities: ['cap1', 'cap2'],
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('CapabilityWithdrawAckFrameSchema', () => {
  const validAddress = 'test@localhost/test';

  it('should extend DeliveryAckFrame', () => {
    const frame = {
      capabilities: ['cap1'],
      address: validAddress,
    };
    const result = CapabilityWithdrawAckFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'CapabilityWithdrawAck',
      ok: true,
      capabilities: ['cap1'],
      address: expect.any(String),
    });
    expect(result.address.toString()).toBe(validAddress);
  });
});

describe('KeyAnnounceFrameSchema', () => {
  it('should validate with required fields', () => {
    const frame = {
      physicalPath: '/physical/path',
      keys: [{ keyId: 'key1', keyData: 'data' }],
    };
    const result = KeyAnnounceFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'KeyAnnounce',
      ...frame,
      created: expect.any(String),
    });
  });

  it('should validate with all fields', () => {
    const frame = {
      address: 'test@localhost/test',
      physicalPath: '/physical/path',
      keys: [{ keyId: 'key1' }, { keyId: 'key2' }],
      created: '2024-01-01T00:00:00Z',
      expires: '2024-12-01T00:00:00Z',
    };
    const result = KeyAnnounceFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'KeyAnnounce',
      address: expect.any(String),
      physicalPath: '/physical/path',
      keys: [{ keyId: 'key1' }, { keyId: 'key2' }],
      created: '2024-01-01T00:00:00Z',
      expires: '2024-12-01T00:00:00Z',
    });
    expect(result.address?.toString()).toBe('test@localhost/test');
  });

  it('should auto-generate created timestamp', () => {
    const frame = {
      physicalPath: '/path',
      keys: [],
    };
    const result = KeyAnnounceFrameSchema.parse(frame);
    expect(result.created).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });
});

describe('KeyRequestFrameSchema', () => {
  it('should validate with no fields', () => {
    const result = KeyRequestFrameSchema.parse({});
    expect(result).toEqual({ type: 'KeyRequest' });
  });

  it('should validate with all optional fields', () => {
    const frame = {
      kid: 'key-id-123',
      address: 'test@localhost/test',
      physicalPath: '/physical/path',
    };
    const result = KeyRequestFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'KeyRequest',
      kid: 'key-id-123',
      address: expect.any(String),
      physicalPath: '/physical/path',
    });
    expect(result.address?.toString()).toBe('test@localhost/test');
  });
});

describe('SecureOpenFrameSchema', () => {
  it('should validate with valid ephemeral key', () => {
    // Create a 32-byte key and encode it
    const keyBytes = new Array(32).fill(0).map((_, i) => i % 256);
    const keyString = String.fromCharCode(...keyBytes);
    const ephPub = btoa(keyString);

    const frame = {
      cid: 'channel-123',
      ephPub,
    };
    const result = SecureOpenFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureOpen',
      cid: 'channel-123',
      ephPub,
      alg: 'CHACHA20P1305',
      opts: 0,
    });
  });

  it('should validate with all fields', () => {
    const keyBytes = new Array(32).fill(42);
    const keyString = String.fromCharCode(...keyBytes);
    const ephPub = btoa(keyString);

    const frame = {
      cid: 'channel-456',
      ephPub,
      alg: 'AES-256-GCM',
      opts: 15,
    };
    const result = SecureOpenFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureOpen',
      ...frame,
    });
  });

  it('should reject ephemeral key with wrong length', () => {
    const shortKey = btoa('short'); // Only 5 bytes
    const frame = {
      cid: 'channel-123',
      ephPub: shortKey,
    };
    expect(() => SecureOpenFrameSchema.parse(frame)).toThrow(
      'Ephemeral public key must be exactly 32 bytes'
    );
  });

  it('should reject invalid base64 ephemeral key', () => {
    const frame = {
      cid: 'channel-123',
      ephPub: 'invalid-base64!',
    };
    expect(() => SecureOpenFrameSchema.parse(frame)).toThrow(
      'Invalid base64 ephemeral public key'
    );
  });
});

describe('SecureAcceptFrameSchema', () => {
  it('should validate with valid ephemeral key', () => {
    const keyBytes = new Array(32).fill(1);
    const keyString = String.fromCharCode(...keyBytes);
    const ephPub = btoa(keyString);

    const frame = {
      cid: 'channel-123',
      ephPub,
    };
    const result = SecureAcceptFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureAccept',
      ok: true,
      cid: 'channel-123',
      ephPub,
      alg: 'CHACHA20P1305',
    });
  });

  it('should extend DeliveryAckFrame', () => {
    const keyBytes = new Array(32).fill(2);
    const keyString = String.fromCharCode(...keyBytes);
    const ephPub = btoa(keyString);

    const frame = {
      cid: 'channel-456',
      ephPub,
      ok: false,
      code: 'CRYPTO_ERROR',
      reason: 'Key exchange failed',
    };
    const result = SecureAcceptFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureAccept',
      ...frame,
      alg: 'CHACHA20P1305',
    });
  });

  it('should reject invalid ephemeral key length', () => {
    const longKey = btoa('this-is-too-long-for-32-bytes-exactly');
    const frame = {
      cid: 'channel-123',
      ephPub: longKey,
    };
    expect(() => SecureAcceptFrameSchema.parse(frame)).toThrow(
      'Ephemeral public key must be exactly 32 bytes'
    );
  });
});

describe('SecureCloseFrameSchema', () => {
  it('should validate with required fields', () => {
    const frame = { cid: 'channel-123' };
    const result = SecureCloseFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureClose',
      cid: 'channel-123',
    });
  });

  it('should validate with optional reason', () => {
    const frame = {
      cid: 'channel-456',
      reason: 'User requested close',
    };
    const result = SecureCloseFrameSchema.parse(frame);
    expect(result).toEqual({
      type: 'SecureClose',
      ...frame,
    });
  });
});

describe('FameFrameUnionSchema', () => {
  it('should discriminate DeliveryAck frame', () => {
    const frame = { type: 'DeliveryAck', ok: true };
    const result = FameFrameUnionSchema.parse(frame);
    expect(result).toEqual(frame);
  });

  it('should discriminate Data frame', () => {
    const frame = { type: 'Data', payload: { test: 'data' } };
    const result = FameFrameUnionSchema.parse(frame);
    expect(result).toEqual(frame);
  });

  it('should discriminate NodeHello frame', () => {
    const frame = {
      type: 'NodeHello',
      systemId: 'system-123',
      instanceId: 'instance-456',
    };
    const result = FameFrameUnionSchema.parse(frame);
    expect(result).toEqual(frame);
  });

  it('should discriminate SecureOpen frame', () => {
    const keyBytes = new Array(32).fill(3);
    const keyString = String.fromCharCode(...keyBytes);
    const ephPub = btoa(keyString);

    const frame = {
      type: 'SecureOpen',
      cid: 'channel-123',
      ephPub,
    };
    const result = FameFrameUnionSchema.parse(frame);
    expect(result).toEqual({
      ...frame,
      alg: 'CHACHA20P1305',
      opts: 0,
    });
  });

  it('should reject unknown frame type', () => {
    const frame = { type: 'UnknownFrame', data: 'test' };
    expect(() => FameFrameUnionSchema.parse(frame)).toThrow();
  });

  it('should discriminate all frame types correctly', () => {
    const frameTypes = [
      'DeliveryAck',
      'AddressBind',
      'AddressBindAck',
      'AddressUnbind',
      'AddressUnbindAck',
      'NodeHeartbeat',
      'NodeHeartbeatAck',
      'Data',
      'NodeHello',
      'NodeWelcome',
      'NodeAttach',
      'NodeAttachAck',
      'CapabilityAdvertise',
      'CapabilityAdvertiseAck',
      'CapabilityWithdraw',
      'CapabilityWithdrawAck',
      'KeyAnnounce',
      'KeyRequest',
      'SecureOpen',
      'SecureAccept',
      'SecureClose',
    ];

    frameTypes.forEach((type) => {
      let frame: Record<string, unknown> = { type };

      // Add required fields for specific frame types
      if (
        type === 'AddressBind' ||
        type === 'AddressBindAck' ||
        type === 'AddressUnbind' ||
        type === 'AddressUnbindAck' ||
        type === 'CapabilityAdvertise' ||
        type === 'CapabilityAdvertiseAck' ||
        type === 'CapabilityWithdraw' ||
        type === 'CapabilityWithdrawAck'
      ) {
        frame.address = 'test@localhost/test';
      }

      if (
        type === 'CapabilityAdvertise' ||
        type === 'CapabilityAdvertiseAck' ||
        type === 'CapabilityWithdraw' ||
        type === 'CapabilityWithdrawAck'
      ) {
        frame.capabilities = ['test-cap'];
      }

      if (type === 'Data') {
        frame.payload = { test: 'data' };
      }

      if (
        type === 'NodeHello' ||
        type === 'NodeWelcome' ||
        type === 'NodeAttach'
      ) {
        frame.systemId = 'system-123';
        frame.instanceId = 'instance-456';
      }

      if (type === 'KeyAnnounce') {
        frame.physicalPath = '/path';
        frame.keys = [];
      }

      if (type === 'SecureOpen' || type === 'SecureAccept') {
        frame.cid = 'channel-123';
        const keyBytes = new Array(32).fill(4);
        const keyString = String.fromCharCode(...keyBytes);
        frame.ephPub = btoa(keyString);
      }

      if (type === 'SecureClose') {
        frame.cid = 'channel-123';
      }

      const result = FameFrameUnionSchema.parse(frame);
      expect(result.type).toBe(type);
    });
  });
});
