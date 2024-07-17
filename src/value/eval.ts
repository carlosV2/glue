import type { DefinitionContext } from '../context/index';
import { Value } from '../value';

export class Eval extends Value {
  private readonly code: string;

  public constructor(context: DefinitionContext, code: string) {
    super(context);
    this.code = code;
  }

  protected async assemble(): Promise<unknown> {
    return await eval(this.code);
  }
}
