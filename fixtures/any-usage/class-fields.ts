export class Service {
  payload: any;
  readonly response?: Promise<unknown>;

  run(input: string): any {
    return input;
  }
}
