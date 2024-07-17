import type { Buildable } from '../buildable';
import type { DefinitionContext, RunningContext } from '../context/index';
import { Maybe, type Dictionary } from '../utils';
import { Service, type Tag } from '../service';

export class Property extends Service {
  private readonly symbol: Buildable;
  private readonly property: Buildable;

  public constructor(
    symbol: Buildable,
    property: Buildable,
    context: DefinitionContext,
    scope: Maybe<string>,
    tags: Tag[],
    calls: { method: Buildable; params: Buildable[] }[],
  ) {
    super(context, scope, tags, calls);
    this.symbol = symbol;
    this.property = property;
  }

  protected async instantiate(context: RunningContext): Promise<unknown> {
    const symbol = (await this.symbol.build(context)) as Dictionary;
    const property = (await this.property.build(context)) as string;
    return symbol[property];
  }
}
