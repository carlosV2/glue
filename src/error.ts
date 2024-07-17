import type { DefinitionContext } from './context/index';
import { isString } from './utils';
import inspect from 'browser-util-inspect';

export class DiError extends Error {
  public constructor(message: string | Error, context?: DefinitionContext) {
    const error = [
      isString(message)
        ? `${message}`
        : `Unable to continue due to the following error:\n${inspect(message)}\n\nStack trace:\n${message.stack}`,
    ];

    if (context) {
      error.push(
        `This issue originated while processing \`${context.getId()}\` defined in \`${context.getPath()}\`:\n${context.getDefinition()}`,
      );
    }

    super(error.join('\n\n'));
  }
}
