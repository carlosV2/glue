import type { DefinitionContext, RunningContext } from './context/index';
import { DiError } from './error';

export abstract class Buildable {
  protected readonly context: DefinitionContext;

  public constructor(context: DefinitionContext) {
    this.context = context;
  }

  protected abstract assemble(context: RunningContext): Promise<unknown>;

  public async build(context: RunningContext): Promise<unknown> {
    try {
      return await this.assemble(context);
    } catch (e) {
      if (e instanceof DiError) {
        throw e;
      }

      throw new DiError(e as Error, this.context);
    }
  }
}
