import { DeserialiseError, SerialiseError } from '../../error/format';
import { Compiler } from '../compiler';

export class JsonCompiler extends Compiler {
  protected serialise(path: string, data: unknown): string {
    try {
      return JSON.stringify(data);
    } catch {
      throw new SerialiseError('JSON', path);
    }
  }

  protected deserialise(path: string, data: string): unknown {
    try {
      return JSON.parse(data);
    } catch {
      throw new DeserialiseError('JSON', path);
    }
  }
}
