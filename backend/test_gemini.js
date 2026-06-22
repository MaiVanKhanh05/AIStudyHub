import dotenv from "dotenv";
dotenv.config();

async function test() {
    try {
        console.log("Calling Gemini API...");
        const apiKey = process.env.GEMINI_API_KEY;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        const payload = {
            contents: [{ parts: [{ text: "Hello, say hello back in 3 words." }] }]
        };
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        console.log("Status:", res.status);
        const data = await res.json();
        console.log("Response:", JSON.stringify(data));
    } catch (e) {
        console.error("Gemini Error:", e);
    } finally {
        process.exit(0);
    }
}

test();
