// TSX component with missing types
import React from 'react';

export function Greeting(props: { name: string }) {
  return React.createElement('div', null, `Hello, ${props.name}`);
}

export const Button = ({ onClick }: { onClick: () => void }) => {
  return React.createElement('button', { onClick }, 'Click');
};

export function untypedCallback(fn) {
  return fn();
}

export function genericWrapper<T>(data: T): any {
  return data as any;
}

export function catchWithoutType() {
  try {
    return 1;
  } catch (e) {
    return 0;
  }
}
