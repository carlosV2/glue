import type { DefinitionContext, RunningContext } from '../context/index';
import { Value } from '../value';

export class Service extends Value {
  private readonly id: string;

  public constructor(context: DefinitionContext, id: string) {
    super(context);
    this.id = id;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await context.getContainer().get(this.id, context);
  }
}

export class Parameter extends Value {
  private readonly id: string;

  public constructor(context: DefinitionContext, id: string) {
    super(context);
    this.id = id;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await context.getContainer().getParameter(this.id, context);
  }
}
