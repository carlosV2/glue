import type { DefinitionContext } from '../context/index';
import { Value } from '../value';

export class Symbol extends Value {
  private readonly symbol: object | Promise<object>;

  public constructor(
    context: DefinitionContext,
    symbol: object | Promise<object>,
  ) {
    super(context);
    this.symbol = symbol;
  }

  protected async assemble(): Promise<unknown> {
    return await this.symbol;
  }
}
