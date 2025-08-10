# Art for Daggerheart

> Work in progress!
> We’re building up a full set of portraits and varied tokens for all adversaries.
> Some tokens might have just 3 variants, others can have 10 or more.
> There’s no “right” number — the important thing is to have at least a few for variety, and usually you’ll see 3–4 per adversary.

Art for Daggerheart is a Foundry VTT module that drops fresh, custom-made art straight into your Daggerheart game.
We’re talking unique portraits and tokens for all the adversaries — all AI-generated just for this module.

You get to pick if you want dynamic wildcard tokens that change each time they hit the map, or clean circular tokens for a sharper look.
And if you want extra style, you can add the built-in Foundry Token Rings around them for that “pop” factor.

---

## Features

* Unique portraits for every adversary.
* Dynamic wildcard tokens for variety in-game.
* Circular tokens with a clean, masked look.
* Optional Foundry Token Rings for extra flair.
* Automatically updates the Daggerheart adversaries compendium when the world loads.
* All art is original and made for this module.

---

## Token Modes

Choose your look in the module settings:

* **Wildcards Only** – Varied tokens from the `tokens/` folder.
* **Wildcards + Rings** – Varied tokens plus Foundry’s built-in rings.
* **Circle Only** – Circular tokens from the `circle/` folder.
* **Circle + Rings** – Circular tokens plus Foundry’s built-in rings.
---

## Installation

### From the Foundry VTT Package Browser

1. Open **Add-on Modules** in Foundry VTT.
2. Search for **Art for Daggerheart** and install.

### Manual Install

1. Go to **Modules** in Foundry VTT and paste this manifest URL:

   ```
   https://
   ```

---

## How It Works

When you start the world, the module checks the **Daggerheart adversaries compendium** and updates each adversary’s portrait and token based on your chosen **Token Mode**.
If Rings are turned on, it applies Foundry’s own Token Rings with the preset style from the module.

---

## Developer Notes

* **`portraits/`** – Portrait images for adversary sheets.
* **`tokens/`** – Wildcard token images with multiple variations.
* **`circle/`** – Circular-masked token images, based on the portraits.
* Matches images to actors by name, ignoring case, accents, and numbering.
* Wildcard mode uses Foundry’s built-in random token selection.
* Ring modes use Foundry’s built-in Token Rings feature with preset colors and scale.

---

## Changelog

See [CHANGELOG](CHANGELOG.md)

---

## License

The images are done using AI. So, they are under https://creativecommons.org/publicdomain/zero/1.0/ 
