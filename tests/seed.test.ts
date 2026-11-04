import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import heroes from "../data/heroes.json";
import skins from "../data/skins.json";

const mocks = vi.hoisted(() => ({
  readSeedData: vi.fn(),
  tx: {
    $executeRaw: vi.fn(),
    hero: { createMany: vi.fn() }, skin: { createMany: vi.fn() },
    player: { createMany: vi.fn() }, playerHero: { createMany: vi.fn() },
  },
  $transaction: vi.fn(), $disconnect: vi.fn(),
}));
vi.mock("../src/config/prisma", () => ({ default: mocks }));
vi.mock("../prisma/seed-data", async importOriginal => {
  const actual = await importOriginal<typeof import("../prisma/seed-data")>();
  return { ...actual, readSeedData: mocks.readSeedData };
});
import { prepareSeedData } from "../prisma/seed-data";

let originalExitCode: typeof process.exitCode;
beforeEach(() => {
  originalExitCode = process.exitCode;
  vi.resetModules();
  vi.resetAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
  mocks.readSeedData.mockReturnValue(prepareSeedData(heroes, skins));
  mocks.$transaction.mockImplementation((callback: (tx: typeof mocks.tx) => Promise<void>) => callback(mocks.tx));
});
afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

describe("Urutan dan kegagalan seed (database di-mock)", () => {
  it("TRUNCATE dan empat createMany berada dalam satu transaksi berurutan", async () => {
    await import("../prisma/seed");
    expect(mocks.$transaction).toHaveBeenCalledWith(expect.any(Function), { timeout: 60_000 });
    expect(mocks.tx.$executeRaw.mock.calls[0]![0].join("")).toBe('TRUNCATE "PlayerHero", "Player", "Skin", "Hero" RESTART IDENTITY CASCADE');
    expect(mocks.tx.hero.createMany.mock.calls[0]![0].data).toHaveLength(133);
    expect(mocks.tx.skin.createMany.mock.calls[0]![0].data).toHaveLength(892);
    expect(mocks.tx.player.createMany.mock.calls[0]![0].data).toHaveLength(3);
    expect(mocks.tx.playerHero.createMany.mock.calls[0]![0].data).toHaveLength(4);
    const calls = [mocks.tx.$executeRaw, mocks.tx.hero.createMany, mocks.tx.skin.createMany, mocks.tx.player.createMany, mocks.tx.playerHero.createMany];
    const order = calls.map(call => call.mock.invocationCallOrder[0]!);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(mocks.$disconnect).toHaveBeenCalledOnce();
  });

  it("tidak memulai transaksi jika dataset gagal divalidasi", async () => {
    mocks.readSeedData.mockImplementation(() => { throw new Error("Dataset rusak"); });
    await import("../prisma/seed");
    expect(mocks.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.$executeRaw).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(mocks.$disconnect).toHaveBeenCalledOnce();
  });

  it("menghentikan seed dan menutup client saat query gagal", async () => {
    mocks.tx.skin.createMany.mockRejectedValue(new Error("postgresql://user:secret@host/db"));
    await import("../prisma/seed");
    expect(mocks.tx.player.createMany).not.toHaveBeenCalled();
    expect(mocks.tx.playerHero.createMany).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("secret");
    expect(mocks.$disconnect).toHaveBeenCalledOnce();
  });
});
