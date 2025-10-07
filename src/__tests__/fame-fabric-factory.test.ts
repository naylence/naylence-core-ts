import {
  FameFabricFactory,
  ResourceFactory,
} from '../naylence/fame/core/fame-fabric-factory';
import { FameFabric } from '../naylence/fame/core/fame-fabric';
import { FameFabricConfig } from '../naylence/fame/core/fame-fabric-config';

describe('FameFabricFactory', () => {
  // Create minimal concrete implementations for testing the abstract factory
  class TestFameFabricFactory extends FameFabricFactory {
    public readonly type = 'test';
    public readonly isDefault = true;
    public readonly priority = 10;

    // Store the inputs for verification
    public lastConfig:
      | FameFabricConfig
      | Record<string, unknown>
      | null
      | undefined;
    public lastKwargs: unknown[] = [];

    public async create(
      config?: FameFabricConfig | Record<string, unknown> | null,
      ...kwargs: unknown[]
    ): Promise<FameFabric> {
      this.lastConfig = config;
      this.lastKwargs = kwargs;
      // Return a minimal mock that satisfies the interface
      return {} as FameFabric;
    }
  }

  // Another implementation with different properties
  class AlternativeFabricFactory extends FameFabricFactory {
    public readonly type = 'alternative';
    // isDefault and priority will use base class defaults

    public async create(
      config?: FameFabricConfig | Record<string, unknown> | null,
      ...kwargs: unknown[]
    ): Promise<FameFabric> {
      return {} as FameFabric;
    }
  }

  describe('abstract class implementation', () => {
    let testFactory: TestFameFabricFactory;
    let altFactory: AlternativeFabricFactory;

    beforeEach(() => {
      testFactory = new TestFameFabricFactory();
      altFactory = new AlternativeFabricFactory();
    });

    describe('class properties', () => {
      it('implements ResourceFactory interface correctly', () => {
        const factory: ResourceFactory<FameFabric, FameFabricConfig> =
          testFactory;

        expect(factory.type).toBe('test');
        expect(factory.isDefault).toBe(true);
        expect(factory.priority).toBe(10);
        expect(typeof factory.create).toBe('function');
      });

      it('uses default values from base class', () => {
        expect(altFactory.type).toBe('alternative');
        expect(altFactory.isDefault).toBe(false); // base class default
        expect(altFactory.priority).toBe(0); // base class default
      });

      it('allows overriding default values', () => {
        expect(testFactory.isDefault).toBe(true); // overridden
        expect(testFactory.priority).toBe(10); // overridden
      });
    });

    describe('create method with different config types', () => {
      it('creates with proper FameFabricConfig', async () => {
        const config: FameFabricConfig = {
          type: 'test-fabric',
          opts: { setting1: 'value1', setting2: 42 },
        };

        const fabric = await testFactory.create(config);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBe(config);
      });

      it('creates with null config', async () => {
        const fabric = await testFactory.create(null);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBeNull();
      });

      it('creates with undefined config', async () => {
        const fabric = await testFactory.create(undefined);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBeUndefined();
      });

      it('creates with Record config', async () => {
        const config: Record<string, unknown> = {
          customProperty: 'value',
          numericProperty: 42,
          nestedProperty: { nested: true },
        };

        const fabric = await testFactory.create(config);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBe(config);
      });

      it('passes kwargs to create method', async () => {
        const fabric = await testFactory.create(null, 'arg1', 42, {
          key: 'value',
        });

        expect(fabric).toBeDefined();
        expect(testFactory.lastKwargs).toEqual(['arg1', 42, { key: 'value' }]);
      });

      it('handles no additional arguments', async () => {
        const fabric = await testFactory.create();

        expect(fabric).toBeDefined();
        expect(testFactory.lastKwargs).toEqual([]);
      });
    });

    describe('inheritance patterns', () => {
      it('supports multiple concrete implementations', () => {
        const factories = [testFactory, altFactory];

        factories.forEach((factory) => {
          expect(factory).toBeInstanceOf(FameFabricFactory);
          expect(typeof factory.type).toBe('string');
          expect(typeof factory.isDefault).toBe('boolean');
          expect(typeof factory.priority).toBe('number');
          expect(typeof factory.create).toBe('function');
        });
      });

      it('allows factories with different configurations', () => {
        expect(testFactory.type).not.toBe(altFactory.type);
        expect(testFactory.isDefault).not.toBe(altFactory.isDefault);
        expect(testFactory.priority).not.toBe(altFactory.priority);
      });
    });

    describe('ResourceFactory interface compliance', () => {
      it('satisfies generic ResourceFactory interface', () => {
        const genericFactory: ResourceFactory = testFactory;

        expect(genericFactory.type).toBe('test');
        expect(typeof genericFactory.create).toBe('function');
      });

      it('works with factory arrays and filtering', () => {
        const factories: FameFabricFactory[] = [testFactory, altFactory];

        // Test filtering by type
        const testFactories = factories.filter((f) => f.type === 'test');
        expect(testFactories).toHaveLength(1);
        expect(testFactories[0]).toBe(testFactory);

        // Test filtering by isDefault
        const defaultFactories = factories.filter((f) => f.isDefault);
        expect(defaultFactories).toHaveLength(1);
        expect(defaultFactories[0]).toBe(testFactory);

        // Test sorting by priority
        const sortedFactories = [...factories].sort(
          (a, b) => b.priority - a.priority
        );
        expect(sortedFactories[0]).toBe(testFactory); // priority 10
        expect(sortedFactories[1]).toBe(altFactory); // priority 0
      });
    });

    describe('configuration edge cases', () => {
      it('handles minimal FameFabricConfig', async () => {
        const minimalConfig: FameFabricConfig = {
          type: 'minimal',
          opts: {},
        };

        const fabric = await testFactory.create(minimalConfig);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBe(minimalConfig);
      });

      it('handles complex FameFabricConfig', async () => {
        const fullConfig: FameFabricConfig = {
          type: 'full',
          opts: {
            scheduler: 'custom',
            registry: new Map(),
            handlers: ['handler1', 'handler2'],
          },
        };

        const fabric = await testFactory.create(fullConfig);

        expect(fabric).toBeDefined();
        expect(testFactory.lastConfig).toBe(fullConfig);
      });

      it('handles async create method properly', async () => {
        const promise = testFactory.create();
        expect(promise).toBeInstanceOf(Promise);

        const fabric = await promise;
        expect(fabric).toBeDefined();
      });

      it('handles empty kwargs array', async () => {
        await testFactory.create({});
        expect(testFactory.lastKwargs).toEqual([]);
      });

      it('handles complex kwargs combinations', async () => {
        const complexArgs = [
          null,
          undefined,
          '',
          0,
          false,
          [],
          {},
          new Date(),
          /regex/,
        ];

        await testFactory.create(null, ...complexArgs);
        expect(testFactory.lastKwargs).toEqual(complexArgs);
      });
    });
  });
});
