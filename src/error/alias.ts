import { DiError } from '../error';

export class AliasNotFoundError extends DiError {
  public constructor(id: string) {
    super(`Alias definition ${id} was not found`);
  }
}
