const documents = [
    {
        id: 1,
        title: "Java OOP",
        category: "Programming",
        uploadDate: "2025-07-01",
    },
    {
        id: 2,
        title: "Database Design",
        category: "Database",
        uploadDate: "2025-07-02",
    },
    {
        id: 3,
        title: "ReactJS",
        category: "Programming",
        uploadDate: "2025-07-03",
    },
];

const getAllDocuments = () => {
    return documents;
};

const getDocumentById = (id) => {
    return documents.find((doc) => doc.id === Number(id));
};

module.exports = {
    getAllDocuments,
    getDocumentById,
};