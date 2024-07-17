import { DiError } from '../error';

export class SerialiseError extends DiError {
  public constructor(format: string, path: string) {
    super(`Unable to serialise ${format} data in ${path}`);
  }
}

export class DeserialiseError extends DiError {
  public constructor(format: string, path: string) {
    super(`Unable to deserialise ${format} data in ${path}`);
  }
}
