import { BotStateMachine, NestedStateMachine, StateBehavior } from './index'
import socketLoader, { Socket } from 'socket.io'
import path from 'path'
import express from 'express'
import httpLoader from 'http'
import { isNestedStateMachine, StateBehaviorBuilder, WebserverBehaviorPositionIterable } from './util'

import type { Express } from 'express'
import EventEmitter from 'events'

const publicFolder = './../web'

// provide positioning for both specific-to-machine states and globally as a backup.
export class WebserverBehaviorPositions {
  protected storage: { [name: string]: { x: number, y: number } | undefined } = {}
  constructor (items?: WebserverBehaviorPositionIterable) {
    if (items != null) {
      for (const item of items) {
        this.storage[this.getName(item.state, item.parentMachine)] = { x: item.x, y: item.y }
      }
    }
  }

  private getName (state: StateBehaviorBuilder, parentMachine?: typeof NestedStateMachine): string {
    if (parentMachine != null) return parentMachine.name + parentMachine.stateName + state.name + state.stateName
    return state.name + state.stateName
  }

  public has (state: StateBehaviorBuilder, parentMachine?: typeof NestedStateMachine): boolean {
    if (parentMachine != null) {
      const flag = !(this.storage[parentMachine.name + parentMachine.stateName + state.name + state.stateName] == null)
      if (!flag) return !(this.storage[state.name + state.stateName] == null)
      return true
    }
    return !(this.storage[state.name + state.stateName] == null)
  }

  public get (state: StateBehaviorBuilder, parentMachine?: typeof NestedStateMachine): { x: number | undefined, y: number | undefined } {
    if (!this.has(state, parentMachine)) return { x: undefined, y: undefined }
    if (parentMachine != null) {
      return (
        this.storage[parentMachine.name + parentMachine.stateName + state.name + state.stateName] ??
        this.storage[state.name + state.stateName] ?? { x: undefined, y: undefined }
      )
    } else {
      return this.storage[state.name + state.stateName] ?? { x: undefined, y: undefined }
    }
  }

  public set (state: StateBehaviorBuilder, x: number, y: number, parentMachine?: typeof NestedStateMachine): this {
    if (this.has(state, parentMachine)) throw Error('State has already been added!')
    const key = this.getName(state, parentMachine)
    this.storage[key] = { x, y }
    return this
  }

  public removeState (state: StateBehaviorBuilder, parentMachine?: typeof NestedStateMachine): this {
    const key = this.getName(state, parentMachine)
    this.storage[key] = undefined
    return this
  }

  public clear (): this {
    for (const key in this.storage) this.storage[key] = undefined
    return this
  }
}

/**
 * A web server which allows users to view the current state of the
 * bot behavior state machine.
 */
export class StateMachineWebserver extends EventEmitter {
  private serverRunning: boolean = false

  readonly presetPositions?: WebserverBehaviorPositions
  readonly port: number

  private lastMachine: typeof NestedStateMachine | undefined
  private lastState: StateBehaviorBuilder | undefined

  private _stateMachine?: BotStateMachine<any, any>
  private readonly _app?: Express
  private _http?: httpLoader.Server<typeof httpLoader.IncomingMessage, typeof httpLoader.ServerResponse>
  private _io?: socketLoader.Server

  /**
   * Creates and starts a new webserver.
   * @param stateMachine - The state machine being observed.
   * @param port - The port to open this server on.
   */
  constructor ({
    stateMachine,
    presetPositions,
    port = 8934
  }: {
    stateMachine?: BotStateMachine<any, any>
    presetPositions?: WebserverBehaviorPositions
    port?: number
  }) {
    super()
    this._stateMachine = stateMachine
    this.port = port
    this.presetPositions = presetPositions
    this.lastMachine = undefined
    this.lastState = undefined

    this._app = express()
    this._app.use('/web', express.static(path.join(__dirname, publicFolder)))
    this._app.get('/', (req, res) => res.sendFile(path.join(__dirname, publicFolder, 'index.html')))
  }

  /**
   * Accessor for the express app.
   */
  public get app (): Express {
    if (this._app == null) throw new Error('App is not instantiated!')
    return this._app
  }

  /**
   * Accessor for the http server.
   */
  public get http (): httpLoader.Server<typeof httpLoader.IncomingMessage, typeof httpLoader.ServerResponse> {
    if (this._http == null) throw new Error('Http is not instantiated!')
    return this._http
  }

