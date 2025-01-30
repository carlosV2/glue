import { Alias } from '../alias';
import { Buildable } from '../buildable';
import { DefinitionContext } from '../context/index';
import { Call, Processor } from '../processor';
import { Service, Tag } from '../service';
import { Constructor, Factory, Property } from '../service/index';
import { Dictionary, Maybe, has, isFunction, isString } from '../utils';
import {
  EnvStr,
  EnvBool,
  EnvNum,
  Eval,
  Literal,
  Service as ServiceValue,
  Parameter,
  Symbol as SymbolValue,
  TagList,
  TagObject,
} from '../value/index';
import { DiError } from '../error';
import { Value } from '../value';
import { ParameterNotFoundError } from '../error/parameter';
import { AliasNotFoundError } from '../error/alias';
import { ServiceNotFoundError } from '../error/service';
import { AssemblingContainer, FallbackContainer } from '../container/index';
import type { Container } from '../container';

export abstract class Loader extends Processor<Buildable> {
  private readonly defaultScope: string | symbol;
  private readonly parameters: Dictionary<Value>;
  private readonly aliases: Dictionary<Alias>;
  private readonly services: Record<string | symbol, Dictionary<Service>>;

  public constructor(defaultScope?: string) {
    super();
    this.defaultScope = defaultScope ?? Symbol();
    this.parameters = {};
    this.aliases = {};
    this.services = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected glob(_: string): string[] {
    throw new DiError(
      "Unfortunately, Loaders don't have this functionality. Please, use a Compiler instead.",
    );
  }

  protected getFullPath(baseFile: string, relative: string): string {
    return `${baseFile.replace(/\/[^/]*$/, '')}/${relative}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected readContents(_: string): string {
    throw new DiError(
      "Unfortunately, Loaders don't have this functionality. Please, use a Compiler instead.",
    );
  }

  private async importPath(
    baseFile: string,
    relative: string,
  ): Promise<Dictionary> {
    let path = this.getFullPath(baseFile, relative);
    if (path.endsWith('.ts') || path.endsWith('js')) {
      path = path.substring(0, path.length - 3);
    }

    return import(/* @vite-ignore */ path);
  }

  protected addExtend(path: string): void {
    this.fromPath(path);
  }

  public addParameter(id: string, definition: Value): void {
    this.parameters[id] = definition;
  }

  public hasParameter(id: string): boolean {
    return has(id, this.parameters);
  }

  public getParameter(id: string): Value {
    if (has(id, this.parameters)) {
      return this.parameters[id];
    }

    throw new ParameterNotFoundError(id);
  }

  public getAllParameters(): string[] {
    return Object.keys(this.parameters);
  }

  public removeParameter(id: string): void {
    delete this.parameters[id];
  }

  public addAlias(id: string, definition: Alias): void {
    this.aliases[id] = definition;
  }

  public hasAlias(id: string): boolean {
    return has(id, this.aliases);
  }

  public getAlias(id: string): Alias {
    if (has(id, this.aliases)) {
      return this.aliases[id];
    }

    throw new AliasNotFoundError(id);
  }

  public getAllAliases(): string[] {
    return Object.keys(this.aliases);
  }

  public removeAlias(id: string): void {
    delete this.aliases[id];
  }

  public addService(id: string, definition: Service): void {
    this.removeService(id);

    const scope = definition.getScope() ?? this.defaultScope;
    if (!has(scope, this.services)) {
      this.services[scope] = {};
    }

    this.services[scope][id] = definition;
  }

  public hasService(id: string): boolean {
    return Object.values(this.services).some(services => has(id, services));
  }

  public getService(id: string): Service {
    for (const scope of Object.keys(this.services)) {
      if (has(id, this.services[scope])) {
        return this.services[scope][id];
      }
    }

    throw new ServiceNotFoundError(id);
  }

  public getAllServices(): string[] {
    return Object.values(this.services)
      .map(services => Object.keys(services))
      .flat();
  }

  public removeService(id: string): void {
    for (const scope of Object.keys(this.services)) {
      delete this.services[scope][id];
    }
  }

  protected processEnvStrValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Buildable {
    return new EnvStr(context, name, fallback);
  }

  protected processEnvBoolValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Buildable {
    return new EnvBool(context, name, fallback);
  }

  protected processEnvNumValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Buildable {
    return new EnvNum(context, name, fallback);
  }

  protected processEvalValue(
    context: DefinitionContext,
    code: string,
  ): Buildable {
    return new Eval(context, code);
  }

  protected processLiteralValue(
    context: DefinitionContext,
    value: unknown,
  ): Buildable {
    return new Literal(context, value);
  }

  protected processParameterValue(
    context: DefinitionContext,
    id: string,
  ): Buildable {
    return new Parameter(context, id);
  }

  protected processServiceValue(
    context: DefinitionContext,
    id: string,
  ): Buildable {
    return new ServiceValue(context, id);
  }

  private isClass(value: unknown): boolean {
    if (!isFunction(value)) {
      return false;
    }

    const representation = value.toString();
    return (
      representation.startsWith('class ') ||
      representation.startsWith('class{') ||
      [String(Object), String(Date), String(Error)].includes(representation)
    );
  }

  private isFunc(value: unknown): boolean {
    return isFunction(value) && !this.isClass(value);
  }

  private getTheOnlyOne(
    context: DefinitionContext,
    haystack: Dictionary,
    filter: (value: unknown) => boolean,
  ): unknown {
    let token: unknown = undefined;
    for (const value of Object.values(haystack)) {
      if (filter(value)) {
        if (token) {
          throw new DiError('Multiple exported symbols where found', context);
        } else {
          token = value;
        }
      }
    }

    if (token) {
      return token;
    }

    throw new DiError('A suitable exported symbol was not found', context);
  }

  protected processSymbolValue(
    context: DefinitionContext,
    path: string,
    name: Maybe<string>,
  ): Buildable {
    // Importing module. For example: (my/path
    if (!isString(name)) {
      return new SymbolValue(context, this.importPath(context.getPath(), path));
    }

    // Importing the default symbol. For example: (my/path)
    if (name.length === 0) {
      return new SymbolValue(
        context,
        this.importPath(context.getPath(), path).then(
          module => module['default'],
        ),
      );
    }

    // Importing the only exported symbol. For example: (my/path)~
    if (name === '~') {
      return new SymbolValue(
        context,
        this.importPath(context.getPath(), path).then(module =>
          this.getTheOnlyOne(context, module, () => true),
        ),
      );
    }

    // Importing the only exported class. For example: (my/path)~class
    if (name === '~class') {
      return new SymbolValue(
        context,
        this.importPath(context.getPath(), path).then(module =>
          this.getTheOnlyOne(context, module, this.isClass.bind(this)),
        ),
      );
    }

    // Importing the only exported function. For example: (my/path)~func
    if (name === '~func') {
      return new SymbolValue(
        context,
        this.importPath(context.getPath(), path).then(module =>
          this.getTheOnlyOne(context, module, this.isFunc.bind(this)),
        ),
      );
    }

    // Importing the symbol found before or a known one. For example: (my/path)MyObj
    return new SymbolValue(
      context,
      this.importPath(context.getPath(), path).then(module => module[name]),
    );
  }

  protected processTagListValue(
    context: DefinitionContext,
    name: string,
  ): Buildable {
    return new TagList(context, name);
  }

  protected processTagObjectValue(
    context: DefinitionContext,
    name: string,
  ): Buildable {
    return new TagObject(context, name);
  }

  protected processAlias(
    context: DefinitionContext,
    aliased: string,
  ): Buildable {
    return new Alias(context, aliased);
  }

  protected processConstructorService(
    context: DefinitionContext,
    symbol: Buildable,
    args: Buildable[],
    scope: string,
    tags: Tag[],
    calls: Call<Buildable>[],
  ): Buildable {
    return new Constructor(symbol, args, context, scope, tags, calls);
  }

  protected processFactoryService(
    context: DefinitionContext,
    symbol: Buildable,
    factory: Buildable,
    args: Buildable[],
    scope: string,
    tags: Tag[],
    calls: Call<Buildable>[],
  ): Buildable {
    return new Factory(symbol, factory, args, context, scope, tags, calls);
  }

  protected processPropertyService(
    context: DefinitionContext,
    symbol: Buildable,
    property: Buildable,
    scope: string,
    tags: Tag[],
    calls: Call<Buildable>[],
  ): Buildable {
    return new Property(symbol, property, context, scope, tags, calls);
  }

  public getContainer(scope?: string, parent?: Container): Container {
    const containerScope = scope ?? this.defaultScope;

    const params = this.parameters;
    const aliases = this.aliases;
    const services = this.services[containerScope] ?? {};

    const container = new AssemblingContainer(params, aliases, services);
    if (parent) {
      return new FallbackContainer(container, parent);
    }

    return container;
  }
}
