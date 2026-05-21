// Codebase with any usage — should flag `any`

export function processData(data: any): any {
  return data.transform();
}

export function log(value: any): void {
  console.log(value);
}

export const handler = (event: any): any => {
  return event.body;
};
