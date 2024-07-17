import type { DefinitionContext } from '../context/index';
import { DiError } from '../error';
import { Value } from '../value';
import { has, isString } from '../utils';

function getEnvVar(name: string, fallback?: string): string {
  if (has(name, process.env)) {
    return process.env[name]!;
  }

  if (isString(fallback)) {
    return fallback;
  }

  throw new DiError(`Environment variable '${name}' not found`);
}

type LookUpFn = (name: string, fallback?: string) => string;

export class EnvStr extends Value {
  public static lookUpFn: LookUpFn = getEnvVar;

  protected readonly name: string;
  protected readonly fallback?: string;

  public constructor(
    context: DefinitionContext,
    name: string,
    fallback?: string,
  ) {
    super(context);
    this.name = name;
    this.fallback = fallback;
  }

  protected async assemble(): Promise<unknown> {
    return EnvStr.lookUpFn(this.name, this.fallback);
  }
}

export class EnvBool extends EnvStr {
  protected override async assemble(): Promise<unknown> {
    const value = (await super.assemble()) as string;
    return ['true', '1', 'active', 'yes'].includes(value.toLowerCase());
  }
}

export class EnvNum extends EnvStr {
  protected override async assemble(): Promise<unknown> {
    return Number(await super.assemble());
  }
}
