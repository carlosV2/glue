import { Compilable } from '../compilable';
import { DefinitionContext } from '../context/index';
import { Call, Processor } from '../processor';
import { Tag } from '../service';
import { Dictionary, Maybe, isString, library } from '../utils';
import { DiError } from '../error';
import { Instantiation } from '../compilable/instantiation';
import { Importation } from '../compilable/importation';
import ts, {
  ExpressionStatement,
  isVariableStatement,
  type HasModifiers,
  type Statement,
} from 'typescript';
import { readFileSync } from 'node:fs';
import { Importer } from '../importer';
import { fileExists, getFullPath, glob } from '../filesystem';

const {
  factory,
  NodeFlags,
  SyntaxKind,
  ScriptTarget,
  createPrinter,
  createSourceFile,
  isClassDeclaration,
  isFunctionDeclaration,
} = ts;

export abstract class Compiler extends Processor<Compilable> {
  private readonly extensions: string[] = [];
  private readonly parameters: Dictionary<Compilable> = {};
  private readonly aliases: Dictionary<Compilable> = {};
  private readonly services: Dictionary<Compilable> = {};

  protected glob(pattern: string): string[] {
    return glob(pattern);
  }

  protected getFullPath(
    baseFile: string,
    relative: string,
    shouldExist: boolean = true,
  ): string {
    const path = getFullPath(baseFile, relative);
    if (!shouldExist || fileExists(path)) {
      return path;
    }

    return relative;
  }

  protected readContents(path: string): string {
    return readFileSync(path, { encoding: 'utf-8' });
  }

  protected addExtend(path: string): void {
    this.extensions.push(path);
  }

  protected addParameter(id: string, parameter: Compilable): void {
    this.parameters[id] = parameter;
  }

  protected addAlias(id: string, alias: Compilable): void {
    this.aliases[id] = alias;
  }

  protected addService(id: string, service: Compilable): void {
    this.services[id] = service;
  }

  private getCompilableContext(context: DefinitionContext): Compilable {
    return new Instantiation(
      Importation.named(`${library}/context`, 'DefinitionContext'),
      [context.getPath(), context.getId(), context.getDefinition()],
    );
  }

