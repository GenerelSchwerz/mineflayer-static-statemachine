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
import { BotStateMachine, getTransition, getNestedMachine, StateMachineWebserver, behaviors } from "../../src";

// Import required behaviors.
const { BehaviorExit: Exit, BehaviorFindBlock: FindBlock, BehaviorMineBlock: MineBlock, BehaviorGoto: Goto } = behaviors;

let rootMachine: BotStateMachine<any, any>;

function createStateMachine(targetName: string, distance = 16, stopAfterOne = false) {
  const blockId = bot.registry.blocksByName[targetName].id;

  const MineBlock3Range = MineBlock.transform("MineBlock3Range", [4]);
  const FindMatchingBlock = FindBlock.transform(`FindBlock: ${targetName}`, [{ matching: blockId, distance }]);
  const Goto2Blocks = Goto.transform("Goto2Blocks", [{ range: 1 }]);

  const transitions = [
    getTransition("findToExit", FindMatchingBlock, Exit)
      .setShouldTransition((state) => !state.hasFoundBlocks())
      .setOnTransition(() => bot.chat("Could not find block!"))
      .build(),

    getTransition("findToMine", FindMatchingBlock, MineBlock3Range)
      .setShouldTransition((state) => state.hasFoundBlocks())
      .setRuntimeEnterFn((state) => state.getBestBlockPos()!)
      .setOnTransition(() => bot.chat("Found block!"))
      .build(),

    getTransition("mineToGoto", MineBlock3Range, Goto2Blocks)
      .setShouldTransition((state) => state.targetVec != null && !state.isInRange())
      .setRuntimeEnterFn((state) => state.targetVec!) // TODO: provide empty case to default back to original.
      .setOnTransition(() => bot.chat("need to walk!"))
      .build(),

    getTransition("gotoToMine", Goto2Blocks, MineBlock3Range)
      .setShouldTransition((state) => state.isFinished())
      .setRuntimeEnterFn((state) => state.goalVec!)
      .setOnTransition(() => bot.chat("got to block!"))
      .build(),

    stopAfterOne ?
      getTransition("mineToExit", MineBlock3Range, Exit)
        .setShouldTransition((state) => state.isFinished())
        .setOnTransition(() => bot.chat("Finished mining, exiting..."))
        .build()
    :
      getTransition("mineToFind", MineBlock3Range, FindMatchingBlock)
        .setShouldTransition((state) => state.isFinished())
        .setOnTransition(() => bot.chat("Finished mining, finding new block!"))
        .build()
     
  ];

  // Now we just wrap our transition list in a nested state machine layer. We want the bot
  // to start on the getClosestPlayer state, so we'll specify that here.
  // We can specify entry arguments to our entry class here as well.
  const root = getNestedMachine("root", transitions, FindMatchingBlock, Exit).build();

  // We can start our state machine simply by creating a new instance.
  // We can delay the start of our machine by using autoStart: false
  return new BotStateMachine({ bot, root, autoStart: false });
}

const webserver = new StateMachineWebserver({});
webserver.startServer();

bot.once("spawn", async () => {
  await bot.waitForChunksToLoad();
});

bot.on('end', console.info)

bot.on("chat", (username, message) => {
  const [cmd, ...args] = message.split(" ");

  switch (cmd) {
    case "mine":
      if (rootMachine != null) rootMachine.stop();
      rootMachine = createStateMachine(args[0], 16, false);
      webserver.loadStateMachine(rootMachine);
      rootMachine.start();
      break;

    case "mineone":
      if (rootMachine != null) rootMachine.stop();
      rootMachine = createStateMachine(args[0], 16, true);
      webserver.loadStateMachine(rootMachine);
      rootMachine.start();
      break;

    case "stop":
      if (!rootMachine) {
        bot.chat("Machine not started!");
        return;
      }

      rootMachine.stop();
      break;
  }
});
