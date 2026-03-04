import { Router } from "express";
import {
    createReview,
    getReviewsByProduct,
} from "../controllers/review.controller";

const router = Router();

// POST /api/reviews
router.post("/", createReview);

// GET /api/reviews/product/:productId
router.get("/product/:productId", getReviewsByProduct);

export default router;