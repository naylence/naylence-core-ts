import {
  createFameEnvelope,
  deserializeEnvelope,
  serializeEnvelope,
} from '../envelope.js';
import { FlowFlags } from '../flow.js';
import type { DataFrame } from '../frames.js';

describe('FameEnvelope flow flags', () => {
  it('accepts combined flow flag bitmasks', () => {
    const frame: DataFrame = {
      type: 'Data',
      payload: { value: 42 },
    };

    const combinedFlags = FlowFlags.SYN | FlowFlags.ACK;
    const envelope = createFameEnvelope({
      frame,
      flags: combinedFlags,
    });

    expect(envelope.flowFlags).toBe(combinedFlags);

    const serialized = serializeEnvelope(envelope);
    const parsed = deserializeEnvelope(serialized);

    expect(parsed.flowFlags).toBe(combinedFlags);
  });

  it('rejects flow flag values with unsupported bits', () => {
    const frame: DataFrame = {
      type: 'Data',
      payload: { ok: true },
    };

    const invalidFlags = FlowFlags.SYN | FlowFlags.ACK | FlowFlags.RESET | (1 << 3);
    const serialized = serializeEnvelope(
      createFameEnvelope({
        frame,
        flags: FlowFlags.NONE,
      })
    );

    expect(() =>
      deserializeEnvelope({
        ...serialized,
        flow_flags: invalidFlags,
      })
    ).toThrow('FlowFlags contains unsupported bits');
  });
});
