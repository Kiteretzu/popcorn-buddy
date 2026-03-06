import { Router } from "express";
import requireAuth from "../middleware/requireAuth";
import { addToLibrary, getLibrary, getLibraryItem } from "../controllers/library.controller";

const router = Router();

router.use(requireAuth);

router.post("/", addToLibrary);
router.get("/", getLibrary);
router.get("/:id", getLibraryItem);

export default router;
