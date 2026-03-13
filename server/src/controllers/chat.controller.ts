import { Request, Response } from "express";
import { sendMessageToAI } from "../services/chat.service";
import { detectIntent } from "../services/intent.service";
import { searchProducts } from "../services/product.service";

export const chat = async (req: Request, res: Response) => {

    const { message } = req.body;

    if (!message) {
        return res.status(400).json({
            error: "Message is required"
        });
    }

    const intent = await detectIntent(message);

    let products: any[] = [];

    if (intent === "PRODUCT") {

        const lower = message.toLowerCase();

        let keyword = "";
        let sort: "ASC" | "DESC" | null = null;

        if (lower.includes("cheap") || lower.includes("budget") || lower.includes("low price")) {
            sort = "ASC";
        }

        if (lower.includes("expensive") || lower.includes("premium") || lower.includes("luxury")) {
            sort = "DESC";
        }

        if (lower.includes("hoodie")) keyword = "hoodie";
        else if (lower.includes("shirt")) keyword = "shirt";
        else if (lower.includes("jacket")) keyword = "jacket";
        else if (lower.includes("pants")) keyword = "pants";
        else keyword = message;

        console.log("Keyword:", keyword);

        let limit = 5;

        if (message.split(" ").length === 1) {
            limit = 3;
        }

        products = await searchProducts(keyword, limit, sort);

        console.log("Products found:", products.length);
    }

    const reply = await sendMessageToAI(message);

    res.json({
        intent,
        reply,
        products
    });
};