import type { Container } from '../container';
import { RunningContext } from '../context/index';
import { AggregatedError } from '../error/aggregated';
import { ParameterNotFoundError } from '../error/parameter';
import { ServiceNotFoundError } from '../error/service';
import { uniq } from '../utils';

export class FallbackContainer implements Container {
  private readonly containers: Container[];

  public constructor(...containers: Container[]) {
    this.containers = containers;
  }

  public async get<T = unknown>(
    id: string,
    context?: RunningContext,
  ): Promise<T> {
    const runningContext = context ?? new RunningContext(this);
    const errors: Error[] = [];

    for (const container of this.containers) {
      try {
        return await container.get<T>(id, runningContext);
      } catch (e) {
        if (!(e instanceof ServiceNotFoundError)) {
          throw e;
        }

        errors.push(e);
      }
    }

    throw new AggregatedError(...errors);
  }

  public async getParameter<T = unknown>(
    id: string,
    context?: RunningContext,
  ): Promise<T> {
    const runningContext = context ?? new RunningContext(this);
    const errors: Error[] = [];

    for (const container of this.containers) {
      try {
        return await container.getParameter<T>(id, runningContext);
      } catch (e) {
        if (!(e instanceof ParameterNotFoundError)) {
          throw e;
        }

        errors.push(e);
      }
    }

    throw new AggregatedError(...errors);
  }

  public findServiceIdsByTag(tag: string): string[] {
    return uniq(
      this.containers
        .map(container => container.findServiceIdsByTag(tag))
        .flat(),
    );
  }
}
