import type { Container } from '../container';
import { DiError } from '../error';

type Frame = { type: string; id: string };

export class RunningContext {
  private readonly container: Container;
  private readonly stack: Frame[];

  public constructor(container: Container, stack: Frame[] = []) {
    this.container = container;
    this.stack = stack;
  }

  public getContainer(): Container {
    return this.container;
  }

  private isFrameInStack(type: string, id: string): boolean {
    for (const frame of this.stack) {
      if (frame.type === type && frame.id === id) {
        return true;
      }
    }

    return false;
  }

  public getRepresentation(): string {
    return this.stack.map(frame => `${frame.type}(${frame.id})`).join(' -> ');
  }

  private pushFrame(type: string, id: string): RunningContext {
    if (this.isFrameInStack(type, id)) {
      throw new DiError(
        `Circular dependency detected: ${this.getRepresentation()} -> ${id}`,
      );
    }

    return new RunningContext(this.container, [...this.stack, { type, id }]);
  }

  public pushParameterFrame(id: string): RunningContext {
    return this.pushFrame('parameter', id);
  }

  public pushServiceFrame(id: string): RunningContext {
    return this.pushFrame('service', id);
  }
}
