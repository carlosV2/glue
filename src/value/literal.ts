import type { DefinitionContext, RunningContext } from '../context/index';
import { Buildable } from '../buildable';
import { Value } from '../value';
import { isArray, isDictionary, unzip, zip } from '../utils';

export class Literal extends Value {
  private readonly value: unknown;

  public constructor(context: DefinitionContext, value: unknown) {
    super(context);
    this.value = value;
  }

  private async buildItem(
    context: RunningContext,
    item: unknown,
  ): Promise<unknown> {
    if (isArray(item)) {
      return await Promise.all(
        item.map(element => this.buildItem(context, element)),
      );
    }

    if (item instanceof Buildable) {
      return await item.build(context);
    }

    if (isDictionary(item)) {
      const [ids, values] = unzip(Object.entries(item));
      const results = await Promise.all(
        values.map(element => this.buildItem(context, element)),
      );
      return Object.fromEntries(zip([ids, results]));
    }

    return item;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await this.buildItem(context, this.value);
  }
}
