export type AnyFunc = (...arg: any[]) => Promise<any> | any;

export type LastFnReturnType<
  F extends Array<AnyFunc>,
  Else = never
> = F extends [...any[], (...arg: any) => infer R] ? R : Else;

export type PipeArgs<
  F extends AnyFunc[],
  Acc extends AnyFunc[] = []
> = F extends [(...args: infer A) => infer B]
  ? [...Acc, (...args: A) => B | Promise<B>]
  : F extends [(...args: infer A) => any, ...infer Tail]
  ? Tail extends [(arg: infer B) => any, ...any[]]
    ? PipeArgs<Tail, [...Acc, (...args: A) => B | Promise<B>]>
    : Acc
  : Acc;

export const pipe =
  <FirstFn extends AnyFunc, F extends AnyFunc[]>(
    firstFn: FirstFn,
    ...fns: PipeArgs<F> extends F ? F : PipeArgs<F>
  ) =>
  (
    ...args: Parameters<FirstFn>
  ): Promise<LastFnReturnType<F, ReturnType<FirstFn>>> =>
    (fns as AnyFunc[]).reduce(
      (acc, fn) => (acc instanceof Promise ? acc.then(fn) : fn(acc)),
      firstFn(...args)
    );

export default pipe;
