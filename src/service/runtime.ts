import type { Buildable } from '../buildable';
import { DefinitionContext, type RunningContext } from '../context/index';
import type { Maybe } from '../utils';
import { Service, type Tag } from '../service';

type Builder = (context: RunningContext) => unknown | Promise<unknown>;

export class Runtime extends Service {
  private readonly builder: Builder;

  public constructor(
    builder: Builder,
    scope: Maybe<string> = undefined,
    tags: Tag[] = [],
    calls: { method: Buildable; params: Buildable[] }[] = [],
  ) {
    super(
      new DefinitionContext('<runtime>', '<runtime>', '<runtime>'),
      scope,
      tags,
      calls,
    );
    this.builder = builder;
  }

  protected async instantiate(context: RunningContext): Promise<unknown> {
    return await this.builder(context);
  }
}