  protected processEnvStrValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'EnvStr'), [
      this.getCompilableContext(context),
      name,
      fallback,
    ]);
  }

  protected processEnvBoolValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'EnvBool'), [
      this.getCompilableContext(context),
      name,
      fallback,
    ]);
  }

  protected processEnvNumValue(
    context: DefinitionContext,
    name: string,
    fallback: Maybe<string>,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'EnvNum'), [
      this.getCompilableContext(context),
      name,
      fallback,
    ]);
  }

  protected processEvalValue(
    context: DefinitionContext,
    code: string,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'Eval'), [
      this.getCompilableContext(context),
      code,
    ]);
  }

  protected processLiteralValue(
    context: DefinitionContext,
    value: unknown,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'Literal'), [
      this.getCompilableContext(context),
      value,
    ]);
  }

  protected processParameterValue(
    context: DefinitionContext,
    id: string,
  ): Compilable {
    return new Instantiation(
      Importation.named(`${library}/value`, 'Parameter'),
      [this.getCompilableContext(context), id],
    );
  }

  protected processServiceValue(
    context: DefinitionContext,
    id: string,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'Service'), [
      this.getCompilableContext(context),
      id,
    ]);
  }

  private getExportedToken(
    context: DefinitionContext,
    path: string,
    constraint: (node: Statement) => boolean,
  ): string {
    const filepath = this.getFullPath(context.getPath(), path);
    const code = readFileSync(filepath, { encoding: 'utf8' });

    let token = undefined;
    for (const statement of createSourceFile(
      filepath,
      code,
      ScriptTarget.ES2022,
    ).statements) {
      const isExported = ((statement as HasModifiers).modifiers ?? []).find(
        modifier => modifier.kind === SyntaxKind.ExportKeyword,
      );

      if (isExported && constraint(statement)) {
        if (token) {
          throw new DiError('Multiple exported symbols where found.', context);
        } else if (
          isClassDeclaration(statement) ||
          isFunctionDeclaration(statement)
        ) {
          token = (statement as any).name.text;
        } else if (isVariableStatement(statement)) {
          token = (statement as any).declarationList.declarations[0].name
            .escapedText;
        } else {
          throw new DiError(
            'Unable to determine token name from statement.',
            context,
          );
        }
      }
    }

    if (token) {
      return token;
    }

    throw new DiError('A suitable exported symbol was not found.', context);
  }

  protected processSymbolValue(
    context: DefinitionContext,
    path: string,
    name: Maybe<string>,
  ): Compilable {
    // Importing module. For example: (my/path
    if (!isString(name)) {
      return new Instantiation(
        Importation.named(`${library}/value`, 'Symbol'),
        [
          this.getCompilableContext(context),
          Importation.module(this.getFullPath(context.getPath(), path)),
        ],
      );
    }

    // Importing the default symbol. For example: (my/path)
    if (name.length === 0) {
      return new Instantiation(
        Importation.named(`${library}/value`, 'Symbol'),
        [
          this.getCompilableContext(context),
          Importation.default(this.getFullPath(context.getPath(), path)),
        ],
      );
    }

    let token = name;

    // Importing the only exported symbol. For example: (my/path)~
    if (name === '~') {
      token = this.getExportedToken(context, path, () => true);
    }

    // Importing the only exported class. For example: (my/path)~class
    if (name === '~class') {
      token = this.getExportedToken(context, path, isClassDeclaration);
    }

    // Importing the only exported function. For example: (my/path)~func
    if (name === '~func') {
      token = this.getExportedToken(context, path, isFunctionDeclaration);
    }

    // Imporint the symbol found before or a known one. For example: (my/path)MyObj
    return new Instantiation(Importation.named(`${library}/value`, 'Symbol'), [
      this.getCompilableContext(context),
      Importation.named(this.getFullPath(context.getPath(), path), token),
    ]);
  }

  protected processTagListValue(
    context: DefinitionContext,
    name: string,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/value`, 'TagList'), [
      this.getCompilableContext(context),
      name,
    ]);
  }

  protected processTagObjectValue(
    context: DefinitionContext,
    name: string,
  ): Compilable {
    return new Instantiation(
      Importation.named(`${library}/value`, 'TagObject'),
      [this.getCompilableContext(context), name],
    );
  }

  protected processAlias(
    context: DefinitionContext,
    aliased: string,
  ): Compilable {
    return new Instantiation(Importation.named(`${library}/alias`, 'Alias'), [
      this.getCompilableContext(context),
      aliased,
    ]);
  }

  protected processConstructorService(
    context: DefinitionContext,
    symbol: Compilable,
    args: Compilable[],
    scope: string,
    tags: Tag[],
    calls: Call<Compilable>[],
  ): Compilable {
    return new Instantiation(
      Importation.named(`${library}/service`, 'Constructor'),
      [symbol, args, this.getCompilableContext(context), scope, tags, calls],
    );
  }

  protected processFactoryService(
    context: DefinitionContext,
    symbol: Compilable,
    factory: Compilable,
    args: Compilable[],
    scope: string,
    tags: Tag[],
    calls: Call<Compilable>[],
  ): Compilable {
    return new Instantiation(
      Importation.named(`${library}/service`, 'Factory'),
      [
        symbol,
        factory,
        args,
        this.getCompilableContext(context),
        scope,
        tags,
        calls,
      ],
    );
  }

  protected processPropertyService(
    context: DefinitionContext,
    symbol: Compilable,
    property: Compilable,
    scope: string,
    tags: Tag[],
    calls: Call<Compilable>[],
  ): Compilable {
    return new Instantiation(
      Importation.named(`${library}/service`, 'Property'),
      [
        symbol,
        property,
        this.getCompilableContext(context),
        scope,
        tags,
        calls,
      ],
    );
  }

  private compileCall(
    importer: Importer,
    loader: string,
    method: string,
    id: string,
    compilable: Compilable,
  ): ExpressionStatement {
    return factory.createExpressionStatement(
      factory.createCallExpression(
        factory.createPropertyAccessExpression(
          factory.createIdentifier(loader),
          factory.createIdentifier(method),
        ),
        undefined,
        [factory.createStringLiteral(id), compilable.compile(importer)],
      ),
    );
  }

  public compile(): string {
    const loader = 'loader';
    const importer = new Importer();

    const extensions = this.extensions.map(path => {
      return factory.createExpressionStatement(
        factory.createCallExpression(
          factory.createIdentifier(importer.default(path)),
          undefined,
          [factory.createIdentifier(loader)],
        ),
      );
    });

    const parameters = Object.entries(this.parameters).map(([id, parameter]) =>
      this.compileCall(importer, loader, 'addParameter', id, parameter),
    );
    const aliases = Object.entries(this.aliases).map(([id, alias]) =>
      this.compileCall(importer, loader, 'addAlias', id, alias),
    );
    const services = Object.entries(this.services).map(([id, service]) =>
      this.compileCall(importer, loader, 'addService', id, service),
    );

    const file = factory.createSourceFile(
      [
        ...importer.compile(),
        factory.createFunctionDeclaration(
          [
            factory.createToken(SyntaxKind.ExportKeyword),
            factory.createToken(SyntaxKind.DefaultKeyword),
          ],
          undefined,
          undefined,
          undefined,
          [
            factory.createParameterDeclaration(
              undefined,
              undefined,
              factory.createIdentifier(loader),
              undefined,
              undefined,
              undefined,
            ),
          ],
          undefined,
          factory.createBlock([
            ...extensions,
            ...parameters,
            ...aliases,
            ...services,
          ]),
        ),
      ],
      factory.createToken(SyntaxKind.EndOfFileToken),
      NodeFlags.None,
    );

    return createPrinter().printFile(file);
  }
}
