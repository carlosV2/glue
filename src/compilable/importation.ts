import ts, { type Expression } from 'typescript';
import { Compilable } from '../compilable.js';
import { Importer } from '../importer.js';
import { isSymbol } from '../utils.js';
import { DiError } from '../error.js';

const { factory } = ts;

const moduleSymbol = Symbol();
const defaultSymbol = Symbol();

export class Importation extends Compilable {
  private readonly path: string;
  private readonly symbol: string | symbol;

  private constructor(path: string, symbol: string | symbol) {
    super();
    this.path = path;
    this.symbol = symbol;
  }

  public compile(importer: Importer): Expression {
    if (this.symbol === moduleSymbol) {
      return factory.createIdentifier(importer.module(this.path));
    } else if (this.symbol === defaultSymbol) {
      return factory.createIdentifier(importer.default(this.path));
    } else if (!isSymbol(this.symbol)) {
      return factory.createIdentifier(importer.symbol(this.path, this.symbol));
    }

    throw new DiError(
      `Unable to determine the import declaration for ${String(this.symbol)}`,
    );
  }

  public static module(path: string): Importation {
    return new Importation(path, moduleSymbol);
  }

  public static default(path: string): Importation {
    return new Importation(path, defaultSymbol);
  }

  public static named(path: string, symbol: string): Importation {
    return new Importation(path, symbol);
  }
}
