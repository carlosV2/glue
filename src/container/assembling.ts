import type { Container } from '../container';
import { Dictionary, has } from '../utils';
import { Value } from '../value';
import { Alias } from '../alias';
import { Service } from '../service';
import { RunningContext } from '../context/index';
import { ServiceNotFoundError } from '../error/service';
import { ParameterNotFoundError } from '../error/parameter';

export class AssemblingContainer implements Container {
  protected readonly parameters: Dictionary<Value>;
  protected readonly aliases: Dictionary<Alias>;
  protected readonly services: Dictionary<Service>;
  protected readonly instances: Dictionary<Promise<unknown>>;

  public constructor(
    parameters: Dictionary<Value>,
    aliases: Dictionary<Alias>,
    services: Dictionary<Service>,
  ) {
    this.parameters = parameters;
    this.aliases = aliases;
    this.services = services;
    this.instances = {};
  }

  public async get<T = unknown>(
    id: string,
    context?: RunningContext,
  ): Promise<T> {
    const runningContext = (
      context ?? new RunningContext(this)
    ).pushServiceFrame(id);

    if (has(id, this.instances)) {
      return (await this.instances[id]) as T;
    }

    if (has(id, this.aliases)) {
      return (await this.aliases[id].build(runningContext)) as T;
    }

    if (has(id, this.services)) {
      this.instances[id] = this.services[id].build(runningContext);
      return (await this.instances[id]) as T;
    }

    throw new ServiceNotFoundError(id, runningContext);
  }

  public async getParameter<T = unknown>(
    id: string,
    context?: RunningContext,
  ): Promise<T> {
    const runningContext = (
      context ?? new RunningContext(this)
    ).pushParameterFrame(id);

    if (has(id, this.parameters)) {
      return (await this.parameters[id].build(runningContext)) as T;
    }

    throw new ParameterNotFoundError(id, runningContext);
  }

  public findServiceIdsByTag(tag: string): string[] {
    const ids: string[] = [];
    for (const [id, service] of Object.entries(this.services)) {
      if (service.getTagsByName(tag).length) {
        ids.push(id);
      }
    }

    return ids;
  }

  public static from(services: Dictionary<Service>): AssemblingContainer {
    return new AssemblingContainer({}, {}, services);
  }
}
