import type { Bot, Player } from 'mineflayer'
import type { Entity } from 'prismarine-entity'
import type { Item } from 'prismarine-item'
import type { Vec3 } from 'vec3'
import { CustomNarrow, HasArgs, StateBehaviorBuilder, StateConstructorArgs, OmitX } from './util'

/**
 * A collection of targets which the bot is currently
 * storing in memory. These are primarily used to allow
 * states to communicate with each other more effectively.
 */
export interface StateMachineData {
  entity?: Entity
  position?: Vec3
  item?: Item
  player?: Player
  blockFace?: Vec3

  entities?: Entity[]
  positions?: Vec3[]
  items?: Item[]
  players?: Player[]
}




/**
 * A transition that links when one state (the parent) should transition
 * to another state (the child).
 */
export class StateTransition<
  Parent extends StateBehaviorBuilder = StateBehaviorBuilder,
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  readonly parentState: Parent
  readonly childState: Child
  public readonly constructorArgs: StateTransitionInfo<Parent, Child>['constructorArgs']
  private triggerState: boolean = false
  shouldTransition: (state: InstanceType<Parent>) => boolean
  onTransition: (data: StateMachineData) => void
  name?: string

  constructor ({
    parent,
    child,
    name,
    constructorArgs,
    shouldTransition = (data) => false,
    onTransition = (data) => {}
  }: StateTransitionInfo<Parent, Child>) {
    this.parentState = parent
    this.childState = child
    this.shouldTransition = shouldTransition
    this.onTransition = onTransition
    this.constructorArgs = constructorArgs
    this.name = name
  }

  trigger (): void {
    this.triggerState = true
  }

  isTriggered (): boolean {
    return this.triggerState
  }

  resetTrigger (): void {
    this.triggerState = false
  }

  setShouldTransition (should: (state: InstanceType<Parent>) => boolean): this {
    this.shouldTransition = should
    return this
  }

  setOnTransition (onTrans: (data: StateMachineData) => void): this {
    this.onTransition = onTrans
    return this
  }
}


export class StateBehavior {
  /**
   * Name displayed on the webserver.
   */
  static readonly stateName: string = this.name

  /**
   * Method to clone the behavior, see below.
   */
  static clone = clone

  /**
   * Method to transform the behavior's constructor, see below.
   */
  static transform = transform

  /**
   * Bot the state is related to.
   */
  readonly bot: Bot

  /**
   * Data instance.
   */
  readonly data: StateMachineData

  /**
   * Gets whether or not this state is currently active.
   */
  active: boolean = false

  /**
   * Called when the bot enters this behavior state.
   */
  onStateEntered (): void {}

  /**
   * Called each tick to update this behavior.
   */
  update? (): void {}

  /**
   * Called when the bot leaves this behavior state.
   */
  onStateExited? (): void {}

  /**
   * Called if the behavior is anonymous per tick, checks if task is complete.
   */
  isFinished (): boolean {
    return false
  }

  /**
   * Args is a compatibility hack here. Don't like it, but whatever.
   */
  constructor (bot: Bot, data: StateMachineData) {
    this.bot = bot
    this.data = data
  }
}

/**
 * The parameters for initializing a state transition.
 */
export interface StateTransitionInfo<
  Parent extends StateBehaviorBuilder = StateBehaviorBuilder,
  Child extends StateBehaviorBuilder = StateBehaviorBuilder
> {
  parent: Parent
  child: Child
  constructorArgs: HasArgs<Child> extends Child ? StateConstructorArgs<Child> : never
  name?: string
  shouldTransition?: (state: InstanceType<Parent>) => boolean
  onTransition?: (data: StateMachineData) => void
}



/**
 * Allows for the cloning of StateBehavior class types.
 *
 * @param this
 * @param name
 * @returns
 */
export function clone<T extends StateBehaviorBuilder> (this: T, name?: string): T {
  const ToBuild = class ClonedState extends this.prototype.constructor {}
  Object.getOwnPropertyNames(this.prototype).forEach((name) => {
    Object.defineProperty(
      ToBuild.prototype,
      name,
      Object.getOwnPropertyDescriptor(this.prototype, name) ?? Object.create(null)
    )
  })

  const descriptors = Object.getOwnPropertyDescriptors(this)
  Object.getOwnPropertyNames(this).forEach((name) => {
    if (descriptors[name].writable == null) {
      Object.defineProperty(ToBuild, name, Object.getOwnPropertyDescriptor(this, name) ?? Object.create(null))
    }
  })

  // console.log(ToBuild, this);
  if (name != null) ToBuild.stateName = name
  return ToBuild as unknown as T
}



/**
 * Allows for the transformation of StateBehavior class types.
 *
 * Essentially, clone the class instance and add default variables to pass to constructor.
 *
 * @param this
 * @param name
 * @returns
 */
export function transform<
  T extends StateBehaviorBuilder,
  Args extends CustomNarrow<Partial<StateConstructorArgs<T>>>,
  Len extends Exclude<Args['length'], undefined>,
> (
  this: HasArgs<T>,
  name: string,
  defaultArgs: Args
  // @ts-expect-error This exception catch is because this type definition is technically infinite.
): StateBehaviorBuilder<InstanceType<T>, OmitX<Len, StateConstructorArgs<T>>> {

  const ToBuild = class ClonedState extends this.prototype.constructor {
    constructor (bot: Bot, data: StateMachineData, ...additional: OmitX<Len, StateConstructorArgs<T>>) {
      super(bot, data, ...(defaultArgs as any), ...(additional as any))
    }
  }

  Object.getOwnPropertyNames(this.prototype).forEach((name) => {
    Object.defineProperty(
      ToBuild.prototype,
      name,
      Object.getOwnPropertyDescriptor(this.prototype, name) ?? Object.create(null)
    )
  })

  const descriptors = Object.getOwnPropertyDescriptors(this)
  Object.getOwnPropertyNames(this).forEach((name) => {
    if (descriptors[name].writable == null) {
      Object.defineProperty(ToBuild, name, Object.getOwnPropertyDescriptor(this, name) ?? Object.create(null))
    }
  })

  if (name != null) ToBuild.stateName = name

  // we enforce this typing at runtime, so no need to specify "as T" (as it technically isnt)
  return ToBuild as unknown as any
}
