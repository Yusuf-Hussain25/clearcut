import express from "express";
import requireUser from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { createImage, deleteImage, getImage, listImages, updateImage } from "../controllers/imageController.js";

const imageRouter = express.Router();

// Auth runs before multer, so anonymous uploads are rejected without being read into memory
imageRouter.post("/", requireUser, upload.single("image"), createImage);
imageRouter.get("/", requireUser, listImages);
imageRouter.get("/:id", requireUser, getImage);
imageRouter.patch("/:id", requireUser, updateImage);
imageRouter.delete("/:id", requireUser, deleteImage);

export default imageRouter;
