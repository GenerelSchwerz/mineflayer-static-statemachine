import { goals, Movements } from 'mineflayer-pathfinder'
import { StateBehavior, StateMachineData } from '../stateBehavior'
import type { Bot } from 'mineflayer'
import type { Entity } from 'prismarine-entity'

/**
 * Causes the bot to follow the target entity.
 *
 * This behavior relies on the mineflayer-pathfinding plugin to be installed.
 */
export class BehaviorFollowEntity extends StateBehavior {
  static stateName = 'followEntity'
  movements: Movements
  followDistance: number

  constructor (bot: Bot, data: StateMachineData, options?: { movements?: Movements, followDistance?: number }) {
    super(bot, data)
    this.movements = options?.movements ?? new Movements(bot)
    this.followDistance = options?.followDistance ?? 2
  }

  onStateEntered = (): void => {
    // eslint-disable-next-line @typescript-eslint/strict-boolean-expressions
    if (!this.bot.pathfinder) throw Error('Pathfinder is not loaded!')
    if (this.data.entity == null) throw Error('No pathfinder target loaded.')

    this.startMoving(this.data.entity)
  }

  update (): void {
    if (this.data.entity == null) throw Error('No pathfinder target loaded.')
    this.startMoving(this.data.entity)
  }

  onStateExited (): void {
    this.stopMoving()
  }

  isFinished (): boolean {
    const distances = this.distanceToTarget()
    return distances < 3
  }

  distanceToTarget (): number {
    if (this.data.entity == null) return -1
    return this.bot.entity.position.distanceTo(this.data.entity.position)
  }

  setFollowTarget (entity: Entity): void {
    if (this.data === entity) return
    this.data.entity = entity
    this.restart()
  }

  restart (): void {
    if (!this.active) throw Error('State is not active')
    if (this.data.entity == null) throw Error('No pathfinder target loaded.')

    this.stopMoving()
    this.startMoving(this.data.entity)
  }

  private startMoving (entity: Entity): void {
    if (this.movements == null) throw Error('No movements loaded!')
    if (entity === this.data.entity && this.bot.pathfinder.isMoving()) return
    const goal = new goals.GoalFollow(entity, this.followDistance)
    this.bot.pathfinder.setMovements(this.movements)
    this.bot.pathfinder.setGoal(goal, true)
  }

  private stopMoving (): void {
    this.bot.pathfinder.stop()
  }
}
