<h1 align="center">Mineflayer-Static-Statemachine</h1>
<p align="center"><i>This project is a plugin designed for <a href="https://github.com/PrismarineJS/mineflayer">Mineflayer</a> that adds a high level API for writing state machines. As bot AI code can grow very quickly, writing this code in a finite state machine manner can help keep the code base manageable and improve quality of bot behavior trees.</i></p>

<p align="center">
  <img src="https://img.shields.io/npm/v/@nxg-org/mineflayer-static-statemachine" />
  <img src="https://img.shields.io/github/repo-size/GenerelSchwerz/mineflayer-static-statemachine" />
  <img src="https://img.shields.io/npm/dm/@nxg-org/mineflayer-static-statemachine" />
  <img src="https://img.shields.io/github/contributors/GenerelSchwerz/mineflayer-static-statemachine" />
  <img src="https://img.shields.io/github/license/GenerelSchwerz/mineflayer-static-statemachine" />
</p>

---

### What is it?

Mineflayer-Static-Statemachine is a plugin for Mineflayer. It aims to add a flexible and customizable state machine API on top of Mineflayer to make it easier to write and scale bots.

Writing a complex bot AI can be difficult, especially if it has to be convincing. Finite state machines make this process much eaiser by offloading the fine details into isolated modules which only serve a single function or behavior. These modules can then be connected together in a top level component to customize how these seperate modules should interact and pass around control of the bot and state machine parameters.

### Showcase

**Videos**

[Webserver Demo](https://www.youtube.com/watch?v=ZWMrJJ_RKu8)

[Mining Demo](https://www.youtube.com/watch?v=aC-l0Buy0MY)

### Getting Started

This plugin is built using Node and can be installed using:
```bash
npm install --save @nxg-org/mineflayer-static-statemachine
```

This plugin relies on [mineflayer-pathfinder](https://github.com/Karang/mineflayer-pathfinder) for movement related behaviors. If these behaviors are used, this plugin must be loaded before starting the state machine object.

### Simple Bot

The API for Mineflayer-StateMachine aims to be simple and intuitive, requiring minimal effort to setup a working state machine. The example below creates a three-state finite state machine which finds and follows the nearest player, stopping and looking at them when they are close.

```js
// Create your bot
const mineflayer = require("mineflayer");
const bot = mineflayer.createBot({ username: "Player" });

// Load your dependency plugins.
bot.loadPlugin(require('mineflayer-pathfinder').pathfinder);

// load library
const { BotStateMachine, getTransition, getNestedMachine, behaviors } = require("@nxg-org/mineflayer-static-statemachine");

// Import required behaviors.
const {
  BehaviorExit: Exit,
  BehaviorFindEntity: FindEntity,
  BehaviorLookAtEntity: LookAtTarget,
  BehaviorFollowEntity: FollowEntity,
} = behaviors;

const transitions = [
  // If we do not find an entity, we should exit this machine.
  // We will transition if we have not found an entity.
  // On our transition, say a message that other players can see.
  getTransition("findToFollow", FindEntity, Exit)
    .setShouldTransition((state) => !state.foundEntity())
    .setOnTransition(() => bot.chat("Could not find entity!"))
    .build(),

  // We want to start following the player immediately after finding them.
  // Since BehaviorFindEntity finishes instantly, we will transition almost immediately.
  getTransition("findToFollow", FindEntity, FollowEntity)
    .setShouldTransition((state) => state.foundEntity())
    .build(),

  // If the distance to the player is less than two blocks, switch from the followPlayer
  // state to the lookAtPlayer state.
  getTransition("followToLook", FollowEntity, LookAtTarget)
    .setShouldTransition((state) => state.distanceToTarget() < 2)
    .build(),

  // If the distance to the player is more than two blocks, switch from the lookAtPlayer
  // state to the followPlayer state.
  getTransition("lookToFollow", LookAtTarget, FollowEntity)
    .setShouldTransition((state) => state.distanceToTarget() >= 2)
    .build(),
];

// Now we just wrap our transition list in a nested state machine layer. We want the bot
// to start on the getClosestPlayer state, so we'll specify that here.
// We can specify entry arguments to our entry class here as well.
const root = getNestedMachine("root", transitions, FindEntity)
  .setBuildArgs((e) => e.type === "player")
  .build();

// We can start our state machine simply by creating a new instance.
// We can delay the start of our machine by using autoStart: false
const machine = new BotStateMachine({ bot, root, autoStart: false });

// Start the machine anytime using <name>.start()
bot.once("spawn", () => machine.start());


```

### Documentation

[API](https://PrismarineJS.github.io/mineflayer-statemachine/docs/api)

### Roadmap

**Implemented**
* Web View
* Look at Entity Behavior
* Nested State Machines
* Movement Behaviors
* Mining/Placing Behaviors
* Get Nearby Entities
* Equip Items and Armor

**To Do**
* Show Targets in Web View
* Camera Controls in Web View
* Collection-based Behaviors
* Fighting-based Behaviors
* Conversation-based Behaviors

### License

This project uses the [MIT](https://github.com/PrismarineJS/mineflayer-statemachine/blob/master/LICENSE) license.

### Contributions

This project is accepting PRs and Issues. See something you think can be improved? Go for it! Any and all help is highly appreciated!

For larger changes, it is recommended to discuss these changes in the issues tab before writing any code. It's also preferred to make many smaller PRs than one large one, where applicable.
