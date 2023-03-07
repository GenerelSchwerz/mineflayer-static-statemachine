import type { Bot } from "mineflayer";
import { StateBehavior, StateMachineData } from "./stateBehavior";
import { NestedStateMachine, NestedStateMachineOptions } from "./stateMachineNested";

export type StateBehaviorBuilder<Args extends any[] = any> = NonConstructor<typeof StateBehavior> &
  (new (bot: Bot, data: StateMachineData, ...additonal: Args) => StateBehavior);

export type OmitTwo<T extends any[]> = T extends [first: any, second: any, ...any: infer R] ? R : never;

export type HasArgs<Child extends StateBehaviorBuilder> = OmitTwo<Required<ConstructorParameters<Child>>> extends [
  first: any,
  ...any: any
]
  ? Child
  : never;
export type NoArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>> extends [
  first: any,
  ...any: any
]
  ? never
  : Child;

export type StateConstructorArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>>;

export type SpecifcNestedStateMachine<
  Enter extends StateBehaviorBuilder = StateBehaviorBuilder,
  Exit extends StateBehaviorBuilder = StateBehaviorBuilder
> = typeof NestedStateMachine & NestedStateMachineOptions<Enter, Exit>;

type NonConstructorKeys<T> = { [P in keyof T]: T[P] extends new () => any ? never : P }[keyof T];
export type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>;

export function isNestedStateMachine(first: FunctionConstructor["prototype"]): first is typeof NestedStateMachine {
  while (first !== Function.prototype) {
    if (first === NestedStateMachine) {
      return true;
    }
    first = Object.getPrototypeOf(first);
  }
  return false;
}

/**
 * Allows for the cloning of StateBehavior class types.
 *
 * @param this
 * @param name
 * @returns
 */
export function clone<T extends StateBehaviorBuilder>(this: T, name?: string): T {
  const ToBuild = class ClonedState extends this.prototype.constructor {};
  Object.getOwnPropertyNames(this.prototype).forEach((name) => {
    Object.defineProperty(
      ToBuild.prototype,
      name,
      Object.getOwnPropertyDescriptor(this.prototype, name) ?? Object.create(null)
    );
  });

  const descriptors = Object.getOwnPropertyDescriptors(this);
  Object.getOwnPropertyNames(this).forEach((name) => {
    if (descriptors[name].writable == null) {
      Object.defineProperty(ToBuild, name, Object.getOwnPropertyDescriptor(this, name) ?? Object.create(null));
    }
  });

  // console.log(ToBuild, this);
  if (name != null) ToBuild.stateName = name;
  return ToBuild as unknown as T;
}

// export type ArrayLength<Arr extends any[], L extends any[] = []> = Arr extends [first: any, ...i: infer Rest]
//   ? ArrayLength<Rest, [...L, any]>
//   : L["length"];

export type OmitX<
  ToRemove extends number,
  Args extends any[],
  Remain extends any[] = []
> = ToRemove extends Remain["length"]
  ? Args
  : Args extends [first: infer Arg, ...i: infer Rest]
  ? OmitX<ToRemove, Rest, [...Remain, Arg]>
  : never;

// // export type Matches<Check extends any[], Against extends any[], Accum extends any[] = []> = Check extends [first: infer R, ...i: infer Rest] ? Against extends [first: infer R1, ...i: infer Rest1] ? R extends R1 ?  Matches<Rest, Rest1, [...Accum, R]> : never : never : Check extends Against ? Accum : never

// export type MatchesUntil<
//   Len extends number,
//   Check extends any[],
//   Against extends any[],
//   Accum extends any[] = []
// > = Len extends Accum["length"]
//   ? Accum
//   : Check extends [first: infer R, ...i: infer Rest]
//   ? Against extends [first: infer R1, ...i: infer Rest1]
//     ? R extends R1
//       ? MatchesUntil<Len, Rest, Rest1, [...Accum, R]>
//       : never
//     : never
//   : never;

