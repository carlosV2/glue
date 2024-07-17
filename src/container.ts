import type { RunningContext } from './context/index';

export interface Container {
  get<T = unknown>(id: string, context?: RunningContext): Promise<T>;
  getParameter<T = unknown>(id: string, context?: RunningContext): Promise<T>;
  findServiceIdsByTag(tag: string): string[];
}
