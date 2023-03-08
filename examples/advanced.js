
if (process.argv.length < 4 || process.argv.length > 6) {
    console.log("Usage : node lookatplayers.js <host> <port> [<name>] [<password>]");
    process.exit(1);
}

const mineflayer = require('mineflayer');

// Create your bot
const bot = mineflayer.createBot({
  host: process.argv[2],
  port: parseInt(process.argv[3]),
  username: process.argv[4] ? process.argv[4] : "statemachine_bot",
  password: process.argv[5],
});

// Load your dependency plugins.
bot.loadPlugin(require("mineflayer-pathfinder").pathfinder);

// Import required structures.
const {
  BotStateMachine,
  buildTransition,
  buildNestedMachine,
  StateBehavior,
  StateMachineWebserver
} = require("@nxg-org/mineflayer-statemachine");

// Import required behaviors.
const {
  BehaviorIdle : Idle,
  BehaviorExit : Exit,
  BehaviorFindEntity : FindEntity,
  BehaviorLookAtEntity : LookAtTarget,
  BehaviorFollowEntity : FollowEntity,
} = require("@nxg-org/mineflayer-statemachine/lib/behaviors")

// Have a class that requires arguments and you're too lazy to provide them every time?
// No worries, now you can transform this class into a new one using these provided arguments!
// Yes, it's strongly typed. Don't ask how, it took a while.
const FindPlayer = FindEntity.transform("FindPlayer", [e=>e.type === "player"])
const CustomFollowEntity = FollowEntity.transform("FollowPlayer", [{followDistance: 2}])

const comeToMeTransitions = [
  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  buildTransition("findToFollow", FindPlayer, CustomFollowEntity)
    .setShouldTransition(state => state.foundEntity())
    .setOnTransition(() => bot.chat('Found entity!')),

  buildTransition('followToExit', CustomFollowEntity, Exit)
    .setShouldTransition(state => state.isFinished())
    .setOnTransition(() => bot.chat('Reached goal, finishing!'))
]

const comeMachine = buildNestedMachine('comeToMe', comeToMeTransitions, FindPlayer, Exit)

const followAndLookTransitions = [

  // manual wildcard!
  buildTransition('wildcardExit', StateBehavior, Exit),

  buildTransition("findToExit", FindPlayer, Exit)
    .setShouldTransition(state => !state.foundEntity())
    .setOnTransition(() => bot.chat('Failed to find entity!')),

  buildTransition("findToLook", FindPlayer, LookAtTarget)
    .setShouldTransition(state => state.foundEntity()),

  buildTransition("lookToFollow", LookAtTarget, CustomFollowEntity)
    .setShouldTransition(state => state.distanceToTarget() > 2),

  buildTransition("followToLook", CustomFollowEntity, LookAtTarget)
    .setShouldTransition(state => state.distanceToTarget() <= 2)
]

const followMachine = buildNestedMachine('followAndLook', followAndLookTransitions, FindPlayer, Exit)

const rootTransitions = [

  // wildcard!
  buildTransition('wildcardRevert', StateBehavior, Idle)
    .setShouldTransition(state => state.isFinished()),

  buildTransition('come', Idle, comeMachine)
    .setOnTransition(() => bot.chat('coming')),

  buildTransition('follow', Idle, followMachine)
    .setOnTransition(() => bot.chat('Following'))
]


const root = buildNestedMachine("rootLayer", rootTransitions, Idle);

const machine = new BotStateMachine({ bot, root, autoStart: false });

const webserver = new StateMachineWebserver({stateMachine: machine})
webserver.startServer();


bot.once("spawn", () => {
  machine.start()

  // todo: add better manual transition switching.
  bot.on('chat', (user, message) => {
    const [cmd] = message.trim().split(' ')
    if (cmd === 'come') root.transitions[1].trigger()
    if (cmd === 'follow') root.transitions[2].trigger()
    if (cmd === 'stop') {
      if (machine.activeMachine === followMachine) {
        followMachine.transitions[0].trigger();
      } else {
        bot.chat('We are currently not following!')
      }
    }
  })
});

let time = performance.now()
machine.on('stateEntered', (type, nested, state) => {
  const now = performance.now();
  console.log(type.stateName, state.stateName, now - time);

  time = now;
})
