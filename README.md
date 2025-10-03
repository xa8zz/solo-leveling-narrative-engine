# Solo Leveling RPG Simulator

A browser-based RPG simulator set in the *Solo Leveling* universe. The goal of the game is to deliver an immersive, realistic, and progressive narrative experience through a triple-pane UI: a Story/Narrator panel for dynamic storytelling, a Game State panel for the player's stats and inventory, and Scene Panel at the top that generates background scene imagery on the fly. Currently the scaffold is incomplete but many core foundational system designs have been made and now require tweaking and feature work to get operational.

## Overview

Four Google Gemini LLM models drive different aspects of the simulation:
- **Heavy Model** (`gemini-2.0-flash-thinking-exp-01-21`): Narrator & Storyteller
- **Medium Model** (`gemini-2.0-flash-001`): NPC Dialogue & Logic
- **Light Model** (`gemini-2.0-flash-lite-001`): Utility & Evaluator
- **Image Model** (`gemini-2.0-flash-exp-image-generation`): Image Generator

The adventure begins with the protagonist awakening in a hospital after surviving the infamous "double dungeon" – echoing Solo Leveling's pivotal reawakening scene.

## Setup 

Just open index.html after cloning to get it running. You need a Gemini API key to operate the agent narration system, the key is stored locally on your browser.

## Features

- Immersive narrative experience with dynamic storytelling
- Progressive character development from E-rank to S-rank
- Interactive NPC conversations
- Dynamic game state management
- Visual scene illustrations
- Save/load functionality

## License

MIT
