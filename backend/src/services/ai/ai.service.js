import dotenv from "dotenv";
dotenv.config({ override: true });

// Helper to clean Markdown code fences from JSON strings
function cleanJSONString(str) {
    let cleaned = str.trim();
    if (cleaned.startsWith("```")) {
        cleaned = cleaned.replace(/^```(json)?\n?/, "");
    }
    if (cleaned.endsWith("```")) {
        cleaned = cleaned.slice(0, -3);
    }
    return cleaned.trim();
}

