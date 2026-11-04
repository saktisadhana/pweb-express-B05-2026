import { Router } from "express";
import { buyHero } from "../controllers/buyHeroController";
import { playMatch } from "../controllers/matchController";

const router = Router();

// Bagian Al (CRUD player + top up) nanti ditambahkan di sini juga

// Bagian Marvel
router.post("/:player_id/matches", playMatch);
router.post("/:player_id/heroes", buyHero);

export default router;