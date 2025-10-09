/**
 * Converts a camelCase or PascalCase string to snake_case.
 *
 * @param name - The string to convert
 * @returns The snake_case version of the input string
 *
 * @example
 * camelToSnake('camelCase') // 'camel_case'
 * camelToSnake('PascalCase') // 'pascal_case'
 * camelToSnake('IOError') // 'io_error'
 */
export function camelToSnake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();
}

/**
 * Converts a snake_case string to camelCase.
 *
 * @param name - The string to convert
 * @returns The camelCase version of the input string
 *
 * @example
 * snakeToCamel('snake_case') // 'snakeCase'
 * snakeToCamel('hello_world') // 'helloWorld'
 */
export function snakeToCamel(name: string): string {
  return name.replace(/_([a-z])/g, (_match, char: string) =>
    char.toUpperCase()
  );
}

/**
 * Recursively converts all keys in an object from snake_case to camelCase.
 *
 * @param obj - The object to convert (can be any value)
 * @returns A new object with all keys converted to camelCase
 *
 * @example
 * snakeToCamelObject({ hello_world: 'test' }) // { helloWorld: 'test' }
 * snakeToCamelObject({ nested_obj: { inner_key: 'value' } }) // { nestedObj: { innerKey: 'value' } }
 */
export function snakeToCamelObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeToCamelObject);

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const camelKey = snakeToCamel(key);
    acc[camelKey] = snakeToCamelObject(value);
    return acc;
  }, {} as any);
}

/**
 * Recursively converts all keys in an object from camelCase to snake_case.
 *
 * @param obj - The object to convert (can be any value)
 * @returns A new object with all keys converted to snake_case
 *
 * @example
 * camelToSnakeObject({ helloWorld: 'test' }) // { hello_world: 'test' }
 * camelToSnakeObject({ nestedObj: { innerKey: 'value' } }) // { nested_obj: { inner_key: 'value' } }
 */
export function camelToSnakeObject(obj: any): any {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelToSnakeObject);

  return Object.entries(obj).reduce((acc, [key, value]) => {
    const snakeKey = camelToSnake(key);
    acc[snakeKey] = camelToSnakeObject(value);
    return acc;
  }, {} as any);
}
