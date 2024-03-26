// Create your bot
if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : ts-node mining.ts <host> <port> [<name>] [<password>]");
  process.exit(1);
}

import mineflayer from "mineflayer";

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});
// Load your dependency plugins.
bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

// Import required structures.
import { BotStateMachine, getTransition, getNestedMachine, behaviors } from "../../src";
import { get } from "http";

// Import required behaviors.
const {
  BehaviorExit: Exit,
  BehaviorFindBlock: FindBlock,
  BehaviorMineBlock: MineBlock,
} = behaviors;


const blockId = bot.registry.blocksByName.dirt.id;

const MineBlock3Range = MineBlock.transform("MineBlock3Range", [3]);
const FindDirt = FindBlock.transform("FindDirt", [blockId]);

const transitions = [

  getTransition("findToExit", FindDirt, Exit)
    .setShouldTransition((state) => !state.hasFoundBlocks())
    .setOnTransition(() => bot.chat("Could not find entity!"))
    .build(),

  getTransition("findToMine", FindDirt, MineBlock3Range)
    .setShouldTransition((state) => state.hasFoundBlocks())
    .setRuntimeEnterFn((state) => state.getBestBlockPos()!)
    .build(),

  getTransition("mineToFind", MineBlock3Range, FindDirt)
    .setShouldTransition((state) => state.isFinished())
    .build(),
];

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = getNestedMachine("root", transitions, FindBlock)
  .setBuildArgs({ matching: blockId })
  .build();

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({ bot, root, autoStart: false });

// Start the machine anytime using <name>.start()
bot.once("spawn", () => machine.start());
