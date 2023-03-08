import EventEmitter from 'events'
import { Bot } from 'mineflayer'
import { StrictEventEmitter } from 'strict-event-emitter-types'
import { StateBehavior, StateTransition, StateMachineData } from './stateBehavior'
import { clone, HasArgs, StateBehaviorBuilder, StateConstructorArgs, transform } from './util'

export interface NestedStateMachineOptions<Enter extends StateBehaviorBuilder, Exit extends StateBehaviorBuilder> {
  stateName: string
  transitions: Array<StateTransition<any, any>>
  enter: Enter
  enterArgs: HasArgs<Enter> extends Enter ? StateConstructorArgs<Enter> : never
  exit?: Exit
  enterIntermediateStates?: boolean
}

export interface NestedMachineEvents {
  stateEntered: (cls: NestedStateMachine, newBehavior: StateBehaviorBuilder, data: StateMachineData) => void
  stateExited: (cls: NestedStateMachine, oldBehavior: StateBehaviorBuilder, data: StateMachineData) => void
}

export class NestedStateMachine
  extends (EventEmitter as new () => StrictEventEmitter<EventEmitter, NestedMachineEvents>)
  implements StateBehavior {
  public static readonly stateName: string = this.name
  public static readonly transitions: StateTransition[]
  public static readonly states: StateBehaviorBuilder[]
  public static readonly enter: StateBehaviorBuilder
  public static readonly enterArgs: any[] | undefined = undefined // StateConstructorArgs<typeof this.enter>; // sadly, this is always undefined (no static generics).
  public static readonly exit?: StateBehaviorBuilder
  public static readonly enterIntermediateStates: boolean

  public static readonly clone = clone

  public static readonly transform = transform

  // not correct but whatever.
  public static readonly onStartupListeners: Array<
  [key: keyof NestedMachineEvents, listener: NestedMachineEvents[keyof NestedMachineEvents]]
  >

  protected _activeStateType?: StateBehaviorBuilder
  protected _activeState?: StateBehavior

  public readonly bot: Bot
  public readonly data: StateMachineData
  public active: boolean = false

  public constructor (bot: Bot, data: StateMachineData) {
    // eslint-disable-next-line constructor-super
    super()
    this.bot = bot
    this.data = data
    for (const listener of this.staticRef.onStartupListeners) {
      this.on(listener[0], listener[1])
    }
  }

  static addEventualListener<Key extends keyof NestedMachineEvents>(key: Key, listener: NestedMachineEvents[Key]): void {
    if (this.onStartupListeners.find((l) => l[0] === key) != null) return
    this.onStartupListeners.push([key, listener])
  }

  /**
   * Getter (does not actually get specific type, so class may not match)
   */
  public get staticRef (): typeof NestedStateMachine {
    return this.constructor as typeof NestedStateMachine
  }

  /**
   * Getter
   */
  public get activeStateType (): StateBehaviorBuilder | undefined {
    return this._activeStateType
  }

  /**
   * Getter
   */
  public get activeState (): StateBehavior | undefined {
    return this._activeState
  }

  /**
   * Getter
   */
  public get transitions (): StateTransition[] {
    return (this.constructor as typeof NestedStateMachine).transitions
  }

  /**
   * Getter
   */
  public get states (): StateBehaviorBuilder[] {
    return (this.constructor as typeof NestedStateMachine).states
  }

  /**
   * Getter
   */
  public get stateName (): string {
    return (this.constructor as typeof NestedStateMachine).stateName
  }

  public onStateEntered (): void {
    this._activeStateType = this.staticRef.enter
    this.enterState(this._activeStateType, this.bot, this.staticRef.enterArgs)
  }

  public onStateExited (): void {
    this.exitActiveState()
    this._activeStateType = undefined
    this._activeState = undefined
  }

  protected enterState (EnterState: StateBehaviorBuilder, bot: Bot, additional: any[] = []): void {
    this._activeState = new EnterState(bot, this.data, ...additional)
    this._activeState.active = true
    this.emit('stateEntered', this, EnterState, this.data)
    this._activeState.onStateEntered?.()
    this._activeState.update?.()
  }

  protected exitActiveState (): void {
    if (this._activeStateType == null) return
    if (this._activeState == null) return
    this._activeState.active = false
    this.emit('stateExited', this, this._activeStateType, this.data)
    this._activeState.onStateExited?.()
  }

  public update (): void {
    // update will only occur when this is active anyway, so return if not.
    if (this._activeState == null) return
    this._activeState.update?.()
    let lastState = this._activeStateType
    const transitions = this.staticRef.transitions
    let args: any[] | undefined
    for (let i = 0; i < transitions.length; i++) {
      const transition = transitions[i]
      if (transition.parentState === this._activeStateType) {
        if (transition.isTriggered() || transition.shouldTransition(this._activeState)) {
          transition.resetTrigger()
          i = -1
          transition.onTransition(this.data)
          this.exitActiveState()
          this._activeStateType = transition.childState
          args = transition.constructorArgs
          if (this.staticRef.enterIntermediateStates) {
            lastState = transition.childState
            this.enterState(lastState, this.bot, args)
          }
        }
      } else {
        transition.resetTrigger() // always reset to false to avoid false positives.
      }
    }

    if (this._activeStateType != null && this._activeStateType !== lastState) {
      this.enterState(this._activeStateType, this.bot, args)
    }
  }

  /**
   * Checks whether or not this state machine layer has finished running.
   */
  public isFinished (): boolean {
    if (this.active == null) return true
    if (this.staticRef.exit == null) return false
    return this._activeStateType === this.staticRef.exit
  }
}
