export class DefinitionContext {
  private readonly path: string;
  private readonly id: string;
  private readonly definition: string;

  public constructor(path: string, id: string, definition: string) {
    this.path = path;
    this.id = id;
    this.definition = definition;
  }

  public getPath(): string {
    return this.path;
  }

  public getId(): string {
    return this.id;
  }

  public getDefinition(): string {
    return this.definition;
  }
}
