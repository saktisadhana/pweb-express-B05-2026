import { Router } from "express";
import { createHero, getAllHeroes, getHeroById } from "../controllers/heroController";

const router = Router();
router.get("/", getAllHeroes);
router.get("/:hero_id", getHeroById);
router.post("/", createHero);
export default router;
