import { Bot } from 'mineflayer'
import { StateBehavior, StateMachineData } from '../stateBehavior'
import type { Block } from 'prismarine-block'
import { Vec3 } from 'vec3'

export class BehaviorMineBlock extends StateBehavior {
  private _targetVec: Vec3 | null = null
  private _targetBlock: Block | null = null
  public readonly range: number

  public isCompleted = false

  public get targetVec (): Vec3 | null {
    return this._targetVec
  }

  public get targetBlock (): Block | null {
    return this._targetBlock
  }

  constructor (bot: Bot, data: StateMachineData, range: number) {
    super(bot, data)
    this.range = range
  }

  isFinished (): boolean {
    return this.isCompleted
  }

  async onStateEntered (blockPos: Vec3): Promise<void> {
    this._targetVec = blockPos
    this._targetBlock = this.bot.blockAt(blockPos)
    if (this._targetBlock == null) {
      throw new Error('Block is null')
    }

    await this.bot.dig(this._targetBlock)
    this.isCompleted = true
  }

  private aabbDistance (org: Vec3, targetMinVec: Vec3, targetMaxVec: Vec3): number {
    const x = Math.max(targetMinVec.x - org.x, 0, org.x - targetMaxVec.x)
    const y = Math.max(targetMinVec.y - org.y, 0, org.y - targetMaxVec.y)
    const z = Math.max(targetMinVec.z - org.z, 0, org.z - targetMaxVec.z)
    return Math.sqrt(x * x + y * y + z * z)
  }

  isInRange (): boolean {
    if (this._targetVec == null) throw new Error('No targetVec loaded')

    const targetMinVec = this._targetVec
    const targetMaxVec = targetMinVec.offset(1, 1, 1)

    const eyePos = this.bot.entity.position.offset(0, this.bot.entity.height, 0)

    return this.aabbDistance(eyePos, targetMinVec, targetMaxVec) < this.range
  }

  onStateExited(): void {
    this.isCompleted = false
    this._targetVec = null
    this._targetBlock = null
  }
}
