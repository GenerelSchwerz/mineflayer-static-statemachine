import { goals, Movements } from 'mineflayer-pathfinder'
import { StateBehavior, StateMachineData } from '../stateBehavior'
import type { Bot } from 'mineflayer'
import { Vec3 } from 'vec3'

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorGoto extends StateBehavior {
  static stateName = 'Goto'
  movements: Movements
  range: number

  private _goalVec: Vec3 | null = null

  public get goalVec (): Vec3 | null {
    return this._goalVec
  }

  constructor (bot: Bot, data: StateMachineData, options?: { movements?: Movements, range?: number }) {
    super(bot, data)
    this.movements = options?.movements ?? new Movements(bot)
    this.range = options?.range ?? 2
  }

  onStateEntered (pos: Vec3): void {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.bot.pathfinder) throw Error('Pathfinder is not loaded!')

    this._goalVec = pos
    this.startMoving(pos)
  }

  update (): void {
    if (this._goalVec == null) throw Error('No goalVec loaded')
    this.startMoving(this._goalVec)
  }

  onStateExited (): void {
    this.stopMoving()
  }

  isFinished (): boolean {
    const distances = this.distanceToTarget()
    return distances < 3
  }

  distanceToTarget (): number {
    if (this._goalVec == null) return -1
    return this.bot.entity.position.distanceTo(this._goalVec)
  }

  setFollowTarget (goal: Vec3): void {
    if (this._goalVec === goal) return
    this._goalVec = goal
    this.restart()
  }

  restart (): void {
    if (!this.active) throw Error('State is not active')
    if (this._goalVec == null) throw Error('No pathfinder target loaded.')

    this.stopMoving()
    this.startMoving(this._goalVec)
  }

  private startMoving (pos: Vec3): void {
    if (this.movements == null) throw Error('No movements loaded!')
    if (pos === this._goalVec && this.bot.pathfinder.isMoving()) return
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, this.range)
    this.bot.pathfinder.setMovements(this.movements)
    this.bot.pathfinder.setGoal(goal, true)
  }

  private stopMoving (): void {
    this.bot.pathfinder.stop()
  }
}
