import ts, { type Expression } from 'typescript';
import { Compilable } from '../compilable';
import { Importation } from './importation';
import { Importer } from '../importer';

const { factory } = ts;

export class Instantiation extends Compilable {
  private readonly importation: Importation;
  private readonly args: unknown[];

  public constructor(importation: Importation, args: unknown[]) {
    super();
    this.importation = importation;
    this.args = args;
  }

  public compile(importer: Importer): Expression {
    return factory.createNewExpression(
      this.importation.compile(importer),
      undefined,
      this.args.map(arg => this.compileArg(importer, arg)),
    );
  }
}
