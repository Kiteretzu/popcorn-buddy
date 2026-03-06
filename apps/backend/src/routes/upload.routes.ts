import { Router } from "express";
import upload from "../middleware/mutler";
import { uploadMovieMetadata } from "../controllers/upload.controller";

const router: Router = Router();

// mutler for one video and one image
// This will handle multipart/form-data requests with fields "file" and "image"

const uploadHandler = upload.single("thumbnail");

router.post("/movie-metadata", uploadHandler, uploadMovieMetadata);


export default router;
