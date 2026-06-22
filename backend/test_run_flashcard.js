import pool from "./DB/db.js";
import { generateFlashcardSet } from "./src/services/flashcard.service.js";

async function run() {
    try {
        console.log("Running generateFlashcardSet for doc 237...");
        const result = await generateFlashcardSet(237, "Tạo bộ thẻ ghi nhớ Flashcard ôn tập từ tài liệu này", "SE190911");
        console.log("Result:", result);
    } catch (e) {
        console.error("ERROR CAUGHT:", e);
    } finally {
        process.exit(0);
    }
}

run();
