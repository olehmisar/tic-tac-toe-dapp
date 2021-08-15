import React, { ReactNode, useEffect, useState } from 'react';

type Props<T> = {
  promise: Promise<T>;
  default?: ReactNode;
  children: ((value: T) => ReactNode) | ReactNode;
};
export function Await<T>({ promise, default: d, children }: Props<T>) {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    promise.then(setValue);
  }, [promise]);
  if (typeof children === 'function' && value !== undefined) {
    return children(value);
  }
  return <>{d}</>;
}