  /**
   * Accessor for the socket.io server.
   */
  public get io (): socketLoader.Server {
    if (this._io == null) throw new Error('Socket is not instantiated!')
    return this._io
  }

  /**
   * Accessor for the state machine being observed.
   */
  public get stateMachine (): BotStateMachine<any, any> | undefined {
    return this._stateMachine
  }

  /**
   * Checks whether or not this server is currently running.
   */
  isServerRunning (): boolean {
    return this.serverRunning
  }

  /**
   * Configures and starts a basic static web server.
   */
  startServer (): void {
    if (this.serverRunning) {
      throw new Error('Server already running!')
    }

    this.serverRunning = true

    this._http = httpLoader.createServer(this._app)

    // @ts-expect-error ; Why? Not sure. Probably a type-def loading issue. Either way, it's safe.
    this._io = socketLoader(this.http)

    this.io.on('connection', (socket: Socket) => this.onConnected(socket))

    this._http.listen(this.port, () => this.onStarted())
  }

  /**
   * Stops the web server.
   */
  stopServer (): void {
    if (!this.serverRunning) {
      throw new Error('Server already stopped!')
    }

    this.serverRunning = false

    // also closes the http server.
    this.io.close()
    setImmediate(this.onStopped.bind(this))
  }

  loadStateMachine (stateMachine: BotStateMachine<any, any>): void {
    this._stateMachine = stateMachine
    this.lastMachine = undefined
    this.emit('switchedRoot', stateMachine)
  }

  /**
   * Called when the web server is started.
   */
  private onStarted (): void {
    console.log(`Started state machine web server at http://localhost:${this.port}.`)
  }

  /**
   * Called when stopping the web server.
   */
  private onStopped (): void {
    console.log(`Stopped state machine web server at http://localhost:${this.port}.`)
  }

  /**
   * Called when a web socket connects to this server.
   */
  private onConnected (socket: Socket): void {
    console.log(`Client ${socket.handshake.address} connected to webserver.`)

    this.http.once('close', () => socket.disconnect())

    this.initStateMachineData(socket)

    this.applyStateMachineListenersToSocket(socket, this.stateMachine)
  }

  /**
   * Send packet to client with the current state machine structure.
   */
  private initStateMachineData (socket: Socket): void {
    if (this.stateMachine === undefined) {
      this.sendBlankStructure(socket)
      return
    }

    this.sendStatemachineStructure(socket)
    if (this.lastMachine != null && this.lastState != null) this.updateClient(socket, this.lastMachine, this.lastState)
  }

  /**
   * Applies listeners to a socket.
   */
  private applyStateMachineListenersToSocket (socket: Socket, stateMachine?: BotStateMachine<any, any>): void {
    const updateClient = (type: typeof NestedStateMachine, _: NestedStateMachine, state: StateBehaviorBuilder): void =>
      this.updateClient(socket, type, state)

    const clearClient = (type: typeof NestedStateMachine): void => this.updateClient(socket, type, undefined)
    stateMachine?.on('stateEntered', updateClient)
    stateMachine?.on('stateExited', clearClient)

    socket.once('disconnect', () => {
      stateMachine?.removeListener('stateEntered', updateClient)
      stateMachine?.removeListener('stateExited', clearClient)

      console.log(`Client ${socket.handshake.address} disconnected from webserver.`)
    })

    this.once('switchedRoot', (newMachine) => {
      stateMachine?.removeListener('stateEntered', updateClient)
      stateMachine?.removeListener('stateExited', clearClient)
      this.applyStateMachineListenersToSocket(socket, newMachine)
      this.initStateMachineData(socket)

      console.log(`Client ${socket.handshake.address} was removed from stateMachine due to switch.`)
    })
  }

  private sendStatemachineStructure (socket: Socket): void {
    const states = this.getStates()
    const transitions = this.getTransitions()
    const nestGroups = this.getNestGroups()

    const packet: StateMachineStructurePacket = {
      states,
      transitions,
      nestGroups
    }

    socket.emit('loadMachine', packet)
  }

  private sendBlankStructure (socket: Socket): void {
    const packet: StateMachineStructurePacket = {
      states: [],
      transitions: [],
      nestGroups: []
    }

    socket.emit('loadMachine', packet)
  }

