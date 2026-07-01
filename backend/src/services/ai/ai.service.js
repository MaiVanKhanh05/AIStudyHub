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

// Validation Layer to enforce schema constraints
export function validateQuizSchema(quiz) {
    if (!quiz || typeof quiz !== "object") {
        throw new Error("Dữ liệu phản hồi từ AI không hợp lệ (Không phải Object).");
    }
    if (!quiz.title || typeof quiz.title !== "string" || quiz.title.trim() === "") {
        throw new Error("Thiếu tiêu đề bài Quiz hoặc tiêu đề không hợp lệ.");
    }
    if (!Array.isArray(quiz.topics)) {
        quiz.topics = [];
    } else {
        quiz.topics = quiz.topics.filter(t => typeof t === "string" && t.trim() !== "");
    }
    if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
        throw new Error("Không có câu hỏi nào được sinh ra từ AI.");
    }

    for (let i = 0; i < quiz.questions.length; i++) {
        const q = quiz.questions[i];
        if (!q.question_text || typeof q.question_text !== "string" || q.question_text.trim() === "") {
            throw new Error(`Câu hỏi số ${i + 1} thiếu nội dung (question_text).`);
        }
        if (!Array.isArray(q.options) || q.options.length !== 4) {
            throw new Error(`Câu hỏi số ${i + 1} phải chứa mảng options gồm đúng 4 phương án.`);
        }
        for (let j = 0; j < 4; j++) {
            if (typeof q.options[j] !== "string" || q.options[j].trim() === "") {
                throw new Error(`Phương án thứ ${j + 1} của câu hỏi số ${i + 1} không hợp lệ.`);
            }
        }
        // correct_answer must be integer 0, 1, 2, or 3
        const ans = Number(q.correct_answer);
        if (isNaN(ans) || ans < 0 || ans > 3 || !Number.isInteger(ans)) {
            throw new Error(`Đáp án đúng (correct_answer) của câu hỏi số ${i + 1} phải là số nguyên từ 0 đến 3.`);
        }
        q.correct_answer = ans; // store clean integer index

        if (!q.explanation || typeof q.explanation !== "string" || q.explanation.trim() === "") {
            q.explanation = "Không có lời giải thích chi tiết.";
        }
        if (!q.topic || typeof q.topic !== "string" || q.topic.trim() === "") {
            q.topic = quiz.title;
        }
    }
}

