import axios from "axios";

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

export const sendMessageToAI = async (message: string) => {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                messages: [
                    {
                        role: "system",
                        content: "If the intent is PRODUCT, do NOT list products, Only give a short recommendation message, Products will be shown separately in the UI."
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

        return response.data.result.response;

    } catch (error: any) {
        console.error("AI Error:", error.response?.data || error.message);
        return "Sorry, I cannot answer right now.";
    }
};