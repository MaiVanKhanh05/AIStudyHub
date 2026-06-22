import { validateQuizSchema } from "../services/ai/ai.service.js";

// Test runner
async function runTests() {
    console.log("=== BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG QUIZ ===");
    let failures = 0;

    // Test 1: validateQuizSchema with valid quiz object
    try {
        const validQuiz = {
            title: "Software Testing Basics",
            topics: ["QA", "Testing"],
            questions: [
                {
                    question_text: "What does UAT stand for?",
                    options: [
                        "User Acceptance Testing",
                        "Unit Alternative Test",
                        "Universal Access Tool",
                        "User Assessment Trial"
                    ],
                    correct_answer: 0,
                    explanation: "UAT stands for User Acceptance Testing.",
                    topic: "UAT"
                }
            ]
        };
        validateQuizSchema(validQuiz);
        console.log("✅ Test 1 Pass: validateQuizSchema accepts valid schemas.");
    } catch (err) {
        console.error("❌ Test 1 Fail:", err.message);
        failures++;
    }

    // Test 2: validateQuizSchema checks options count constraint
    try {
        const invalidOptionsQuiz = {
            title: "Invalid Options Quiz",
            topics: ["Bugs"],
            questions: [
                {
                    question_text: "Faulty question?",
                    options: ["Only 1 option"],
                    correct_answer: 0,
                    explanation: "This should fail because options array must contain exactly 4 elements.",
                    topic: "Bugs"
                }
            ]
        };
        validateQuizSchema(invalidOptionsQuiz);
        console.error("❌ Test 2 Fail: validateQuizSchema allowed options length != 4.");
        failures++;
    } catch (err) {
        console.log("✅ Test 2 Pass: validateQuizSchema correctly rejected invalid options count: " + err.message);
    }

    // Test 3: validateQuizSchema checks correct_answer type constraint
    try {
        const invalidAnswerTypeQuiz = {
            title: "Invalid Correct Answer Type",
            topics: ["Security"],
            questions: [
                {
                    question_text: "Is UAT important?",
                    options: ["Yes", "No", "Maybe", "Sometimes"],
                    correct_answer: "A", // string A instead of number index
                    explanation: "This should fail because correct_answer must be integer 0-3.",
                    topic: "Security"
                }
            ]
        };
        validateQuizSchema(invalidAnswerTypeQuiz);
        console.error("❌ Test 3 Fail: validateQuizSchema allowed non-integer correct_answer.");
        failures++;
    } catch (err) {
        console.log("✅ Test 3 Pass: validateQuizSchema correctly rejected string correct_answer: " + err.message);
    }

    // Test 4: validateQuizSchema checks correct_answer boundaries
    try {
        const outOfBoundsQuiz = {
            title: "Invalid Correct Answer Boundary",
            topics: ["Security"],
            questions: [
                {
                    question_text: "Is UAT important?",
                    options: ["Yes", "No", "Maybe", "Sometimes"],
                    correct_answer: 4, // index 4 is out of bounds (must be 0-3)
                    explanation: "This should fail because correct_answer index is out of bounds.",
                    topic: "Security"
                }
            ]
        };
        validateQuizSchema(outOfBoundsQuiz);
        console.error("❌ Test 4 Fail: validateQuizSchema allowed correct_answer out of bounds.");
        failures++;
    } catch (err) {
        console.log("✅ Test 4 Pass: validateQuizSchema correctly rejected correct_answer index out of bounds: " + err.message);
    }

    console.log("=== TỔNG KẾT KIỂM THỬ ===");
    if (failures === 0) {
        console.log("🎉 TẤT CẢ CÁC BÀI TEST ĐÃ VƯỢT QUA THÀNH CÔNG!");
        process.exit(0);
    } else {
        console.error(`💥 CÓ ${failures} BÀI TEST BỊ THẤT BẠI!`);
        process.exit(1);
    }
}

runTests();
