import type { Buildable } from '../buildable';
import type { DefinitionContext, RunningContext } from '../context/index';
import type { Constructable, Maybe } from '../utils';
import { Service, type Tag } from '../service';

export class Constructor extends Service {
  private readonly symbol: Buildable;
  private readonly args: Buildable[];

  public constructor(
    symbol: Buildable,
    args: Buildable[],
    context: DefinitionContext,
    scope: Maybe<string>,
    tags: Tag[],
    calls: { method: Buildable; params: Buildable[] }[],
  ) {
    super(context, scope, tags, calls);
    this.symbol = symbol;
    this.args = args;
  }

  protected async instantiate(context: RunningContext): Promise<unknown> {
    const symbol = (await this.symbol.build(context)) as Constructable;
    const args = await Promise.all(this.args.map(arg => arg.build(context)));

    return new symbol(...args);
  }
}
