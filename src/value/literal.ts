import type { DefinitionContext, RunningContext } from '../context/index';
import { Buildable } from '../buildable';
import { Value } from '../value';
import {
  Dictionary,
  isArray,
  isDictionary,
  isString,
  resolvePromises,
  unzip,
  zip,
} from '../utils';

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

      const placeholders: Dictionary<Promise<string>> = {};
      for (const match of item.matchAll(/(\\)?\@\{([^}]+)\}/g)) {
        const escape = match[1];
        const placeholder = match[2];

        if (escape || placeholder in placeholders) {
          continue;
        }

        placeholders[placeholder] = container
          .getParameter(placeholder)
          .then(String);
      }
      const parameters = await resolvePromises(placeholders);

      return item.replace(
        /(\\)?\@\{([^}]+)\}/g,
        (match, escape, placeholder) => {
          return escape ? match.slice(1) : parameters[placeholder];
        },
      );
    }

    return item;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await this.buildItem(context, this.value);
  }
}
