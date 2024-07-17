import { Buildable } from './buildable';
import { DefinitionContext, RunningContext } from './context/index';

export class Alias extends Buildable {
  private readonly aliased: string;

  public constructor(context: DefinitionContext, aliased: string) {
    super(context);
    this.aliased = aliased;
  }

  protected async assemble(context: RunningContext): Promise<unknown> {
    return await context.getContainer().get(this.aliased, context);
  }
}
