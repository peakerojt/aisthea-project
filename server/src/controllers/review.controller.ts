import { Request, Response } from "express";
import { PrismaClient } from "../generated/client";

const prisma = new PrismaClient();

// ==============================
// CREATE REVIEW
// ==============================
export const createReview = async (req: Request, res: Response) => {
    try {
        const { productId, userId, rating, comment } = req.body;

        const review = await prisma.review.create({
            data: {
                productId: Number(productId),
                userId: Number(userId),
                rating,
                comment,
            },
        });

        res.status(201).json(review);
    } catch (error) {
        console.error("Create review error:", error);
        res.status(500).json({ message: "Failed to create review" });
    }
};

// ==============================
// GET REVIEWS BY PRODUCT
// ==============================
export const getReviewsByProduct = async (req: Request, res: Response) => {
    try {
        const { productId } = req.params;

        const reviews = await prisma.review.findMany({
            where: {
                productId: Number(productId),
            },
            include: {
                user: true,
            },
            orderBy: {
                createdAt: "desc",
            },
        });

        res.json(reviews);
    } catch (error) {
        console.error("Get reviews error:", error);
        res.status(500).json({ message: "Failed to fetch reviews" });
    }
};