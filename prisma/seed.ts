// @ts-ignore — Prisma 7 generated client
import { PrismaLibSql } from "@prisma/adapter-libsql";
// @ts-ignore — Prisma 7 generated client
import { PrismaClient } from "../app/generated/prisma/client";

const DB_URL = "file:///Users/leo/Project/thinkering_quill/prisma/dev.db";
const adapter = new PrismaLibSql({ url: DB_URL });
const prisma = new PrismaClient({ adapter } as never);

const ARTIFACTS = [
  // Wands
  {
    key: "wand_novice",
    name: "Scribe's Quill Wand",
    category: "wand",
    rarity: "common",
    loreText: "The first wand issued to every apprentice. Unremarkable, but full of potential.",
    unlockRule: "rank:Novice Scribe",
  },
  {
    key: "wand_logic",
    name: "Wand of Pure Reasoning",
    category: "wand",
    rarity: "rare",
    loreText: "Carved from a lightning-struck oak, this wand hums when its bearer thinks clearly.",
    unlockRule: "rank:Logic Mage",
  },
  {
    key: "wand_master",
    name: "The Grand Quill",
    category: "wand",
    rarity: "legendary",
    loreText: "The original instrument of the Archive's founding. Only the Master of the Quill may wield it.",
    unlockRule: "rank:Master of the Quill",
  },

  // Spellbooks
  {
    key: "book_patterns",
    name: "Codex of Patterns",
    category: "spellbook",
    rarity: "common",
    loreText: "Every pattern ever discovered in the Forest is catalogued here. Some pages are still blank.",
    unlockRule: "badge:pattern_prophet:bronze",
  },
  {
    key: "book_logic",
    name: "Tome of Deduction",
    category: "spellbook",
    rarity: "rare",
    loreText: "If you can follow its arguments to the end, you will never be fooled by false reasoning again.",
    unlockRule: "badge:logic_keeper:silver",
  },
  {
    key: "book_wisdom",
    name: "The Archivist's Record",
    category: "spellbook",
    rarity: "legendary",
    loreText: "Contains the history of every mage who ever studied in the Archive. Your name awaits its page.",
    unlockRule: "badge:archivists_promise:gold",
  },

  // Lenses
  {
    key: "lens_clarity",
    name: "Lens of First Sight",
    category: "lens",
    rarity: "common",
    loreText: "Shows you the most important thing in any puzzle — if you know how to look.",
    unlockRule: "rank:Rune Apprentice",
  },
  {
    key: "lens_inference",
    name: "Inference Glass",
    category: "lens",
    rarity: "rare",
    loreText: "Reveals what a text is really saying — not just the words on the surface.",
    unlockRule: "badge:focus_bearer:silver",
  },

  // Runes
  {
    key: "rune_speed",
    name: "Rune of Swift Thought",
    category: "rune",
    rarity: "common",
    loreText: "Accelerates the mind without sacrificing care. It was discovered by a student who had been running late.",
    unlockRule: "badge:speed_caster:bronze",
  },
  {
    key: "rune_perfect",
    name: "Rune of Perfectcraft",
    category: "rune",
    rarity: "rare",
    loreText: "A rune carved when every answer was exactly right. Rarely seen outside legend.",
    unlockRule: "badge:perfect_potion:gold",
  },

  // Compasses
  {
    key: "compass_clarity",
    name: "Compass of Clarity",
    category: "compass",
    rarity: "rare",
    loreText: "Always points toward the most logical conclusion, no matter how tangled the problem.",
    unlockRule: "rank:Arcane Solver",
  },
  {
    key: "compass_truth",
    name: "Compass of True North",
    category: "compass",
    rarity: "legendary",
    loreText: "Given only to those who choose understanding over shortcuts. The needle glows when held by an honest mage.",
    unlockRule: "badge:first_honest_spell:bronze",
  },

  // Cloaks
  {
    key: "cloak_apprentice",
    name: "Apprentice's Robe",
    category: "cloak",
    rarity: "common",
    loreText: "The standard robe of the Archive. Simple, practical, and strangely warm.",
    unlockRule: "rank:Novice Scribe",
  },
  {
    key: "cloak_mage",
    name: "Mage's Star Cloak",
    category: "cloak",
    rarity: "rare",
    loreText: "Embroidered with constellations that shift when the wearer learns something new.",
    unlockRule: "rank:Spell Scholar",
  },
  {
    key: "cloak_master",
    name: "Cloak of the Archive",
    category: "cloak",
    rarity: "legendary",
    loreText: "Woven from the first light that ever entered the Archive Hall. Impossibly light.",
    unlockRule: "rank:Master of the Quill",
  },

  // Familiars
  {
    key: "familiar_owl",
    name: "Archival Owl",
    category: "familiar",
    rarity: "common",
    loreText: "An owl that memorises every answer you get wrong and reminds you gently the next time.",
    unlockRule: "rank:Novice Scribe",
  },
  {
    key: "familiar_fox",
    name: "Logic Fox",
    category: "familiar",
    rarity: "rare",
    loreText: "A fox that always finds the pattern you missed. It circles the correct answer three times.",
    unlockRule: "rank:Puzzle Adept",
  },
  {
    key: "familiar_phoenix",
    name: "Recovery Phoenix",
    category: "familiar",
    rarity: "legendary",
    loreText: "Appears only to those who have walked through shadow and returned to light.",
    unlockRule: "badge:shadow_recovered:bronze",
  },
];

async function main() {
  console.log("🌱 Seeding Thinkering Quill database…");

  // Upsert all artifacts (idempotent)
  let created = 0;
  let updated = 0;

  for (const artifact of ARTIFACTS) {
    const existing = await prisma.artifact.findUnique({
      where: { key: artifact.key },
    });

    if (existing) {
      await prisma.artifact.update({
        where: { key: artifact.key },
        data: artifact,
      });
      updated++;
    } else {
      await prisma.artifact.create({ data: artifact });
      created++;
    }
  }

  console.log(`✅ Artifacts: ${created} created, ${updated} updated (${ARTIFACTS.length} total)`);
  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await (prisma as any).$disconnect();
  });
