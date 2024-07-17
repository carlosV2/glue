import { DiError } from '../error';

export class AggregatedError extends DiError {
  public constructor(...errors: Error[]) {
    const messages = errors
      .map(error => {
        return error.message
          .split('\n')
          .map(line => `  ${line}`)
          .join('\n');
      })
      .join('\n\n');

    super(
      `This is an aggregated error triggered by the following ones:\n\n${messages}\n\n`,
    );
  }
}
