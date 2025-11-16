const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");   // ⬅️ add this line

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" })); // big enough for base64 images

// ---------------------------
// 🔥 YOUR PLACEHOLDER KEY 🔥
// ---------------------------
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// simple test route
app.get("/", (req, res) => {
    res.send("OK: vision proxy running");
});

// main endpoint Shortcuts will call
app.post("/vision", async (req, res) => {
    try {
        const { image_base64, prompt } = req.body;

        if (!image_base64) {
            return res.status(400).json({ error: "image_base64 is required" });
        }

        const question =
            prompt || "Describe what is happening in this image.";

        const body = {
            model: "gpt-4.1-mini",
            input: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_text",
                            text:
                                question ||
                                "Look at the image and answer ONLY with one letter: A, B, C, or D."
                        },
                        {
                            // ✅ correct type for vision in Responses API
                            type: "input_image_url",
                            // ✅ image_url must be a STRING, not { url: ... }
                            image_url: `data:image/jpeg;base64,${image_base64}`
                        }
                    ]
                }
            ],
            max_output_tokens: 5
        };

        const openaiRes = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${OPENAI_KEY}`
            },
            body: JSON.stringify(body)
        });

        const data = await openaiRes.json();

        if (!openaiRes.ok) {
            console.error("OpenAI Error:", data);
            return res.status(openaiRes.status).json({
                error: "openai_error",
                details: data
            });
        }

        // try extracting the text
        let answerText = "";
        try {
            answerText = data.output[0].content[0].text;
        } catch (e) {
            console.error("Bad OpenAI response:", data);
            return res.status(500).json({
                error: "unexpected_response",
                details: data
            });
        }

        res.json({ answer: answerText });

    } catch (err) {
        console.error("Server crash:", err);
        res.status(500).json({
            error: "server_error",
            message: err.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Vision proxy live on port ${PORT}`);
});
