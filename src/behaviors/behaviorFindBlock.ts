import type { Vec3 } from 'vec3'
import type { Bot } from 'mineflayer'

import { StateBehavior, StateMachineData } from '../stateBehavior'

export class BehaviorFindBlock extends StateBehavior {
  private _foundBlocks: Vec3[] = []
  private readonly _opts: Parameters<Bot['findBlocks']>[0]

  public get foundBlocks (): Vec3[] {
    return this._foundBlocks
  }

  constructor (bot: Bot, data: StateMachineData, opts: Parameters<Bot['findBlocks']>[0]) {
    super(bot, data)
    this._opts = opts
  }

  hasFoundBlocks (): boolean {
    return this._foundBlocks.length > 0
  }

  private aabbDistance (org: Vec3, targetMinVec: Vec3, targetMaxVec: Vec3): number {
    const x = Math.max(targetMinVec.x - org.x, 0, org.x - targetMaxVec.x)
    const y = Math.max(targetMinVec.y - org.y, 0, org.y - targetMaxVec.y)
    const z = Math.max(targetMinVec.z - org.z, 0, org.z - targetMaxVec.z)
    return Math.sqrt(x * x + y * y + z * z)
  }

  getBestBlockPos (): Vec3 | null {
    if (this._foundBlocks.length === 0) return null
    const eyePos = this.bot.entity.position.offset(0, this.bot.entity.height, 0)
    
    let bestBlock = this._foundBlocks[0]

    let bestDistance = this.aabbDistance(eyePos, bestBlock, bestBlock.offset(1, 1, 1))

    for (const block of this._foundBlocks) {
      const distance = this.aabbDistance(eyePos, block, block.offset(1, 1, 1))
      if (distance < bestDistance) {
        bestBlock = block
        bestDistance = distance
      }
    }

    return bestBlock
  }

  onStateEntered (): void {
    this._foundBlocks = this.findBlocks()
  }

  onStateExited(): void {
    this._foundBlocks = []
  
  }

  update (): void {
    this._foundBlocks = this.findBlocks()
  }

  findBlocks (): Vec3[] {
    return this.bot.findBlocks(this._opts)
  }


}
