import { ClassConstructor, ClassTransformOptions, deserialize, plainToClass, serialize } from 'class-transformer';
import { GetState, SetState, StateCreator, StoreApi } from 'zustand';
import { persist } from 'zustand/middleware';

export function formatRPCError(error: unknown) {
  console.error(error);
  if (typeof error === 'object' && error != null) {
    // @ts-expect-error
    if (error.data?.message) return error.data.message;
    // @ts-expect-error
    return error.message ?? 'Unexpected error';
  }
  return 'Unexpected error';
}

export function formatAddress(address: string) {
  return address.slice(0, 6) + '..' + address.slice(address.length - 4);
}

export type ElementType<T extends any[]> = T[number];

type NonFunctionPropertyNames<T> = { [K in keyof T]: T[K] extends Function ? never : K }[keyof T];
type ExcludeMethods<T> = Pick<T, NonFunctionPropertyNames<T>>;

export function typedPlainToClass<T>(
  cls: ClassConstructor<T>,
  plain: ExcludeMethods<T>,
  options?: ClassTransformOptions,
): T {
  return plainToClass(cls, plain, options);
}

export const persistWithClassTransform = <S extends object>(
  config: StateCreator<S, SetState<S>>,
  options: {
    name: string;
    cls: new (...args: any[]) => any;
    key: keyof S;
  },
): ((set: SetState<S>, get: GetState<S>, api: StoreApi<S>) => S) => {
  return persist(config, {
    ...options,
    serialize: (obj) => {
      return serialize(obj.state[options.key]);
    },
    deserialize: (str) => {
      return {
        state: {
          [options.key]: deserialize(options.cls, str),
        },
      } as any;
    },
  });
};
