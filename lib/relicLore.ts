export type RelicLore = {
  chapter: string;
  storyBeat: string;
  powerTitle: string;
  powerEffect: string;
  obtainMethod: string;
};

export const RELIC_LORE: Record<string, RelicLore> = {
  wand_novice: {
    chapter: "Hall of First Ink",
    storyBeat: "When the Archive first accepts a learner, a quill-wand rises from the stone basin and circles once above their hand.",
    powerTitle: "Inkflare Aura",
    powerEffect: "Adds a subtle sanctum glow to the learner's rank presence and identity cards.",
    obtainMethod: "Awarded automatically when the mage enters the Hall as a Novice Scribe.",
  },
  wand_logic: {
    chapter: "Clocktower Vault",
    storyBeat: "Forged from the wood of a lightning-struck oak in the Clocktower, this wand only answers to clear reasoning.",
    powerTitle: "Reason Pulse",
    powerEffect: "Sharpens the identity of logic-based progression and marks the bearer as a trusted problem-solver.",
    obtainMethod: "Unlocked through rank ascension once the Archive recognises a higher reasoning order.",
  },
  wand_master: {
    chapter: "Sanctum of Living Light",
    storyBeat: "The Grand Quill descends only when the five schools resonate as one. The Hall goes silent when it appears.",
    powerTitle: "Founder's Resonance",
    powerEffect: "Legendary relic signifying mastery across the sanctum; meant to anchor the final form of the avatar line.",
    obtainMethod: "Reserved for the highest sanctum ranks.",
  },
  book_patterns: {
    chapter: "Forest Annex",
    storyBeat: "Its blank pages fill with pattern lore only after the bearer proves they can see structure where others see noise.",
    powerTitle: "Pattern Ledger",
    powerEffect: "Expands the sense of hidden rule-families and gives the feeling of keeping a true record of discovered structures.",
    obtainMethod: "Unlocked through pattern badge progress.",
  },
  book_logic: {
    chapter: "Clocktower Annex",
    storyBeat: "This tome is kept behind a reasoning lock. Only a patient, exact thinker can open it without the pages sealing themselves again.",
    powerTitle: "Deduction Archive",
    powerEffect: "Represents advanced logic mastery and the ability to preserve complex chains of thought.",
    obtainMethod: "Unlocked through higher-tier logic badge progress.",
  },
  book_wisdom: {
    chapter: "Archivist's Chamber",
    storyBeat: "The Record writes the learner's name into its margins only after a long honest streak in the Archive.",
    powerTitle: "Chronicle Memory",
    powerEffect: "Marks the bearer as someone whose consistency and wisdom have become part of the Archive's own history.",
    obtainMethod: "Unlocked through the highest Archivist's Promise badge.",
  },
  lens_clarity: {
    chapter: "Hall of First Ink",
    storyBeat: "Placed over a still pool in the Hall, the lens reveals the one detail that matters before the rest of the puzzle comes into focus.",
    powerTitle: "First Sight",
    powerEffect: "Symbolises the ability to spot the key clue earlier and more cleanly.",
    obtainMethod: "Unlocked through early sanctum ascension.",
  },
  lens_inference: {
    chapter: "Lake of Reflection Annex",
    storyBeat: "Recovered from the mist over the Lake, this glass shows what a text implies, not only what it says aloud.",
    powerTitle: "Inference Glass",
    powerEffect: "Highlights the bearer as a reader of tone, motive, and hidden meaning.",
    obtainMethod: "Unlocked through higher-tier Focus progress.",
  },
  rune_speed: {
    chapter: "Clocktower Relay",
    storyBeat: "A thin silver rune awarded to minds that move quickly without losing their honesty.",
    powerTitle: "Swift Thought",
    powerEffect: "Represents speed earned through control rather than rushing.",
    obtainMethod: "Unlocked through Speed Caster badge progress.",
  },
  rune_perfect: {
    chapter: "Perfectcraft Archive",
    storyBeat: "Carved after a flawless sequence of answers, this rune hums with unnerving precision.",
    powerTitle: "Perfectcraft Seal",
    powerEffect: "A prestige relic that marks rare, exceptionally clean performance.",
    obtainMethod: "Unlocked through the highest Perfect Potion badge.",
  },
  compass_clarity: {
    chapter: "Clocktower Vault",
    storyBeat: "The Compass of Clarity points toward the hidden rule even when the room itself is trying to mislead the bearer.",
    powerTitle: "True Thread",
    powerEffect: "Represents targeted progression and finding the next best challenge.",
    obtainMethod: "Unlocked through Arcane Solver rank ascension.",
  },
  compass_truth: {
    chapter: "Sanctum of Honest Light",
    storyBeat: "Its needle glows only for learners who choose understanding without shortcuts.",
    powerTitle: "True North",
    powerEffect: "A wisdom relic tied to honest, unaided success.",
    obtainMethod: "Unlocked through the First Honest Spell badge.",
  },
  cloak_apprentice: {
    chapter: "Hall of First Ink",
    storyBeat: "The standard robe of the Archive is plain until the learner earns their first sparks; then the hem begins to gleam.",
    powerTitle: "Apprentice Ward",
    powerEffect: "Signals entry into the magical learning order and gives the wearer a visible place in the Hall.",
    obtainMethod: "Awarded automatically at the first sanctum rank.",
  },
  cloak_mage: {
    chapter: "Guardian Stair",
    storyBeat: "Its constellation-thread shifts each time the wearer learns something difficult and keeps going anyway.",
    powerTitle: "Star Mantle",
    powerEffect: "Marks deeper writing-and-knowledge maturity with a stronger ceremonial identity.",
    obtainMethod: "Unlocked through advanced scholar rank.",
  },
  cloak_master: {
    chapter: "Sanctum of Living Light",
    storyBeat: "Woven from the first light that ever entered the Archive, this cloak is reserved for the greatest forms of the Hall.",
    powerTitle: "Archive Veil",
    powerEffect: "Legendary ceremonial relic for the upper sanctum forms.",
    obtainMethod: "Reserved for top ascension tiers.",
  },
  familiar_owl: {
    chapter: "Hall of First Ink",
    storyBeat: "The owl remembers every mistake once, and only once, then returns it as a gentler second chance.",
    powerTitle: "Recall Familiar",
    powerEffect: "Represents careful review and learning from wrong answers.",
    obtainMethod: "Awarded automatically to beginning mages.",
  },
  familiar_fox: {
    chapter: "Pattern Grove",
    storyBeat: "The fox circles the one detail you nearly missed, then disappears before anyone else can see it.",
    powerTitle: "Pattern Whisper",
    powerEffect: "Embodies agile insight and the ability to catch rule-breakers quickly.",
    obtainMethod: "Unlocked through mid-tier pattern mastery.",
  },
  familiar_phoenix: {
    chapter: "Sanctum of Honest Light",
    storyBeat: "The phoenix appears only after the learner has walked through shadow, admitted failure, and chosen recovery.",
    powerTitle: "Recovery Flame",
    powerEffect: "A legendary wisdom familiar tied to honesty, recovery, and return.",
    obtainMethod: "Unlocked through the Shadow Recovered badge.",
  },
};

export function getRelicLore(key: string): RelicLore | null {
  return RELIC_LORE[key] ?? null;
}
