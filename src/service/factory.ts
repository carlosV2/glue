import type { Buildable } from '../buildable';
import type { DefinitionContext, RunningContext } from '../context/index';
import { type Dictionary, type Callable, Maybe } from '../utils';
import { Service, type Tag } from '../service';

export class Factory extends Service {
  private readonly symbol: Buildable;
  private readonly factory: Buildable;
  private readonly args: Buildable[];

  public constructor(
    symbol: Buildable,
    factory: Buildable,
    args: Buildable[],
    context: DefinitionContext,
    scope: Maybe<string>,
    tags: Tag[],
    calls: { method: Buildable; params: Buildable[] }[],
  ) {
    super(context, scope, tags, calls);
    this.symbol = symbol;
    this.factory = factory;
    this.args = args;
  }

  protected async instantiate(context: RunningContext): Promise<unknown> {
    const symbol = (await this.symbol.build(context)) as Dictionary;
    const factory = (await this.factory.build(context)) as string;
    const fn = (symbol[factory] as Callable).bind(symbol);
    const args = await Promise.all(this.args.map(arg => arg.build(context)));

    return await fn(...args);
  }
}
