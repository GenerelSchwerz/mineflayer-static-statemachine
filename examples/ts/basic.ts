// Create your bot


if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
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
import { BotStateMachine, buildTransition, buildNestedMachine, StateBehavior } from "../../src";

// Import required behaviors.
import {
  BehaviorExit as Exit,
  BehaviorFindEntity as FindTarget,
  BehaviorFollowEntity,
  BehaviorLookAtEntity as LookAtTarget,
  BehaviorFindEntity,
} from "../../src/behaviors";
import { Movements } from "mineflayer-pathfinder";

// Util function to find the nearest player.
const nearestPlayer = (e) => e.type === "player";


const FindPlayer = FindTarget.transform("FindPlayer", [e => e.type === "player"])
const FollowTarget = BehaviorFollowEntity.transform("test", [{followDistance: 1}])

const transitions = [
  // If we do not find an entity, we should exit this machine.
  // We will transition if we have not found an entity.
  // On our transition, say a message that other players can see.
  buildTransition("findToFollow", FindPlayer, Exit)
    .setShouldTransition((state) => !state.foundEntity())
    .setOnTransition(() => bot.chat("Could not find entity!")),

  // We want to start following the player immediately after finding them.
  // Since BehaviorFindEntity finishes instantly, we will transition almost immediately.
  buildTransition("findToFollow", FindPlayer, FollowTarget)
    .setShouldTransition((state) => state.foundEntity()),

  // If the distance to the player is less than two blocks, switch from the followPlayer
  // state to the lookAtPlayer state.
  buildTransition("followToLook", FollowTarget, LookAtTarget)
    .setShouldTransition((state) => state.distanceToTarget() < 2),

  // If the distance to the player is more than two blocks, switch from the lookAtPlayer
  // state to the followPlayer state.
  buildTransition("lookToFollow", LookAtTarget, FollowTarget)
    .setShouldTransition((state) => state.distanceToTarget() >= 2),
];

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = buildNestedMachine("rootLayer", transitions, FindPlayer, Exit);

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({ bot, root, autoStart: false });

// Start the machine anytime using <name>.start()
bot.once("spawn", () => machine.start());
