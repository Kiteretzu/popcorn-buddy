import express from "express";
import uploadRoutes from "./routes/upload.routes";
import authRoutes from "./routes/auth.routes";
import friendsRoutes from "./routes/friends.routes";
import globalLibraryRoutes from "./routes/global-library.routes";
import libraryRoutes from "./routes/library.routes";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import cors from "cors";
import { fetchMovieData, searchMovie } from "./controllers/upload.controller";

dotenv.config({
  path: path.resolve(__dirname, "../../../.env"),
});

if (!process.env.JWT_SECRET?.trim()) {
  console.error(
    "Fatal: JWT_SECRET is required. Add JWT_SECRET=your-secret to your .env (repo root or apps/backend).",
  );
  process.exit(1);
}

const uploadPath = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const app = express();
const port = process.env.PORT || 8080;

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.get("/", (req, res) => {
  res.send("Welcome to the smarth API!");
});

app.use("/api/upload", uploadRoutes);
app.get("/api/search-movie", searchMovie);
app.use("/api/fetch-movie-data", fetchMovieData);
app.use("/api/auth", authRoutes);
app.use("/api/friends", friendsRoutes);
app.use("/api/global-library", globalLibraryRoutes);
app.use("/api/library", libraryRoutes);

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
