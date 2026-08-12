import { Router } from "express";
import { login } from "../controllers/authController";
import { authenticate } from "../middleware/auth";

const router = Router();

router.post("/login", login);

router.get("/me", authenticate, (req, res) => {
  res.status(200).json({ user: req.user });
});

export default router;
