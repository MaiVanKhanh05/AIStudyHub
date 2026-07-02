import * as hotDocRepository from "../repositories/hotDoc.repository.js";
import * as notificationRepository from "../repositories/notification.repository.js";
import * as documentRepository from "../repositories/document.repository.js";

// GET /api/lecturer/hot-docs/pending
export const getPendingHotDocs = async (req, res) => {
    try {
        const lecturerId = req.userId;
        const reviews = await hotDocRepository.getPendingReviewsForLecturer(lecturerId);
        res.json(reviews);
    } catch (error) {
        console.error("Error fetching pending hot docs for lecturer:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PATCH /api/lecturer/hot-docs/:id/review
export const reviewHotDoc = async (req, res) => {
    try {
        const lecturerId = req.userId;
        const reviewId = req.params.id;
        const { status, note } = req.body;

        if (!["APPROVED", "REJECTED"].includes(status)) {
            return res.status(400).json({ error: "Trạng thái không hợp lệ." });
        }

        // 1. Fetch the review
        const review = await hotDocRepository.getReviewById(reviewId);
        if (!review) {
            return res.status(404).json({ error: "Không tìm thấy yêu cầu duyệt." });
        }

        // 2. Validate reviewer
        if (review.reviewer_id !== lecturerId) {
            return res.status(403).json({ error: "Bạn không có quyền duyệt yêu cầu này." });
        }

        if (review.status !== "PENDING") {
            return res.status(400).json({ error: "Yêu cầu này đã được duyệt trước đó." });
        }

        // 3. Update the review status
        const updatedReview = await hotDocRepository.updateHotDocReview(reviewId, status, note);

        // 4. If APPROVED, update the document to be AI Featured
        if (status === "APPROVED") {
            await hotDocRepository.setAiFeatured(review.document_id, true);
        }

        // 5. Optionally notify Admin (who sent it) about the decision
        const document = await documentRepository.getDocumentById(review.document_id);
        const docTitle = document ? document.title : "Tài liệu";
        await notificationRepository.createNotification({
            userId: review.sent_by,
            senderId: lecturerId,
            type: "SYSTEM_ALERT",
            documentId: review.document_id,
            message: `Giảng viên đã ${status === 'APPROVED' ? 'chấp thuận' : 'từ chối'} tài liệu hot: "${docTitle}".`
        });

        res.json({ message: "Duyệt thành công", review: updatedReview });
    } catch (error) {
        console.error("Error reviewing hot doc:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
