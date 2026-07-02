import { validateFlashcardSchema } from "../services/ai/ai.service.js";

// Test runner for Flashcard validation
async function runTests() {
    console.log("=== BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG FLASHCARD ===");
    let failures = 0;

    // Test 1: validateFlashcardSchema with valid flashcard set object
    try {
        const validSet = {
            title: "Software Testing Essentials",
            description: "Core software testing concepts including types and methodologies.",
            topics: ["Regression Testing", "Integration Testing"],
            flashcards: [
                {
                    front: "What is Regression Testing?",
                    back: "Regression Testing is re-running functional and non-functional tests to ensure that previously developed software still performs after a change.",
                    card_type: "DEFINITION",
                    topic: "Regression Testing",
                    importance_score: 95
                }
            ]
        };
        validateFlashcardSchema(validSet);
        console.log("✅ Test 1 Pass: validateFlashcardSchema accepts valid schemas.");
    } catch (err) {
        console.error("❌ Test 1 Fail:", err.message);
        failures++;
    }

    // Test 2: validateFlashcardSchema checks missing front text
    try {
        const invalidFrontSet = {
            title: "Invalid Front Set",
            description: "Missing front text on card",
            topics: ["Testing"],
            flashcards: [
                {
                    front: "", // Empty front should fail
                    back: "Regression testing explanation",
                    card_type: "DEFINITION",
                    topic: "Testing",
                    importance_score: 80
                }
            ]
        };
        validateFlashcardSchema(invalidFrontSet);
        console.error("❌ Test 2 Fail: validateFlashcardSchema allowed empty front text.");
        failures++;
    } catch (err) {
        console.log("✅ Test 2 Pass: validateFlashcardSchema correctly rejected empty front text: " + err.message);
    }

    // Test 3: validateFlashcardSchema checks missing back text
    try {
        const invalidBackSet = {
            title: "Invalid Back Set",
            description: "Missing back text on card",
            topics: ["Testing"],
            flashcards: [
                {
                    front: "What is Regression Testing?",
                    back: "  ", // Whilespace only back should fail
                    card_type: "DEFINITION",
                    topic: "Testing",
                    importance_score: 80
                }
            ]
        };
        validateFlashcardSchema(invalidBackSet);
        console.error("❌ Test 3 Fail: validateFlashcardSchema allowed empty back text.");
        failures++;
    } catch (err) {
        console.log("✅ Test 3 Pass: validateFlashcardSchema correctly rejected empty back text: " + err.message);
    }

    // Test 4: validateFlashcardSchema normalizes card_type and importance_score
    try {
        const denormalizedSet = {
            title: "Denormalized Values Set",
            description: "Has invalid card_type and importance_score which should be auto-normalized",
            topics: ["Testing"],
            flashcards: [
                {
                    front: "What is Regression Testing?",
                    back: "Regression Testing description",
                    card_type: "UNKNOWN_TYPE", // Invalid type, should fallback to DEFINITION
                    topic: "Testing",
                    importance_score: 150 // Out of bounds, should fallback to 50
                }
            ]
        };
        validateFlashcardSchema(denormalizedSet);
        const card = denormalizedSet.flashcards[0];
        if (card.card_type === "DEFINITION" && card.importance_score === 50) {
            console.log("✅ Test 4 Pass: validateFlashcardSchema correctly normalized card_type and importance_score.");
        } else {
            console.error("❌ Test 4 Fail: Normalization didn't apply. type:", card.card_type, "score:", card.importance_score);
            failures++;
        }
    } catch (err) {
        console.error("❌ Test 4 Fail with error:", err.message);
        failures++;
    }

    console.log("=== TỔNG KẾT KIỂM THỬ ===");
    if (failures === 0) {
        console.log("🎉 TẤT CẢ CÁC BÀI TEST FLASHCARD ĐÃ VƯỢT QUA THÀNH CÔNG!");
        process.exit(0);
    } else {
        console.error(`💥 CÓ ${failures} BÀI TEST FLASHCARD BỊ THẤT BẠI!`);
        process.exit(1);
    }
}

runTests();
