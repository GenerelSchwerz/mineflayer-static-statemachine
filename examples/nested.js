/**
 * Set up your bot: you normally would
 */

if (process.argv.length < 4 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

const mineflayer = require("mineflayer");
const {
  BotStateMachine,
  StateMachineWebserver,
  getTransition,
  getNestedMachine,
  behaviors,
} = require("@nxg-org/mineflayer-static-statemachine");

const {
  BehaviorIdle: Idle,
  BehaviorExit: Exit,
  BehaviorFindEntity: FindEntity,
  BehaviorFollowEntity: FollowEntity,
  BehaviorLookAtEntity: LookAtTarget,
} = behaviors;



const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

const playerFilter = (e) => e.type === "player";
const isFinished = (state) => state.isFinished();

const findAndFollowTransitions = [
  getTransition("findToFollow", FindEntity, FollowEntity)
    .setShouldTransition((state) => state.foundEntity())
    .build(),

  getTransition("followToExit", FollowEntity, Exit).setShouldTransition(isFinished).build(),
];

// const FollowMachine = newNestedStateMachineArgs({
//   stateName: "findAndFollow",
//   transitions: findAndFollowTransitions,
//   enter: FindEntity,
//   exit: Exit,
//   enterArgs: [playerFilter],
// });

const FollowMachine = getNestedMachine("findAndFollow", findAndFollowTransitions, FindEntity, Exit).setBuildArgs(playerFilter).build();

const rootTransitions = [
  getTransition("idleToFind", Idle, FindEntity).setBuildArgs(playerFilter).build(),

  getTransition("findToLook", FindEntity, LookAtTarget).build(),

  getTransition("lookToIdle", LookAtTarget, Idle).build(),

  getTransition("findToTest", FindEntity, FollowMachine).build(),

  getTransition("testToIdle", FollowMachine, Idle).setShouldTransition(isFinished).build(),
];

// const root = newNestedStateMachineArgs({
//   stateName: "root",
//   transitions: secondTransitions,
//   enter: FindEntity,
//   enterArgs: [playerFilter],
// });

const root = getNestedMachine("root", rootTransitions, FindEntity, Idle).setBuildArgs(playerFilter).build();
const stateMachine = new BotStateMachine({ bot, root, autoStart: false });
const webserver = new StateMachineWebserver({ stateMachine });
webserver.startServer();

// added functionality to delay starting machine until bot spawns.
bot.on("spawn", () => stateMachine.start());

const handle = (input) => {
  const split = input.split(" ");
  if (split[0] === "find") rootTransitions[0].trigger();
  if (split[0] === "look") rootTransitions[1].trigger();
  if (split[0] === "come") rootTransitions[3].trigger();
  if (split[0] === "lookstop") rootTransitions[2].trigger();
  if (split[0] === "movestop") rootTransitions[4].trigger();
};

bot.on("chat", (username, message) => handle(message));
