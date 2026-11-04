import { readFileSync } from "node:fs";
import { Currency, Rarity } from "../src/generated/prisma/enums";
import { parseHeroInput } from "../src/utils/hero-input";
import { parseBody, parseEnum, parseInteger, parsePrice, requiredText } from "../src/utils/parse";

export const prepareSeedData = (heroRows: unknown, skinRows: unknown) => {
  if (!Array.isArray(heroRows) || heroRows.length !== 133) {
    throw new Error("Dataset harus berisi tepat 133 hero sebelum seed dijalankan");
  }
  if (!Array.isArray(skinRows) || skinRows.length !== 892) {
    throw new Error("Dataset harus berisi tepat 892 skin sebelum seed dijalankan");
  }
  const heroes = heroRows.map((value: unknown) => {
    const row = parseBody(value);
    return parseHeroInput({
      name: row.name, role: row.primaryRole, lane: row.primaryLane,
      releaseYear: row.releaseYear, priceBP: row.priceBP, priceDiamond: row.priceDiamond,
    });
  });
  if (new Set(heroes.map(hero => hero.name)).size !== heroes.length) {
    throw new Error("Nama hero pada dataset tidak boleh duplikat");
  }
  const requiredOrder = [[0, "Miya"], [17, "Layla"], [21, "Freya"], [55, "Gusion"], [83, "Ling"], [132, "Hirara"]] as const;
  for (const [index, name] of requiredOrder) {
    if (heroes[index]!.name !== name) throw new Error(`Urutan hero tidak sesuai: id ${index + 1} harus ${name}`);
  }

  const skins = skinRows.map((value: unknown) => {
    const row = parseBody(value);
    const heroId = parseInteger(row.heroId, "Skin.heroId", 1);
    if (heroId > heroes.length) throw new Error("Skin merujuk heroId di luar dataset");
    return {
      name: requiredText(row.name, "Skin.name"),
      heroId,
      rarity: parseEnum(row.rarity, Rarity, "Skin.rarity"),
      priceDiamond: parsePrice(row.priceDiamond, "Skin.priceDiamond"),
    };
  });

  const players = [
    { nickname: "ArekITS", bp: 1500, diamond: 75 },
    { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
    { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
  ];
  const playerHeroes = [
    { playerId: 1, heroId: 18, currency: Currency.BP, pricePaid: 2000 },
    { playerId: 1, heroId: 1, currency: Currency.BP, pricePaid: 10800 },
    { playerId: 2, heroId: 84, currency: Currency.DIAMOND, pricePaid: 599 },
    { playerId: 2, heroId: 56, currency: Currency.BP, pricePaid: 32000 },
  ];
  return { heroes, skins, players, playerHeroes };
};

export const readSeedData = () => {
  const heroes: unknown = JSON.parse(readFileSync(new URL("../data/heroes.json", import.meta.url), "utf8"));
  const skins: unknown = JSON.parse(readFileSync(new URL("../data/skins.json", import.meta.url), "utf8"));
  return prepareSeedData(heroes, skins);
};
