import type { RunningContext } from '../context';
import { DiError } from '../error';

export class ParameterNotFoundError extends DiError {
  public constructor(id: string, context?: RunningContext) {
    const message = [`Parameter definition \`${id}\` was not found.`];
    if (context) {
      const representation = context.getRepresentation();
      if (representation.length) {
        message.push(`Chain of requests:\n${representation}`);
      }
    }

    super(message.join(' '));
  }
}
