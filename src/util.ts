import type { Bot } from 'mineflayer'
import type { StateBehavior, StateMachineData } from './stateBehavior'
import { NestedStateMachine, NestedStateMachineOptions } from './stateMachineNested'


export type StateBehaviorBuilder<State extends StateBehavior = StateBehavior, Args extends any[] = any[]> = NonConstructor<typeof StateBehavior> &
(new (bot: Bot, data: StateMachineData, ...additonal: Args) => State)

export type OmitTwo<T extends any[]> = T extends [first?: any, second?: any, ...any: infer R] ? R : never

export type HasArgs<Child extends StateBehaviorBuilder> = OmitTwo<Required<ConstructorParameters<Child>>> extends [
  first: any,
  ...any: any
]
  ? Child
  : never
export type NoArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>> extends [
  first: any,
  ...any: any
]
  ? never
  : Child

export type StateConstructorArgs<Child extends StateBehaviorBuilder> = OmitTwo<ConstructorParameters<Child>>

export type SpecifcNestedStateMachine<
  Enter extends StateBehaviorBuilder = StateBehaviorBuilder,
  Exit extends StateBehaviorBuilder[] = StateBehaviorBuilder[]
> =typeof NestedStateMachine & NestedStateMachineOptions<Enter, Exit>

type NonConstructorKeys<T> = { [P in keyof T]: T[P] extends new () => any ? never : P }[keyof T]
export type NonConstructor<T> = Pick<T, NonConstructorKeys<T>>

export function isNestedStateMachine (first: Function): first is typeof NestedStateMachine {
  while (first !== Function.prototype) {
    if (first === NestedStateMachine) {
      return true
    }
    first = Object.getPrototypeOf(first)
  }
  return false
}



export declare type OmitX<ToRemove extends number, Args extends any[], Remain extends any[] = []> =
  ToRemove extends Remain['length']
    ? Args
    : Args extends [first: undefined, ...i: any]
      ? never
      : Args extends [first?: infer Arg, ...i: infer Rest]
        ? OmitX<ToRemove, Rest, [...Remain, Arg]>
        : never

declare type Narrowable = string | number | bigint | boolean
declare type CustomNarrowRaw<A> = A extends []
  ? []
  : A extends Narrowable
    ? A
    : A extends Function
      ? A
      : {
          [K in keyof A]: A[K] extends Function ? A[K] : CustomNarrowRaw<A[K]>;
        }
declare type Try<A1 extends any, A2 extends any, Catch = never> = A1 extends A2 ? A1 : Catch
export declare type CustomNarrow<A extends any> = Try<A, [], CustomNarrowRaw<A>>

export type MergeStates<
  ToMerge extends readonly StateBehaviorBuilder[],
  Final extends StateBehavior = StateBehavior,
  Start extends boolean = false
> = ToMerge extends []
  ? Final
  : ToMerge extends readonly [first: infer R extends StateBehaviorBuilder, ...i: infer Rest extends readonly StateBehaviorBuilder[]]
    ? Start extends true
      ? MergeStates<Rest, Final | InstanceType<R>, Start>
      : MergeStates<Rest, InstanceType<R>, true>
    : StateBehavior;


export type ReplaceKeyTypes<Original extends any, Replacement> = {
    [Key in keyof Original]: Key extends keyof Replacement ?
      Original[Key] extends Replacement[Key] ?
      Original[Key] : Replacement[Key] : Original[Key]
}

export type WebserverBehaviorPositionIterable = Iterable<{
  parentMachine?: typeof NestedStateMachine
  state: StateBehaviorBuilder
  x: number
  y: number
}>