  private updateClient (socket: Socket, nested: typeof NestedStateMachine, state: StateBehaviorBuilder | undefined): void {
    if (state == null) {
      socket.emit('stateChanged', { activeStates: [] })
      return
    }

    const activeStates: number[] = []
    const index = this.getStateId(state, nested)

    if (index > -1) {
      activeStates.push(index)
    }

    const packet: StateMachineUpdatePacket = {
      activeStates
    }

    socket.emit('stateChanged', packet)
    this.lastMachine = nested
    this.lastState = state
  }

  /**
   * Code for finding the id of a state given its host's machine.
   * ONLY PROVIDE STATE AND TARGETMACHINE.
   *
   * Note: This may fail if there are multiple of the same nested state machine used.
   * I can fix that if people raise an issue, but that seems like extremely contrived behavior.
   *
   * @param state State we want the id for relative to its machine
   * @param targetMachine the machine we want to search.
   * @param searching The machine we are currently searching (always start at root)
   * @param data object to allow pointer passing for recursion (lol js)
   * @returns id of state.
   */
  private getStateId (
    state: typeof StateBehavior,
    targetMachine: typeof NestedStateMachine,
    // eslint-disable-next-line
    searching: typeof NestedStateMachine = this.stateMachine!.rootType,
    data = { offset: 0 }
  ): number {
    for (let i = 0; i < searching.states.length; i++) {
      const foundState = searching.states[i]
      if (foundState === state && searching === targetMachine) {
        return data.offset
      }
      data.offset++

      if (isNestedStateMachine(foundState)) {
        const ret = this.getStateId(state, targetMachine, foundState, data)
        if (ret !== -1) return ret
      }
    }

    return -1
  }

  // Don't mind this stupid object -> pointer hack.
  // note: this matches the pattern found locally.
  // note: slight speedup possible by passing array by pointers as well.

  private getStates (
    // eslint-disable-next-line
    nested: typeof NestedStateMachine = this.stateMachine!.rootType,
    data = { index: 0, offset: 0 },
    offset = 0
  ): StateMachineStatePacket[] {
    const states: StateMachineStatePacket[] = []

    for (let i = 0; i < nested.states.length; i++) {
      const state = nested.states[i]
      states.push({
        id: data.index++,
        name: state.stateName !== StateBehavior.stateName ? state.stateName : state.name,
        nestGroup: offset,
        ...this.presetPositions?.get(state, nested)
      })
      if (isNestedStateMachine(state)) {
        states.push(...this.getStates(state, data, offset + ++data.offset))
      }
    }

    return states
  }

  private getTransitions (): StateMachineTransitionPacket[] {
    if (this.stateMachine == null) return []

    const transitions: StateMachineTransitionPacket[] = []
    for (let i = 0; i < this.stateMachine.nestedMachinesHelp.length; i++) {
      const machine = this.stateMachine.nestedMachinesHelp[i]
      const foundTransitions = machine.transitions
      for (let k = 0; k < foundTransitions.length; k++) {
        const transition = foundTransitions[k]
        for (let l = 0; l < transition.parentStates.length; l++) {
          const parentState = transition.parentStates[l]
          transitions.push({
            id: i,
            name: transition.name,
            parentState: this.getStateId(parentState, machine),
            childState: this.getStateId(transition.childState, machine)
          })
        }
      }
    }

    return transitions
  }

  private getNestGroups (): NestedStateMachinePacket[] {
    if (this.stateMachine == null) return []

    const nestGroups: NestedStateMachinePacket[] = []

    for (let i = 0; i < this.stateMachine.nestedMachinesHelp.length; i++) {
      const machine = this.stateMachine.nestedMachinesHelp[i]
      const depth = this.stateMachine.getNestedMachineDepth(machine)
      nestGroups.push({
        id: i,
        enter: this.getStateId(machine.enter, machine),
        exits: machine.exits != null ? machine.exits.map((exit) => this.getStateId(exit, machine)) : undefined,
        indent: depth,
        name: machine.stateName
      })
    }

    return nestGroups
  }
}

interface StateMachineStructurePacket {
  states: StateMachineStatePacket[]
  transitions: StateMachineTransitionPacket[]
  nestGroups: NestedStateMachinePacket[]
}

interface NestedStateMachinePacket {
  id: number
  enter: number
  exits?: number[]
  indent: number
  name?: string
}

interface StateMachineStatePacket {
  id: number
  name: string
  x?: number
  y?: number
  nestGroup: number
}

interface StateMachineTransitionPacket {
  id: number
  name?: string
  parentState: number
  childState: number
}

interface StateMachineUpdatePacket {
  activeStates: number[]
}
