import { StateBehavior } from '../stateBehavior'
import type { Block } from 'prismarine-block'

export class BehaviorMineBlock extends StateBehavior {
  onStateEntered (block: Block): void {
    void this.bot.dig(block)
  }
}
