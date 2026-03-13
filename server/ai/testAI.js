const axios = require("axios");
require("dotenv").config();

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

async function testAI() {
    try {
        const response = await axios.post(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/ai/run/@cf/meta/llama-3-8b-instruct`,
            {
                messages: [
                    { role: "system", content: "You are a helpful assistant." },
                    { role: "user", content: "Hello!" }
                ]
            },
            {
                headers: {
                    Authorization: `Bearer ${API_TOKEN}`,
                    "Content-Type": "application/json"
                }
            }
        );

        console.log(response.data.result.response);

    } catch (error) {
        console.error("AI Error:", error.response?.data || error.message);
    }
}

testAI();