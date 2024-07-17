import type { DefinitionContext, RunningContext } from './context/index';
import { Buildable } from './buildable';
import { Callable, Dictionary, Maybe } from './utils';

export type Tag = { name: string } & Record<string, unknown>;

export abstract class Service extends Buildable {
  protected readonly scope: Maybe<string>;
  protected readonly tags: Tag[];
  protected readonly calls: { method: Buildable; params: Buildable[] }[];

  public constructor(
    context: DefinitionContext,
    scope: Maybe<string>,
    tags: Tag[],
    calls: { method: Buildable; params: Buildable[] }[],
  ) {
    super(context);
    this.scope = scope;
    this.tags = tags;
    this.calls = calls;
  }

  protected abstract instantiate(context: RunningContext): Promise<unknown>;

  protected async assemble(context: RunningContext): Promise<unknown> {
    const instance = (await this.instantiate(context)) as Dictionary;

    await Promise.all(
      this.calls.map(async call => {
        const method = (await call.method.build(context)) as string;
        const args = await Promise.all(
          call.params.map(param => param.build(context)),
        );
        const fn = (instance[method] as Callable).bind(instance);

        fn(...args);
      }),
    );

    return instance;
  }

  public getScope(): Maybe<string> {
    return this.scope;
  }

  public getTagsByName(name: string): Tag[] {
    return this.tags.filter(tag => tag.name === name);
  }
}
