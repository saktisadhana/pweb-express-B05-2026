import { Router } from "express";
import { buyHero } from "../controllers/buyHeroController";
import { playMatch } from "../controllers/matchController";
import { createPlayer, deletePlayer, getPlayerById, updatePlayer } from "../controllers/playerController";
import { topUp } from "../controllers/topUpController";

const router = Router();

// Player
router.post("/", createPlayer);
router.get("/:player_id", getPlayerById);
router.patch("/:player_id", updatePlayer);
router.delete("/:player_id", deletePlayer);

// Top up, match, dan beli hero
router.post("/:player_id/topup", topUp);
router.post("/:player_id/matches", playMatch);
router.post("/:player_id/heroes", buyHero);

export default router;