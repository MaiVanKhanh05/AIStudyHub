import { processChatWithRAG } from "../services/ai/chat.service.js";

// POST /api/chat
export const handleChat = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Call the AI RAG Service
        const aiResponse = await processChatWithRAG(message);

        return res.json({
            success: true,
            response: aiResponse
        });
    } catch (error) {
        console.error("Error in AI Chat controller:", error);
        
        // Handle case where OpenAI key is missing
        if (error.message.includes("OPENAI_API_KEY")) {
            return res.status(500).json({ 
                error: "Hệ thống AI chưa được cấu hình (Thiếu OpenAI API Key)." 
            });
        }
        
        return res.status(500).json({ error: "Failed to process chat message" });
    }
};
