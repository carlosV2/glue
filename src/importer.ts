import ts, {
  type NamedImports,
  type Identifier,
  type ImportDeclaration,
} from 'typescript';
import { Dictionary, Maybe, gibberish, isString } from './utils';

const { factory } = ts;

type Importee = {
  module?: string;
  default?: string;
  symbols: Dictionary<string>;
};

export class Importer {
  private readonly imports: Dictionary<Importee>;

  public constructor() {
    this.imports = {};
  }

  private randomise(name: string): string {
    return `${name}_${gibberish(10)}`;
  }

  private initPath(path: string): void {
    if (!(path in this.imports)) {
      this.imports[path] = {
        module: undefined,
        default: undefined,
        symbols: {},
      };
    }
  }

  public module(path: string): string {
    this.initPath(path);
    if (!isString(this.imports[path].module)) {
      this.imports[path].module = this.randomise('Module');
    }

    return this.imports[path].module!;
  }

  public default(path: string): string {
    this.initPath(path);
    if (!isString(this.imports[path].default)) {
      this.imports[path].default = this.randomise('Default');
    }

    return this.imports[path].default!;
  }

  public symbol(path: string, symbol: string): string {
    this.initPath(path);
    if (!(symbol in this.imports[path].symbols)) {
      this.imports[path].symbols[symbol] = this.randomise(symbol);
    }

    return this.imports[path].symbols[symbol];
  }

  private sanitise(path: string): string {
    if (path.endsWith('.ts') || path.endsWith('js')) {
      return path.substring(0, path.length - 3);
    }

    return path;
  }

  public compile(): ImportDeclaration[] {
    return Object.entries(this.imports)
      .map(([path, importee]) => {
        const declarations: ImportDeclaration[] = [];

        if (isString(importee.module)) {
          declarations.push(
            factory.createImportDeclaration(
              undefined,
              factory.createImportClause(
                false,
                undefined,

                factory.createNamespaceImport(
                  factory.createIdentifier(importee.module),
                ),
              ),
              factory.createStringLiteral(this.sanitise(path)),
            ),
          );
        }

        let defaultImport: Maybe<Identifier> = undefined;
        if (isString(importee.default)) {
          defaultImport = factory.createIdentifier(importee.default);
        }

        let symbolsImport: Maybe<NamedImports> = undefined;
        if (Object.keys(importee.symbols).length) {
          symbolsImport = factory.createNamedImports(
            Object.entries(importee.symbols).map(([symbol, as]) => {
              let propertyName: Maybe<Identifier> = undefined;
              let name: Identifier = factory.createIdentifier(symbol);

              if (isString(as)) {
                propertyName = factory.createIdentifier(symbol);
                name = factory.createIdentifier(as);
              }

              return factory.createImportSpecifier(false, propertyName, name);
            }),
          );
        }

        if (defaultImport || symbolsImport) {
          declarations.push(
            factory.createImportDeclaration(
              undefined,
              factory.createImportClause(false, defaultImport, symbolsImport),
              factory.createStringLiteral(this.sanitise(path)),
            ),
          );
        }

        return declarations;
      })
      .flat();
  }
}
