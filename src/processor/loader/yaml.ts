import { dump, load } from 'js-yaml';
import { Loader } from '../loader';
import { DeserialiseError, SerialiseError } from '../../error/format';

export class YamlLoader extends Loader {
  protected serialise(path: string, data: unknown): string {
    try {
      return dump(data);
    } catch {
      throw new SerialiseError('YAML', path);
    }
  }

  protected deserialise(path: string, data: string): unknown {
    try {
      return load(data);
    } catch {
      throw new DeserialiseError('YAML', path);
    }
  }
}
