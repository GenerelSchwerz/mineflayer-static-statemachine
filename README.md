<h1 align="center">Mineflayer-StateMachine</h1>
<p align="center"><i>This project is a plugin designed for <a href="https://github.com/PrismarineJS/mineflayer">Mineflayer</a> that adds a high level API for writing state machines. As bot AI code can grow very quickly, writing this code in a finite state machine manner can help keep the code base manageable and improve quality of the bot's behavior trees.</i></p>

<p align="center">
  <img src="https://github.com/TheDudeFromCI/mineflayer-statemachine/workflows/Build/badge.svg" />
  <img src="https://img.shields.io/npm/v/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/repo-size/TheDudeFromCI/mineflayer-statemachine" />
  <img src="https://img.shields.io/npm/dm/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/contributors/TheDudeFromCI/mineflayer-statemachine" />
  <img src="https://img.shields.io/github/license/TheDudeFromCI/mineflayer-statemachine" />
</p>

---

<h2 align="center">A Super Special Thanks To</h2>
<p align="center">
  :star: Mika, Alora Brown :star:
</p>

<br />

<h3 align="center">And a Warm Thank You To</h3>
<p align="center">
  :rocket:  :rocket:
</p>

<br />
<br />

Thank you all for supporting me and helping this project to continue being developed.

<br />

<p>Want to support this project?</p>
<a href="https://www.patreon.com/thedudefromci"><img src="https://c5.patreon.com/external/logo/become_a_patron_button@2x.png" width="150px" /></a>
<a href='https://ko-fi.com/P5P31SKR9' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://cdn.ko-fi.com/cdn/kofi2.png?v=2' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

---

### What is it?

Mineflayer-StateMachine is a plugin for Mineflayer. It aims to add a flexible and customizable state machine API on top of Mineflayer to make it easier to write and scale bots.

Writing a complex bot AI can be difficult, especially if it has to be convincing. Finite state machines make this process much eaiser by offloading the fine details into isolated modules which only serve a single function or behavior. These modules can then be connected together in a top level component to customize how these seperate modules should interact and pass around control of the bot and state machine parameters.
