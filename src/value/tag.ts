import type { DefinitionContext, RunningContext } from '../context/index';
import { Value } from '../value';
import { Dictionary, zip } from '../utils';

export class TagObject extends Value {
  private readonly name: string;

  public constructor(context: DefinitionContext, name: string) {
    super(context);
    this.name = name;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    const container = context.getContainer();

    const ids = container.findServiceIdsByTag(this.name);
    const services = await Promise.all(
      ids.map(id => container.get(id, context)),
    );

    return Object.fromEntries(zip([ids, services]));
  }
}

export class TagList extends TagObject {
  protected override async assemble(context: RunningContext): Promise<unknown> {
    const services = (await super.assemble(context)) as Dictionary;
    return Object.values(services);
  }
}
