import axios from "axios";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export type UserIntent = "STYLE" | "PRODUCT" | "GENERAL";

export const detectIntent = async (message: string): Promise<UserIntent> => {
    try {

        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                messages: [
                    {
                        role: "system",
                        content:
                            "You classify user messages for a fashion ecommerce chatbot. Only respond with one word: STYLE, PRODUCT, or GENERAL."
                    },
                    {
                        role: "user",
                        content: message
                    }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        const result = response.data.result.response.trim().toUpperCase();

        if (result.includes("STYLE")) return "STYLE";
        if (result.includes("PRODUCT")) return "PRODUCT";

        return "GENERAL";

    } catch (error) {

        console.error("Intent detection error:", error);

        return "GENERAL";
    }
};