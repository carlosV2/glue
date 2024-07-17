import { DefinitionContext } from './context/index';
import { DiError } from './error';
import { UnknownServiceTypeError } from './error/service';
import { Tag } from './service';
import {
  Maybe,
  getCallerFile,
  has,
  isArray,
  isDictionary,
  isFirstChar,
  isString,
} from './utils';

export type Call<T> = { method: T; params: T[] };

export abstract class Processor<T> {
  protected abstract glob(pattern: string): string[];
  protected abstract getFullPath(
    baseFile: string,
    relative: string,
    shouldExist?: boolean,
  ): string;
  protected abstract readContents(path: string): string;

  protected abstract serialise(path: string, data: unknown): string;
  protected abstract deserialise(path: string, data: string): unknown;

  protected abstract addExtend(path: string): void;
  protected abstract addParameter(id: string, parameter: T): void;
  protected abstract addAlias(id: string, alias: T): void;
  protected abstract addService(id: string, service: T): void;

  public fromPaths(pattern: string): void {
    let fullPattern = pattern;
    if (!fullPattern.startsWith('/')) {
      const base = getCallerFile();
      if (!base) {
        throw new DiError('The caller file could not be determined');
      }

      fullPattern = this.getFullPath(base, pattern);
    }

    this.glob(fullPattern).forEach(this.fromPath.bind(this));
  }

  public fromPath(path: string): void {
    this.fromContent(path, this.readContents(path));
  }

  public fromContent(path: string, content: string): void {
    this.fromData(path, this.deserialise(path, content));
  }

  public fromData(path: string, content: unknown): void {
    if (!isDictionary(content)) {
      throw new DiError(
        `The contents of the path \`${path}\` must represent an object`,
      );
    }

    if (has('extends', content)) {
      if (!isArray(content['extends'])) {
        throw new DiError(
          `The extends section in the path \`${path}\` must represent an array`,
        );
      }

      const context = new DefinitionContext(path, 'ignore', 'ignore');
      content['extends'].forEach(extension => {
        if (!isString(extension)) {
          throw new DiError(
            `Each extended file must add as an string in the path \`${path}\``,
          );
        }

        this.addExtend(this.getFullPath(context.getPath(), extension));
      });
    }

    if (has('parameters', content)) {
      if (!isDictionary(content['parameters'])) {
        throw new DiError(
          `The parameters section in the path \`${path}\` must represent an object`,
        );
      }

      Object.entries(content['parameters']).forEach(([id, value]) => {
        const definition = this.serialise(path, value);
        const context = new DefinitionContext(path, id, definition);
        this.addParameter(id, this.parseValue(context, value));
      });
    }

    if (has('services', content)) {
      if (!isDictionary(content['services'])) {
        throw new DiError(
          `The services section in the path \`${path}\` must represent an object`,
        );
      }

      Object.entries(content['services']).forEach(([id, value]) => {
        const definition = this.serialise(path, value);
        const context = new DefinitionContext(path, id, definition);

        if (isString(value)) {
          this.addAlias(id, this.parseAlias(context, value));
        } else {
          this.addService(id, this.parseService(context, value));
        }
      });
    }
  }

