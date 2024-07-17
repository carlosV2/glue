import type { DefinitionContext, RunningContext } from '../context/index';
import { DiError } from '../error';

export class ServiceNotFoundError extends DiError {
  public constructor(id: string, context?: RunningContext) {
    const message = [`Service definition \`${id}\` was not found.`];
    if (context) {
      const representation = context.getRepresentation();
      if (representation.length) {
        message.push(`Chain of requests:\n${representation}`);
      }
    }

    super(message.join(' '));
  }
}

export class UnknownServiceTypeError extends DiError {
  public constructor(context: DefinitionContext) {
    super('Unable to determine service type.', context);
  }
}
