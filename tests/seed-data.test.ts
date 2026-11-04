import { describe, expect, it } from "vitest";
import heroes from "../data/heroes.json";
import skins from "../data/skins.json";
import { prepareSeedData, readSeedData } from "../prisma/seed-data";

const replaceHero = (change: Record<string, unknown>) => heroes.map((hero, index) => index === 0 ? { ...hero, ...change } : hero);
const replaceSkin = (change: Record<string, unknown>) => skins.map((skin, index) => index === 0 ? { ...skin, ...change } : skin);

describe("Dataset dan seed setup", () => {
  it("memuat jumlah dan pemetaan kolom persis sesuai penugasan", () => {
    const data = readSeedData();
    expect(data.heroes).toHaveLength(133);
    expect(data.skins).toHaveLength(892);
    expect(data.players).toHaveLength(3);
    expect(data.playerHeroes).toHaveLength(4);
    expect(data.heroes[0]).toEqual({ name: "Miya", role: "MARKSMAN", lane: "GOLD", releaseYear: 2016, priceBP: 10800, priceDiamond: 399 });
    expect(data.heroes[132]!.name).toBe("Hirara");
    expect(data.heroes.every(hero => !("id" in hero) && !("primaryRole" in hero))).toBe(true);
    expect(data.skins.every(skin => !("id" in skin))).toBe(true);
  });

  it("mempertahankan urutan hero yang dirujuk seed PlayerHero", () => {
    const data = readSeedData();
    expect(data.heroes[17]!.name).toBe("Layla");
    expect(data.heroes[55]!.name).toBe("Gusion");
    expect(data.heroes[83]!.name).toBe("Ling");
    expect(data.heroes[21]!).toMatchObject({ name: "Freya", priceBP: null, priceDiamond: 599 });
  });

  it("memasukkan saldo seed, currency, dan pricePaid tanpa simulasi pembelian", () => {
    const data = readSeedData();
    expect(data.players).toEqual([
      { nickname: "ArekITS", bp: 1500, diamond: 75 },
      { nickname: "SangPushRank", bp: 13000, diamond: 2892 },
      { nickname: "MageSurabaya", bp: 10000, diamond: 0 },
    ]);
    expect(data.playerHeroes).toEqual([
      { playerId: 1, heroId: 18, currency: "BP", pricePaid: 2000 },
      { playerId: 1, heroId: 1, currency: "BP", pricePaid: 10800 },
      { playerId: 2, heroId: 84, currency: "DIAMOND", pricePaid: 599 },
      { playerId: 2, heroId: 56, currency: "BP", pricePaid: 32000 },
    ]);
  });

  it.each([
    [null, skins], [heroes.slice(1), skins], [heroes, {}], [heroes, skins.slice(1)],
    [replaceHero({ primaryRole: "INVALID" }), skins],
    [replaceHero({ primaryLane: "INVALID" }), skins],
    [replaceHero({ priceBP: -1 }), skins],
    [replaceHero({ name: "" }), skins],
    [replaceHero({ name: "Hirara" }), skins],
    [replaceHero({ releaseYear: 2026.5 }), skins],
    [[heroes[1], heroes[0], ...heroes.slice(2)], skins],
    [heroes, replaceSkin({ rarity: "INVALID" })],
    [heroes, replaceSkin({ heroId: 0 })],
    [heroes, replaceSkin({ heroId: 134 })],
    [heroes, replaceSkin({ priceDiamond: "599" })],
  ])("menolak dataset rusak sebelum proses TRUNCATE: kasus %#", (heroData, skinData) => {
    expect(() => prepareSeedData(heroData, skinData)).toThrow();
  });
});
