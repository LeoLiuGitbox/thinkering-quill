import { Rank } from "@/types/game";

export type AscensionRankMeta = {
  rank: Rank;
  xpRequired: number;
  hallTitle: string;
  shortTitle: string;
  lore: string;
  powerName: string;
  powerDescription: string;
  unlockVisual: string;
  sigil: string;
  colour: string;
  accent: string;
  aura: string;
};

export const ASCENSION_RANKS: AscensionRankMeta[] = [
  {
    rank: "Novice Scribe",
    xpRequired: 0,
    hallTitle: "Novice Scribe",
    shortTitle: "Scribe",
    lore: "The first spark of the Quill answers you. The Archive still whispers in fragments, but the path has opened.",
    powerName: "Glyph Sight",
    powerDescription: "You begin to see the simplest runes hidden inside patterns, passages, and problems.",
    unlockVisual: "A dim quill sigil glows through a dusty seal.",
    sigil: "🪶",
    colour: "#E7C777",
    accent: "#6BA3D6",
    aura: "linear-gradient(135deg, #2A1E5A, #1E2E5A)",
  },
  {
    rank: "Rune Reader",
    xpRequired: 150,
    hallTitle: "Rune Reader",
    shortTitle: "Reader",
    lore: "Symbols stop looking random. Hidden rules begin to arrange themselves before your eyes.",
    powerName: "Rune Reading",
    powerDescription: "You can sense the rule behind a puzzle before every piece is visible.",
    unlockVisual: "Blue runes rise from the card edge like embers.",
    sigil: "🔷",
    colour: "#78A8E8",
    accent: "#E7C777",
    aura: "linear-gradient(135deg, #17355A, #1E2E5A)",
  },
  {
    rank: "Arcane Solver",
    xpRequired: 450,
    hallTitle: "Arcane Solver",
    shortTitle: "Solver",
    lore: "The Quill now answers with speed. Threads that once looked separate start to connect as one spell.",
    powerName: "Pattern Lock",
    powerDescription: "You can trap a moving pattern in your mind long enough to test the next step.",
    unlockVisual: "A rotating logic ring frames the avatar in pale gold.",
    sigil: "🧩",
    colour: "#8E7AE6",
    accent: "#E7C777",
    aura: "linear-gradient(135deg, #2D236A, #16213B)",
  },
  {
    rank: "Pattern Weaver",
    xpRequired: 900,
    hallTitle: "Pattern Weaver",
    shortTitle: "Weaver",
    lore: "Where others see fragments, you begin to see structure. The Archive trusts you with deeper symmetries.",
    powerName: "Weave Sight",
    powerDescription: "You can link scattered clues into one coherent design.",
    unlockVisual: "Star-lines cross the card like a living grid.",
    sigil: "🕸️",
    colour: "#6BC47A",
    accent: "#9FE0B2",
    aura: "linear-gradient(135deg, #153A2A, #1E2E5A)",
  },
  {
    rank: "Quill Adept",
    xpRequired: 1500,
    hallTitle: "Quill Adept",
    shortTitle: "Adept",
    lore: "Your words begin to carry force. Revision is no longer repair — it becomes transformation.",
    powerName: "Living Ink",
    powerDescription: "Your writing starts to shape mood, image, and voice with deliberate control.",
    unlockVisual: "A gold ink trail loops around the avatar and never fades.",
    sigil: "✒️",
    colour: "#E7C777",
    accent: "#C47A6B",
    aura: "linear-gradient(135deg, #4A2E1A, #1E2E5A)",
  },
  {
    rank: "Archive Guardian",
    xpRequired: 2300,
    hallTitle: "Archive Guardian",
    shortTitle: "Guardian",
    lore: "Doors in the Archive that once stayed shut now open at your approach. You are trusted with protected knowledge.",
    powerName: "Gatekeeping Ward",
    powerDescription: "You can preserve focus and hold on to meaning even when the challenge grows noisy or complex.",
    unlockVisual: "A library gate appears behind the card and opens with light.",
    sigil: "🛡️",
    colour: "#6BB4C4",
    accent: "#E7C777",
    aura: "linear-gradient(135deg, #163847, #1E2E5A)",
  },
  {
    rank: "Spell Scholar",
    xpRequired: 3300,
    hallTitle: "Spell Scholar",
    shortTitle: "Scholar",
    lore: "You no longer borrow the old spells. You understand them well enough to wield them with style and purpose.",
    powerName: "Scholarscript",
    powerDescription: "You can turn knowledge into reliable spellwork across logic, reading, and craft.",
    unlockVisual: "Pages orbit the avatar in a quiet, endless spiral.",
    sigil: "📖",
    colour: "#E7C777",
    accent: "#6BA3D6",
    aura: "linear-gradient(135deg, #4B3A18, #1E2E5A)",
  },
  {
    rank: "Astral Archivist",
    xpRequired: 4600,
    hallTitle: "Astral Archivist",
    shortTitle: "Archivist",
    lore: "The ceiling of the Hall becomes a star map to you. Knowledge is no longer stored in shelves alone, but in constellations.",
    powerName: "Star Index",
    powerDescription: "You can sense where your weakest threads are and call the next right challenge toward you.",
    unlockVisual: "A galaxy halo turns behind the sigil like a slow clock.",
    sigil: "🌌",
    colour: "#9A8BFF",
    accent: "#E7C777",
    aura: "linear-gradient(135deg, #261F5C, #0F1C3F)",
  },
  {
    rank: "Grand Magus of the Quill",
    xpRequired: 6200,
    hallTitle: "Grand Magus of the Quill",
    shortTitle: "Grand Magus",
    lore: "The five schools answer together. Logic, insight, focus, craft, and wisdom now move like one current.",
    powerName: "Fivefold Convergence",
    powerDescription: "You can combine disciplines, turning hard problems into one elegant chain of moves.",
    unlockVisual: "Five coloured rings circle the card in perfect balance.",
    sigil: "👑",
    colour: "#F5D66E",
    accent: "#6BC47A",
    aura: "linear-gradient(135deg, #5A4318, #1E2E5A)",
  },
  {
    rank: "Eternal Luminary",
    xpRequired: 8200,
    hallTitle: "Eternal Luminary",
    shortTitle: "Luminary",
    lore: "The Quill no longer needs to test whether you belong in the Hall. You are part of its light now.",
    powerName: "Radiant Dominion",
    powerDescription: "Your presence reveals hidden paths for every learner who follows after you.",
    unlockVisual: "The sealed card breaks apart into wings of light.",
    sigil: "🌠",
    colour: "#FFF2B0",
    accent: "#8FD3FF",
    aura: "linear-gradient(135deg, #7A5A12, #2A1E5A)",
  },
];

export function getAscensionMeta(rank: Rank) {
  return ASCENSION_RANKS.find((item) => item.rank === rank) ?? ASCENSION_RANKS[0];
}
