import { Router } from "express";
import {
  searchGlobalLibrary,
  getGlobalMovieById,
  ingestMovies,
} from "../controllers/global-library.controller";

const router = Router();

router.get("/", searchGlobalLibrary);
router.get("/:id", getGlobalMovieById);
router.post("/ingest", ingestMovies);

export default router;
