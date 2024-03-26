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

  getBestBlockPos (): Vec3 | null {
    if (this._foundBlocks.length === 0) return null
    return this._foundBlocks[0]
  }

  onStateEntered (): void {
    this._foundBlocks = this.findBlocks()
  }

  update (): void {
    this._foundBlocks = this.findBlocks()
  }

  findBlocks (): Vec3[] {
    return this.bot.findBlocks(this._opts)
  }
}
