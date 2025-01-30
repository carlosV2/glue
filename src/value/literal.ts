import type { DefinitionContext, RunningContext } from '../context/index';
import { Buildable } from '../buildable';
import { Value } from '../value';
import { isArray, isDictionary, isString, unzip, zip } from '../utils';

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

    if (isString(item)) {
      const container = context.getContainer();
      const placeholders = [...item.matchAll(/(?<!\\)\$\{([^}]+)\}/g)].map(
        match => match[1],
      );
      const parameters = await Promise.all(
        [...new Set(placeholders)].map(
          async name => [name, await container.getParameter(name)] as const,
        ),
      );

      let result = item;
      for (const [name, value] of parameters) {
        const escaped = name.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(?<!\\\\)\\$\\{${escaped}\\}`, 'g');
        result = result.replace(regex, String(value));
      }

      return result;
    }

    return item;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await this.buildItem(context, this.value);
  }
}