// export type MatchLen<Check extends any[], Against extends any[], Accum extends any[] = []> = Check extends [
//   first: infer R,
//   ...i: infer Rest
// ]
//   ? Against extends [first: infer R1, ...i: infer Rest1]
//     ? R extends R1
//       ? MatchLen<Rest, Rest1, [...Accum, R]>
//       : Accum["length"]
//     : Accum["length"]
//   : Accum["length"];

// type NumOfUndefined<List extends Partial<any[]>, Accum extends undefined[] = []> = List extends [
//   first: infer R extends undefined,
//   ...i: infer Rest
// ]
//   ? NumOfUndefined<Rest, [...Accum, R]>
//   : List extends [first: infer R, ...i: infer Rest]
//   ? NumOfUndefined<Rest, Accum>
//   : Accum["length"];

// type StrictPartialOf<Check extends any, Against extends any[], Accum extends any[] = []> = 
// Check extends [ first: infer R0, ...i: infer Rest0 ]
//   ? Against extends [first?: infer R1, ...i: infer Rest1]
//     ? R1 extends R0
//       ? StrictPartialOf<Rest0, Rest1, [...Accum, R0]>
//       : never
//     : never
//   : Check extends Against ? Accum : never;

// type StrictPartialOf<Check extends any, Against extends any[], Accum extends any[] = []> = 
// Check extends [ first: infer R0, ...i: infer Rest0 ]
//   ? Against extends [first?: infer R1, ...i: infer Rest1]
//     ? R1 extends R0
//       ? StrictPartialOf<Rest0, Rest1, [...Accum, R0]>
//       : never
//     : never
//   : Check extends Against ? Accum : never;


// type Test<T extends StateBehaviorBuilder> = Exclude<Partial<StateConstructorArgs<T>>["length"], undefined>


declare type Narrowable = string | number | bigint | boolean;
declare type CustomNarrowRaw<A> = A extends [] ? [] : A extends Narrowable ? A : A extends Function ? A : ({
  [K in keyof A]: A[K] extends Function ? A[K] : CustomNarrowRaw<A[K]>;
});
declare type Try<A1 extends any, A2 extends any, Catch = never> = A1 extends A2 ? A1 : Catch;
declare type CustomNarrow<A extends any> = Try<A, [], CustomNarrowRaw<A>>;

/**
 * Allows for the transformation of StateBehavior class types.
 *
 * @param this
 * @param name
 * @returns
 */
export function transform<T extends StateBehaviorBuilder, Args extends CustomNarrow<Partial<StateConstructorArgs<T>>>, Len extends Exclude<Args["length"], undefined>>(
  this: HasArgs<T>,
  name: string,
  defaultArgs: Args
): NonConstructor<T> &
  (new (
    bot: Bot,
    data: StateMachineData,
    ...additonal: OmitX<Len, StateConstructorArgs<T>>
  ) => InstanceType<T>) {
  const ToBuild = class ClonedState extends this.prototype.constructor {
    constructor(
      bot: Bot,
      data: StateMachineData,
      ...additional: OmitX<Len, StateConstructorArgs<T>>
    ) {
      super(bot, data, ...(defaultArgs as any), ...(additional as any));
    }
  };

  Object.getOwnPropertyNames(this.prototype).forEach((name) => {
    Object.defineProperty(
      ToBuild.prototype,
      name,
      Object.getOwnPropertyDescriptor(this.prototype, name) ?? Object.create(null)
    );
  });

  const descriptors = Object.getOwnPropertyDescriptors(this);
  Object.getOwnPropertyNames(this).forEach((name) => {
    if (descriptors[name].writable == null) {
      Object.defineProperty(ToBuild, name, Object.getOwnPropertyDescriptor(this, name) ?? Object.create(null));
    }
  });

  // console.log(ToBuild, this);
  if (name != null) ToBuild.stateName = name;
  return ToBuild as unknown as any;
}

export type WebserverBehaviorPositionIterable = Iterable<{
  parentMachine?: typeof NestedStateMachine;
  state: typeof StateBehavior;
  x: number;
  y: number;
}>;