  protected abstract processEnvStrValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): T;
  protected abstract processEnvBoolValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): T;
  protected abstract processEnvNumValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): T;
  protected abstract processEvalValue(
    context: DefinitionContext,
    code: string,
  ): T;
  protected abstract processLiteralValue(
    context: DefinitionContext,
    value: unknown,
  ): T;
  protected abstract processParameterValue(
    context: DefinitionContext,
    id: string,
  ): T;
  protected abstract processServiceValue(
    context: DefinitionContext,
    id: string,
  ): T;
  protected abstract processSymbolValue(
    context: DefinitionContext,
    path: string,
    name: Maybe<string>,
  ): T;
  protected abstract processTagListValue(
    context: DefinitionContext,
    name: string,
  ): T;
  protected abstract processTagObjectValue(
    context: DefinitionContext,
    name: string,
  ): T;

  protected parseValue(context: DefinitionContext, value: unknown): T {
    if (isArray(value)) {
      return this.processLiteralValue(
        context,
        value.map(item => this.parseValue(context, item)),
      );
    }

    if (isDictionary(value)) {
      if (has('symbol', value)) {
        return this.parseService(context, value);
      }

      if (has('_symbol', value)) {
        value['symbol'] = value['_symbol'];
      }

      return this.processLiteralValue(
        context,
        Object.fromEntries(
          Object.entries(value).map(([key, item]) => [
            key,
            this.parseValue(context, item),
          ]),
        ),
      );
    }

    if (isString(value)) {
      if (isFirstChar(value, '<')) {
        return this.processServiceValue(context, value.substring(1));
      } else if (isFirstChar(value, '$')) {
        return this.processParameterValue(context, value.substring(1));
      } else if (isFirstChar(value, '>')) {
        return this.processTagListValue(context, value.substring(1));
      } else if (isFirstChar(value, '}')) {
        return this.processTagObjectValue(context, value.substring(1));
      } else if (isFirstChar(value, '%')) {
        const [name, declaredType, ...values] = value.substring(1).split('/');
        const type = declaredType ?? 's';
        const fallback = values.length > 0 ? values.join('/') : undefined;

        if (type === 's') {
          return this.processEnvStrValue(context, name, fallback);
        } else if (type === 'b') {
          return this.processEnvBoolValue(context, name, fallback);
        } else if (type === 'n') {
          return this.processEnvNumValue(context, name, fallback);
        } else {
          throw new DiError(
            'Unknown environment variable type while parsing',
            context,
          );
        }
      } else if (isFirstChar(value, '!')) {
        return this.processEvalValue(context, value);
      } else if (isFirstChar(value, '(')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, path, name] = value.match(/^\(([^\)]+)(?:\)(.*))?$/)!;
        return this.processSymbolValue(context, path, name);
      } else if (isFirstChar(value, '[')) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, pattern, name] = value.match(/^\[([^\]]+)(?:\](.*))?$/)!;
        const fullPattern = this.getFullPath(context.getPath(), pattern, false);

        return this.processLiteralValue(
          context,
          this.glob(fullPattern).map(path => {
            return this.processSymbolValue(context, path, name);
          }),
        );
      } else {
        return this.processLiteralValue(context, value);
      }
    }

    return this.processLiteralValue(context, value);
  }

  protected abstract processAlias(
    context: DefinitionContext,
    aliased: string,
  ): T;

  protected parseAlias(context: DefinitionContext, value: unknown) {
    if (!isString(value)) {
      throw new DiError('A string definition was expected', context);
    }

    return this.processAlias(context, value);
  }

  protected abstract processConstructorService(
    context: DefinitionContext,
    symbol: T,
    args: T[],
    scope: Maybe<string>,
    tags: Tag[],
    calls: Call<T>[],
  ): T;
  protected abstract processFactoryService(
    context: DefinitionContext,
    symbol: T,
    factory: T,
    args: T[],
    scope: Maybe<string>,
    tags: Tag[],
    calls: Call<T>[],
  ): T;
  protected abstract processPropertyService(
    context: DefinitionContext,
    symbol: T,
    property: T,
    scope: Maybe<string>,
    tags: Tag[],
    calls: Call<T>[],
  ): T;

  private parseTag(context: DefinitionContext, value: unknown): Tag {
    if (isString(value)) {
      return { name: value };
    }

    if (isDictionary(value)) {
      if (!has('name', value)) {
        throw new DiError('POJO tags must have the `name` key.', context);
      }

      return value as Tag;
    }

    throw new DiError('Tags must be defined as strings or POJOs.', context);
  }

  private parseCall(context: DefinitionContext, value: unknown): Call<T> {
    if (isString(value)) {
      return { method: this.parseValue(context, value), params: [] };
    }

    if (isDictionary(value)) {
      if (!has('method', value)) {
        throw new DiError('POJO calls must have the `method` key.', context);
      }

      const method = this.parseValue(context, value['method']);
      const params = value['params'] ?? [];
      if (!isArray(params)) {
        throw new DiError(
          'Service call parameters must be an array of values.',
          context,
        );
      }

      return {
        method,
        params: params.map(param => this.parseValue(context, param)),
      };
    }

    throw new DiError('Calls must be defined as strings or POJOs.', context);
  }

  protected parseService(context: DefinitionContext, value: unknown): T {
    if (!isDictionary(value)) {
      throw new DiError('A service can only be created from a POJO', context);
    }

    if (!has('symbol', value)) {
      throw new DiError(
        'A service must declare the `symbol` property.',
        context,
      );
    }

    const symbol = this.parseValue(context, value['symbol']);
    const scope = value['scope'] as Maybe<string>;

    let tags: Tag[] = [];
    if (has('tags', value)) {
      if (!isArray(value['tags'])) {
        throw new DiError('Service tags must be an array of tags.', context);
      }

      tags = value['tags'].map(tag => this.parseTag(context, tag));
    }

    let calls: Call<T>[] = [];
    if (has('calls', value)) {
      if (!isArray(value['calls'])) {
        throw new DiError('Service calls must be an array of calls.', context);
      }

      calls = value['calls'].map(call => this.parseCall(context, call));
    }

    if (!has('factory', value) && !has('property', value)) {
      const args = ((value['args'] as Maybe<unknown[]>) ?? []).map(arg =>
        this.parseValue(context, arg),
      );

      return this.processConstructorService(
        context,
        symbol,
        args,
        scope,
        tags,
        calls,
      );
    } else if (has('factory', value) && !has('property', value)) {
      const factory = this.parseValue(context, value['factory']);
      const args = ((value['args'] as Maybe<unknown[]>) ?? []).map(arg =>
        this.parseValue(context, arg),
      );

      return this.processFactoryService(
        context,
        symbol,
        factory,
        args,
        scope,
        tags,
        calls,
      );
    } else if (!has('factory', value) && has('property', value)) {
      const property = this.parseValue(context, value['property']);

      return this.processPropertyService(
        context,
        symbol,
        property,
        scope,
        tags,
        calls,
      );
    } else {
      throw new UnknownServiceTypeError(context);
    }
  }
}
