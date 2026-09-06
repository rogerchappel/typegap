export function isPayload(value: object): value is any {
  return true;
}

export function isUnknown(value: object): value is unknown {
  return true;
}

export const mapped: { [K in keyof any]: string } = {};
export const cleanMapped: { [K in 'id' | 'name']: string } = { id: '1', name: 'example' };