// Call Gemini Generative AI API
async function callGemini(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const payload = {
        contents: [
            {
                role: "user",
                parts: [{ text: prompt }]
            }
        ],
        generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${errText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
}

// Call OpenAI Chat Completions
async function callOpenAI(prompt) {
    const apiKey = process.env.OPENAI_API_KEY;
    const url = "https://api.openai.com/v1/chat/completions";

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            response_format: { type: "json_object" },
            messages: [
                { role: "system", content: "You are a professional educational assessment bot. You must respond in valid JSON format only." },
                { role: "user", content: prompt }
            ],
            temperature: 0.3
        })
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${errText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "{}";
}

/**
 * Generate a Multiple-Choice Quiz JSON based on the provided document text
 * @param {string} text Raw context content
 * @param {number} count Desired number of questions
 * @returns {Promise<Object>} Validated Quiz JSON object
 */
export async function generateQuizJSON(text, count = 10, customInstructions = "") {
    const limitCount = Math.min(Math.max(1, count), 30);
    const MAX_CONTEXT_CHARS = 12000;

    // Slice text up to 12000 characters
    const contextText = (text || "").length > MAX_CONTEXT_CHARS
        ? text.slice(0, MAX_CONTEXT_CHARS) + "\n\n[...Truncated due to token limit...]"
        : text;

    // Minimum context check to avoid empty or extremely short inputs
    const minCharsRequired = Math.max(100, limitCount * 25);
    if (!contextText || contextText.trim().length < minCharsRequired) {
        throw new Error(`Tài liệu không đủ nội dung học thuật để tạo ${limitCount} câu hỏi chất lượng.`);
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Không phát hiện API Key của Gemini hoặc OpenAI trên máy chủ.");
    }

    const prompt = `
Bạn là chuyên gia thiết kế câu hỏi kiểm tra học thuật.
Hãy đọc nội dung tài liệu ôn tập dưới đây và tạo một bộ câu hỏi trắc nghiệm ôn tập (Multiple Choice Quiz) khách quan:

NỘI DUNG TÀI LIỆU:
${contextText}

${customInstructions ? `Yêu cầu cụ thể từ người học về hình thức/độ khó/chủ đề câu hỏi:\n"${customInstructions}"\n` : ""}

Yêu cầu sinh Quiz:
1. Bạn BẮT BUỘC phải tạo ra CHÍNH XÁC ĐỦ ĐÚNG ${limitCount} câu hỏi trắc nghiệm dựa trên nội dung tài liệu (tuyệt đối không tạo thiếu hay ít hơn dù chỉ 1 câu).
2. Trình bày bằng Tiếng Việt (hoặc ngôn ngữ của tài liệu nếu tài liệu được viết bằng ngôn ngữ khác).
3. Định dạng đầu ra phải là một đối tượng JSON hợp lệ duy nhất, tuân thủ đúng JSON Schema dưới đây:
{
  "title": "Tiêu đề ngắn gọn, khái quát và học thuật về nội dung quiz",
  "topics": ["Chủ đề chung 1", "Chủ đề chung 2"],
  "questions": [
    {
      "question_text": "Nội dung câu hỏi học búa, đo lường kiến thức thực tế",
      "options": ["Nội dung đáp án 0", "Nội dung đáp án 1", "Nội dung đáp án 2", "Nội dung đáp án 3"],
      "correct_answer": 0, // Chỉ số số nguyên (0, 1, 2, 3) đại diện cho phương án đúng trong mảng options
      "explanation": "Giải thích chi tiết nguyên nhân khoa học tại sao phương án này là đúng",
      "topic": "Chủ đề hẹp cụ thể của câu này (ví dụ: Regression Testing, JUnit, Boundary Value Analysis)"
    }
  ]
}

LƯU Ý QUAN TRỌNG:
- options: Lưu trữ 4 phương án thô, TUYỆT ĐỐI không thêm tiền tố "A. ", "B. ", "C. ", "D. " hay "1. ", "2. " vào chuỗi.
- correct_answer: Phải là kiểu số nguyên từ 0 đến 3 (không dùng chuỗi "0" hay chữ cái "A", "B").
- Nếu số lượng câu hỏi yêu cầu lớn (từ 30 câu trở lên), hãy viết phần giải thích (explanation) cực kỳ súc tích, ngắn gọn (khoảng 1-2 câu) để tránh vượt quá giới hạn độ dài tokens của API.
- Chỉ trả về duy nhất chuỗi JSON thô, không viết thêm lời mở đầu hay kết luận.
`;

    let quizJSON;
    let attempts = 0;
    const maxAttempts = 3;
    let currentPrompt = prompt;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            let responseString = "";
            if (process.env.GEMINI_API_KEY) {
                responseString = await callGemini(currentPrompt);
            } else {
                responseString = await callOpenAI(currentPrompt);
            }

            const cleanedJSON = cleanJSONString(responseString);
            quizJSON = JSON.parse(cleanedJSON);
            validateQuizSchema(quizJSON);

            if (quizJSON.questions.length >= limitCount) {
                if (quizJSON.questions.length > limitCount) {
                    quizJSON.questions = quizJSON.questions.slice(0, limitCount);
                }
                return quizJSON;
            }

            currentPrompt = prompt + `\n\nLƯU Ý THÊM: Lần trước bạn chỉ tạo ra ${quizJSON.questions.length} câu hỏi. Lần này bạn BẮT BUỘC phải tạo ra CHÍNH XÁC ĐỦ ĐÚNG ${limitCount} câu hỏi trắc nghiệm. Không được thiếu!`;
        } catch (error) {
            if (attempts >= maxAttempts) {
                if (quizJSON && quizJSON.questions && quizJSON.questions.length > 0) {
                    break;
                }
                throw error;
            }
        }
    }

    if (quizJSON && quizJSON.questions && quizJSON.questions.length < limitCount) {
        const missingCount = limitCount - quizJSON.questions.length;
        const fillPrompt = `
Bạn là chuyên gia thiết kế câu hỏi kiểm tra học thuật.
Dựa trên tài liệu ôn tập dưới đây, hãy tạo thêm CHÍNH XÁC ĐỦ ĐÚNG ${missingCount} câu hỏi trắc nghiệm mới, KHÔNG trùng lặp với các câu hỏi đã có sẵn.

NỘI DUNG TÀI LIỆU:
${contextText}

CÁC CÂU HỎI ĐÃ CÓ (Tránh trùng lặp):
${JSON.stringify(quizJSON.questions.map(q => q.question_text))}

Đầu ra phải là một mảng JSON chứa ${missingCount} câu hỏi mới theo định dạng:
[
  {
    "question_text": "...",
    "options": ["...", "...", "...", "..."],
    "correct_answer": 0,
    "explanation": "...",
    "topic": "..."
  }
]
`;
        try {
            let responseString = "";
            if (process.env.GEMINI_API_KEY) {
                responseString = await callGemini(fillPrompt);
            } else {
                responseString = await callOpenAI(fillPrompt);
            }
            const cleanedJSON = cleanJSONString(responseString);
            const newQuestions = JSON.parse(cleanedJSON);
            if (Array.isArray(newQuestions)) {
                for (const q of newQuestions) {
                    if (quizJSON.questions.length < limitCount) {
                        if (q.question_text && Array.isArray(q.options) && q.options.length === 4) {
                            quizJSON.questions.push({
                                question_text: q.question_text,
                                options: q.options,
                                correct_answer: Number(q.correct_answer) || 0,
                                explanation: q.explanation || "Không có giải thích.",
                                topic: q.topic || quizJSON.title
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error generating missing quiz questions:", e);
        }
    }

    // Double check and slice if needed, or pad with placeholders as a last resort
    if (quizJSON && quizJSON.questions) {
        if (quizJSON.questions.length > limitCount) {
            quizJSON.questions = quizJSON.questions.slice(0, limitCount);
        }
    }

    return quizJSON;
}

// Validation Layer for Flashcard Schema constraints
export function validateFlashcardSchema(set) {
    if (!set || typeof set !== "object") {
        throw new Error("Dữ liệu phản hồi từ AI không hợp lệ (Không phải Object).");
    }
    if (!set.title || typeof set.title !== "string" || set.title.trim() === "") {
        throw new Error("Thiếu tiêu đề bộ Flashcards hoặc tiêu đề không hợp lệ.");
    }
    if (!Array.isArray(set.topics)) {
        set.topics = [];
    } else {
        set.topics = set.topics.filter(t => typeof t === "string" && t.trim() !== "");
    }
    if (!Array.isArray(set.flashcards) || set.flashcards.length === 0) {
        throw new Error("Không có thẻ Flashcard nào được sinh ra từ AI.");
    }

    for (let i = 0; i < set.flashcards.length; i++) {
        const card = set.flashcards[i];
        if (!card.front || typeof card.front !== "string" || card.front.trim() === "") {
            throw new Error(`Thẻ số ${i + 1} thiếu nội dung mặt trước (front).`);
        }
        if (!card.back || typeof card.back !== "string" || card.back.trim() === "") {
            throw new Error(`Thẻ số ${i + 1} thiếu nội dung mặt sau (back).`);
        }
        const validTypes = ['DEFINITION', 'COMPARE', 'PROCESS', 'COMMON_MISTAKE', 'SCENARIO'];
        if (!card.card_type || typeof card.card_type !== "string" || !validTypes.includes(card.card_type.toUpperCase())) {
            card.card_type = 'DEFINITION';
        } else {
            card.card_type = card.card_type.toUpperCase();
        }
        if (!card.topic || typeof card.topic !== "string" || card.topic.trim() === "") {
            card.topic = set.title;
        }
        const score = Number(card.importance_score);
        if (isNaN(score) || score < 0 || score > 100 || !Number.isInteger(score)) {
            card.importance_score = 50;
        } else {
            card.importance_score = score;
        }
    }
}

/**
 * Generate a Flashcard Set JSON based on the provided document text
 * @param {string} text Sampled context content
 * @param {number} count Desired number of cards
 * @param {string} customPrompt Prompt to focus on certain topics
 * @returns {Promise<Object>} Validated Flashcard JSON object
 */
export async function generateFlashcardJSON(text, count = 15, customPrompt = "") {
    const limitCount = Math.min(Math.max(15, count), 60);

    const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error("Không phát hiện API Key của Gemini hoặc OpenAI trên máy chủ.");
    }

    const prompt = `
Bạn là chuyên gia thiết kế tài liệu học tập thông minh.
Hãy đọc nội dung tài liệu ôn tập dưới đây và trích xuất một bộ thẻ ghi nhớ (Flashcard Set) chất lượng cao:

NỘI DUNG TÀI LIỆU:
${text}

${customPrompt ? `YÊU CẦU TRỌNG TÂM CỤ THỂ TỪ NGƯỜI HỌC (Hãy ưu tiên tạo thẻ liên quan đến các chủ đề này):\n"${customPrompt}"\n` : ""}

Yêu cầu sinh bộ Flashcard:
1. Bạn BẮT BUỘC phải tạo ra CHÍNH XÁC ĐỦ ĐÚNG ${limitCount} thẻ ghi nhớ.
2. Trình bày bằng Tiếng Việt (hoặc ngôn ngữ của tài liệu).
3. Tuyệt đối tránh các thẻ tầm thường, định nghĩa nông cạn (như "What is Software Testing?").
4. Hãy thiết kế thẻ ghi nhớ tập trung vào các nhóm kiến thức chất lượng sau:
   - COMPARE: So sánh phân biệt các khái niệm dễ nhầm lẫn.
   - PROCESS: Quy trình thực hành, thuật toán, vòng đời.
   - COMMON_MISTAKE: Các lỗi sai lập trình hoặc lý thuyết phổ biến.
   - SCENARIO: Bài toán/Tình huống áp dụng thực tế.
   - DEFINITION: Định nghĩa học thuật cốt lõi.
5. YÊU CẦU ĐỘ DÀI: Nội dung "front" (mặt trước) và "back" (mặt sau) phải cực kỳ cô đọng, súc tích (mỗi mặt tối đa 30-40 từ). Tránh giải thích dông dài hoặc chèn mã nguồn quá dài để đảm bảo toàn bộ bộ thẻ ghi nhớ không bị cắt cụt giữa chừng và hiển thị trực quan dễ học.

Định dạng đầu ra phải là một đối tượng JSON hợp lệ duy nhất, tuân thủ đúng JSON Schema dưới đây:
{
  "title": "Tiêu đề ngắn gọn, khái quát và học thuật về bộ thẻ",
  "description": "Mô tả tóm tắt nội dung chính ôn tập của bộ thẻ",
  "topics": ["Chủ đề chung 1", "Chủ đề chung 2"],
  "flashcards": [
    {
      "front": "Nội dung câu hỏi/khái niệm ở mặt trước (Front) của thẻ",
      "back": "Nội dung định nghĩa/câu trả lời chi tiết ở mặt sau (Back) của thẻ",
      "card_type": "DEFINITION", // Phải là một trong: DEFINITION, COMPARE, PROCESS, COMMON_MISTAKE, SCENARIO
      "topic": "Chủ đề hẹp cụ thể của thẻ này (ví dụ: Regression Testing, Integration Testing)",
      "importance_score": 85 // Hệ số độ quan trọng học thuật từ 0 đến 100
    }
  ]
}

LƯU Ý QUAN TRỌNG:
- Chỉ trả về duy nhất chuỗi JSON thô, không viết thêm lời mở đầu hay kết luận.
`;

    let setJSON;
    let attempts = 0;
    const maxAttempts = 3;
    let currentPrompt = prompt;

    while (attempts < maxAttempts) {
        attempts++;
        try {
            let responseString = "";
            if (process.env.GEMINI_API_KEY) {
                responseString = await callGemini(currentPrompt);
            } else {
                responseString = await callOpenAI(currentPrompt);
            }

            const cleanedJSON = cleanJSONString(responseString);
            setJSON = JSON.parse(cleanedJSON);
            validateFlashcardSchema(setJSON);

            if (setJSON.flashcards.length >= limitCount) {
                if (setJSON.flashcards.length > limitCount) {
                    setJSON.flashcards = setJSON.flashcards.slice(0, limitCount);
                }
                return setJSON;
            }

            currentPrompt = prompt + `\n\nLƯU Ý THÊM: Lần trước bạn chỉ tạo ra ${setJSON.flashcards.length} thẻ. Lần này bạn BẮT BUỘC phải tạo ra CHÍNH XÁC ĐỦ ĐÚNG ${limitCount} thẻ ghi nhớ. Không được thiếu!`;
        } catch (error) {
            if (attempts >= maxAttempts) {
                if (setJSON && setJSON.flashcards && setJSON.flashcards.length > 0) {
                    break;
                }
                throw error;
            }
        }
    }

    if (setJSON && setJSON.flashcards && setJSON.flashcards.length < limitCount) {
        const missingCount = limitCount - setJSON.flashcards.length;
        const fillPrompt = `
Bạn là chuyên gia thiết kế tài liệu học tập thông minh.
Dựa trên tài liệu dưới đây, hãy tạo thêm CHÍNH XÁC ĐỦ ĐÚNG ${missingCount} thẻ ghi nhớ (Flashcards) mới, KHÔNG trùng lặp với các thẻ đã có sẵn.

NỘI DUNG TÀI LIỆU:
${text}

CÁC THẺ ĐÃ CÓ (Tránh trùng lặp):
${JSON.stringify(setJSON.flashcards.map(c => c.front))}

Đầu ra phải là một mảng JSON chứa ${missingCount} thẻ ghi nhớ mới theo định dạng:
[
  {
    "front": "...",
    "back": "...",
    "card_type": "...",
    "topic": "...",
    "importance_score": 85
  }
]
`;
        try {
            let responseString = "";
            if (process.env.GEMINI_API_KEY) {
                responseString = await callGemini(fillPrompt);
            } else {
                responseString = await callOpenAI(fillPrompt);
            }
            const cleanedJSON = cleanJSONString(responseString);
            const newCards = JSON.parse(cleanedJSON);
            if (Array.isArray(newCards)) {
                for (const card of newCards) {
                    if (setJSON.flashcards.length < limitCount) {
                        if (card.front && card.back) {
                            setJSON.flashcards.push({
                                front: card.front,
                                back: card.back,
                                card_type: card.card_type || 'DEFINITION',
                                topic: card.topic || setJSON.title,
                                importance_score: Number(card.importance_score) || 50
                            });
                        }
                    }
                }
            }
        } catch (e) {
            console.error("Error generating missing flashcards:", e);
        }
    }

    // Double check and slice if needed
    if (setJSON && setJSON.flashcards) {
        if (setJSON.flashcards.length > limitCount) {
            setJSON.flashcards = setJSON.flashcards.slice(0, limitCount);
        }
    }

    return setJSON;
}
