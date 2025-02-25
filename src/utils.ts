export type Maybe<T> = T | undefined;
export type Dictionary<T = unknown> = Record<string, T>;
export type Constructable = new (...args: unknown[]) => unknown;
export type Callable = (...args: unknown[]) => unknown;
export type ImportDeclaration = 'named' | 'default' | 'module';

export const library = '@carlosv2/glue';

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isSymbol(value: unknown): value is symbol {
  return typeof value === 'symbol';
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

export function isObject(value: unknown): value is object {
  return !isNull(value) && typeof value === 'object';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isUndefined(value: unknown): value is undefined {
  return typeof value === 'undefined';
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isDictionary(value: unknown): value is Dictionary {
  return isObject(value) && value.constructor.name === 'Object';
}

export function zip<T, Y>([ts, ys]: [T[], Y[]]): [T, Y][] {
  const length = Math.min(ts.length, ys.length);

  const result: [T, Y][] = [];
  for (let i = 0; i < length; i++) {
    result.push([ts[i], ys[i]]);
  }

  return result;
}

export function zipObject<V>(keys: string[], values: V[]): Dictionary<V> {
  return Object.fromEntries(zip([keys, values]));
}

export function unzip<T, Y>(data: [T, Y][]): [T[], Y[]] {
  const ts: T[] = [];
  const ys: Y[] = [];

  data.forEach(([t, y]) => {
    ts.push(t);
    ys.push(y);
  });

  return [ts, ys];
}

export function has(key: string | symbol, obj: Dictionary): boolean {
  return key in obj;
}

export function gibberish(length: number): string {
  const generate = () => Math.random().toString(36).substring(2);

  let result = '';
  while (result.length < length) result += generate();
  return result.substring(0, length);
}

export function uniq<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export function isFirstChar(value: string, char: string): boolean {
  return (
    value.length > 1 && value.charAt(0) === char && value.charAt(1) !== char
  );
}

export function getCallerFile(): Maybe<string> {
  const oldPrepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  const stack = new Error().stack;
  Error.prepareStackTrace = oldPrepareStackTrace;

  if (stack !== null && typeof stack === 'object') {
    return stack[3] ? (stack[3] as any).getFileName() : undefined;
  }

  return undefined;
}

export async function resolvePromises<T>(
  obj: Dictionary<Promise<T>>,
): Promise<Dictionary<T>> {
  const [keys, promises] = unzip(Object.entries(obj));
  const values = await Promise.all(promises);
  return zipObject(keys, values);
}
