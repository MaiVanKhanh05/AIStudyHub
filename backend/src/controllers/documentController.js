const service = require("../services/documentService");

const getAllDocuments = (req, res) => {
    const documents = service.getAllDocuments();

    res.status(200).json(documents);
};

const getDocumentById = (req, res) => {
    const { id } = req.params;

    const document = service.getDocumentById(id);

    if (!document) {
        return res.status(404).json({
            message: "Document not found",
        });
    }

    res.status(200).json(document);
};

module.exports = {
    getAllDocuments,
    getDocumentById,
};