import ts, { SyntaxKind, type Expression } from 'typescript';
import { Importer } from './importer';
import {
  isArray,
  isBoolean,
  isDictionary,
  isNumber,
  isString,
  isUndefined,
} from './utils';
import { DiError } from './error';

const { factory } = ts;

export abstract class Compilable {
  protected compileArg(importer: Importer, value: unknown): Expression {
    if (isString(value)) {
      return factory.createStringLiteral(value);
    }

    if (isNumber(value)) {
      let compiled: Expression = factory.createNumericLiteral(Math.abs(value));
      if (value < 0) {
        compiled = factory.createPrefixUnaryExpression(
          SyntaxKind.MinusToken,
          compiled,
        );
      }

      return compiled;
    }

    if (isBoolean(value)) {
      return value ? factory.createTrue() : factory.createFalse();
    }

    if (isUndefined(value)) {
      return factory.createIdentifier('undefined');
    }

    if (isArray(value)) {
      return factory.createArrayLiteralExpression(
        value.map(item => this.compileArg(importer, item)),
      );
    }

    if (value instanceof Compilable) {
      return value.compile(importer);
    }

    if (isDictionary(value)) {
      return factory.createObjectLiteralExpression(
        Object.entries(value).map(([key, item]) =>
          factory.createPropertyAssignment(
            factory.createIdentifier(key),
            this.compileArg(importer, item),
          ),
        ),
      );
    }

    throw new DiError(
      `Requested to compile unknown data type \`${JSON.stringify(value)}\``,
    );
  }

  public abstract compile(importer: Importer): Expression;
}
