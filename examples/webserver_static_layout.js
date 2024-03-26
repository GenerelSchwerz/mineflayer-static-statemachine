const mineflayer = require("mineflayer");

if (process.argv.length < 3 || process.argv.length > 6) {
  console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
  process.exit(1);
}

const bot = mineflayer.createBot({
  host: process.argv[2],
  port: process.argv[3] ? parseInt(process.argv[3]) : 25565,
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

const {
  BotStateMachine,
  StateMachineWebserver,
  getTransition,
  WebserverBehaviorPositions,
  behaviors,
  getNestedMachine,
} = require("@nxg-org/mineflayer-static-statemachine");

const {
  BehaviorIdle: Idle,
  BehaviorFindEntity: FindEntity,
  BehaviorFollowEntity: FollowTarget,
  BehaviorLookAtEntity: LookAtTarget,
} = behaviors;

// to replicate the original mineflayer-statemachine exactly:
const LookAtPlayers = LookAtTarget.clone("LookAtPlayers");
const LookAtFollowing = LookAtTarget.clone("LookAtFollowing");

const transitions = [
  getTransition('player says "hi"', Idle, FindEntity) // 1
    .setBuildArgs((e) => e.type === "player")
    .setOnTransition(() => bot.chat("hello"))
    .build(),

  getTransition("closestToLook", FindEntity, LookAtPlayers) // 2
    .setShouldTransition(() => true)
    .build(),

  getTransition('player says "bye"', LookAtPlayers, Idle) // 3
    .setOnTransition(() => bot.chat("goodbye"))
    .build(),

  getTransition('player says "come"', LookAtPlayers, FollowTarget) // 4
    .setOnTransition(() => bot.chat("coming"))
    .build(),

  getTransition('player says "stay"', FollowTarget, LookAtPlayers) // 5
    .setOnTransition(() => bot.chat("stay"))
    .build(),

  getTransition('player says "bye"', FollowTarget, Idle) // 6
    .setOnTransition(() => bot.chat("goodbye"))
    .build(),

  getTransition("closeToTarget", FollowTarget, LookAtFollowing) // 7
    .setShouldTransition((state) => state.distanceToTarget() < 3)
    .build(),

  getTransition("farFromTarget", LookAtFollowing, FollowTarget) // 8
    .setShouldTransition((state) => state.distanceToTarget() >= 3)
    .build(),

  getTransition('player says "bye"', LookAtFollowing, Idle) // 9
    .setOnTransition(() => bot.chat("goodbye"))
    .build(),

  getTransition('player says "stay"', LookAtFollowing, LookAtPlayers) // 10
    .build(),
];

const root = getNestedMachine("root", transitions, Idle).build();

const stateMachine = new BotStateMachine({ bot, root, autoStart: false });

const behaviorPositions = new WebserverBehaviorPositions();
behaviorPositions
  .set(Idle, 400, 100)
  .set(LookAtPlayers, 400, 300)
  .set(FollowTarget, 100, 400)
  .set(FindEntity, 700, 100)
  .set(LookAtFollowing, 700, 400);

const webserver = new StateMachineWebserver({ stateMachine, presetPositions: behaviorPositions });
webserver.startServer();

bot.once("spawn", () => {
  stateMachine.start();

  bot.on("chat", (username, message) => {
    if (message === "hi") {
      transitions[0].trigger();
    }

    if (message === "bye") {
      transitions[2].trigger();
      transitions[5].trigger();
      transitions[8].trigger();
    }

    if (message === "come") {
      transitions[3].trigger();
    }

    if (message === "stay") {
      transitions[4].trigger();
      transitions[9].trigger();
    }
  });
});
