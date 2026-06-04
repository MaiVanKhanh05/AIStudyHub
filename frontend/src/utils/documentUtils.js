// Hàm tạo nội dung mô phỏng học thuật chất lượng cao dựa trên tiêu đề tệp
export function getSimulatedContent(title = "", subject = "") {
    const t = title.toLowerCase();
    if (t.includes("java") || t.includes("oop") || t.includes("programming")) {
        return {
            overview: "Tài liệu hệ thống hóa toàn bộ kiến thức nâng cao về lập trình hướng đối tượng (OOP) bằng ngôn ngữ Java. Nội dung tập trung vào các nguyên lý thiết kế hệ thống bền vững, mẫu thiết kế (Design Patterns) phổ biến và cách tối ưu bộ nhớ JVM.",
            sections: [
                {
                    title: "I. 4 TÍNH CHẤT CỐT LÕI CỦA OOP IN JAVA",
                    content: "Phân tích chuyên sâu về tính Đóng gói (Encapsulation) với access modifiers, tính Kế thừa (Inheritance) qua từ khóa extends/implements, tính Đa hình (Polymorphism) qua Overriding/Overloading, và tính Trừu tượng (Abstraction) sử dụng Abstract Class và Interface."
                },
                {
                    title: "II. THIẾT KẾ ĐỐI TƯỢNG VÀ SOLID PRINCIPLES",
                    content: "Hướng dẫn áp dụng nguyên lý SOLID (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) để xây dựng kiến trúc code linh hoạt, dễ mở rộng và bảo trì."
                },
                {
                    title: "III. QUẢN LÝ BỘ NHỚ & COLLECTION FRAMEWORK",
                    content: "Cách thức JVM cấp phát bộ nhớ trên Stack và Heap. Tìm hiểu sâu Collection Framework: ArrayList vs LinkedList, HashMap vs TreeMap, cơ chế hoạt động của Garbage Collector nhằm phòng tránh memory leak."
                }
            ],
            insights: [
                "Phù hợp ôn tập thi chứng chỉ Java hoặc chuẩn bị phỏng vấn Software Engineer.",
                "Đi kèm 15 ví dụ minh họa thực tế về Design Patterns (Singleton, Factory, Observer).",
                "Có phần hướng dẫn tối ưu thời gian chạy chương trình (Time Complexity)."
            ]
        };
    } else if (t.includes("database") || t.includes("db") || t.includes("sql") || t.includes("normal") || t.includes("design")) {
        return {
            overview: "Cẩm nang toàn diện về thiết kế cơ sở dữ liệu quan hệ, chuẩn hóa dữ liệu từ 1NF đến BCNF, và tối ưu hóa truy vấn SQL nâng cao. Tài liệu cung cấp các nguyên tắc vàng để xây dựng lược đồ cơ sở dữ liệu hiệu năng cao.",
            sections: [
                {
                    title: "I. THIẾT KẾ MÔ HÌNH THỰC THỂ LIÊN KẾT (ERD)",
                    content: "Cách xác định các thực thể, thuộc tính và mối quan hệ (1-1, 1-N, N-N). Hướng dẫn chuyển đổi từ sơ đồ thực thể ERD sang các bảng vật lý trong PostgreSQL, MySQL và SQL Server."
                },
                {
                    title: "II. CHUẨN HÓA DỮ LIỆU & TRÁNH DƯ THỪA (NORMALIZATION)",
                    content: "Phương pháp phân rã bảng có hệ thống để đạt chuẩn 1NF (Atomic values), 2NF (No partial dependency), 3NF (No transitive dependency) và BCNF. Minh họa các lỗi mất dữ liệu khi phân rã sai quy cách."
                },
                {
                    title: "III. TỐI ƯU TRUY VẤN & INDEXING TRONG DATABASE",
                    content: "Cơ chế hoạt động của B-Tree Index. Sử dụng EXPLAIN ANALYZE để phân tích hiệu năng truy vấn. Các kỹ thuật tối ưu lệnh JOIN, Subquery và phân hoạch bảng (Table Partitioning)."
                }
            ],
            insights: [
                "Trực quan hóa lược đồ với các mô hình thực tế từ hệ thống E-commerce và E-learning.",
                "Gợi ý 25 bài tập thực hành truy vấn SQL từ cơ bản đến phức tạp.",
                "Đi kèm tài liệu cheatsheet tổng hợp câu lệnh DDL và DML phổ biến."
            ]
        };
    } else if (t.includes("react") || t.includes("web") || t.includes("js") || t.includes("frontend") || t.includes("html") || t.includes("css")) {
        return {
            overview: "Tài liệu chuyên sâu dành cho lập trình viên Front-End về ReactJS core concepts, cơ chế Virtual DOM, kiến trúc Component, quản lý State và tối ưu hóa hiệu năng ứng dụng Single Page (SPA).",
            sections: [
                {
                    title: "I. KIẾN TRÚC REACT & VIRTUAL DOM",
                    content: "Tìm hiểu cách React render giao diện hiệu quả thông qua Virtual DOM và thuật toán So sánh (Reconciliation). Cơ chế hoạt động của JSX và chu kỳ sống (Lifecycle) của một Component."
                },
                {
                    title: "II. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)",
                    content: "Sử dụng Hooks cốt lõi (useState, useEffect, useContext) và các Hooks nâng cao (useReducer, useMemo, useCallback) để tối ưu hóa số lần re-render của Component. Giới thiệu sơ lược về Redux Toolkit và Zustand."
                },
                {
                    title: "III. XÂY DỰNG LAYOUT VÀ TỐI ƯU HIỆU NĂNG",
                    content: "Kỹ thuật Lazy Loading, Code Splitting bằng React.lazy và Suspense. Kết hợp Tailwind CSS để tạo giao diện responsive, tích hợp CSS Variables cho giao diện Dark Mode cao cấp."
                }
            ],
            insights: [
                "Bao gồm sơ đồ tư duy (Mindmap) trực quan về dòng chảy dữ liệu trong React.",
                "Hướng dẫn triển khai dự án nhỏ (Mini-Project) thực tế để áp dụng ngay lý thuyết.",
                "Tập trung vào các clean-code practices khi viết Custom Hooks."
            ]
        };
    } else if (t.includes("machine") || t.includes("ml") || t.includes("ai") || t.includes("learning") || t.includes("data science")) {
        return {
            overview: "Tài liệu tổng hợp các thuật toán học máy phổ biến, toán học nền tảng (Đại số tuyến tính, Xác suất thống kê, Giải tích) và quy trình chuẩn bị dữ liệu (Data Preprocessing) trong khoa học dữ liệu.",
            sections: [
                {
                    title: "I. HỌC MÁY CÓ GIÁM SÁT (SUPERVISED LEARNING)",
                    content: "Phân tích các mô hình Hồi quy tuyến tính (Linear Regression), Cây quyết định (Decision Tree), Học máy Vector hỗ trợ (SVM) và Rừng ngẫu nhiên (Random Forest). Giải thích chi tiết các hàm mất mát (Loss Functions)."
                },
                {
                    title: "II. HỌC MÁY KHÔNG GIÁM SÁT & NEURAL NETWORKS",
                    content: "Kỹ thuật gom cụm K-Means, giảm chiều dữ liệu PCA. Giới thiệu mạng Nơ-ron nhân tạo (ANN), thuật toán Lan truyền ngược (Backpropagation) và tối ưu hóa Gradient Descent."
                },
                {
                    title: "III. ĐÁNH GIÁ MÔ HÌNH VÀ HYPERPARAMETER TUNING",
                    content: "Cách sử dụng ma trận nhầm lẫn (Confusion Matrix), các chỉ số Precision, Recall, F1-Score, đường cong ROC-AUC. Phương pháp Cross-Validation và tối ưu hóa siêu tham số bằng GridSearch/RandomSearch."
                }
            ],
            insights: [
                "Tóm tắt các công thức toán học cốt lõi bằng định dạng dễ nhớ.",
                "Minh họa bằng code Python sử dụng thư viện Scikit-Learn và Pandas.",
                "Cung cấp tài liệu tham khảo hữu ích cho nhà khoa học dữ liệu mới bắt đầu."
            ]
        };
    }

    // Default content cho các file khác
    return {
        overview: `Tài liệu: ${title || "Không xác định"}. ${subject ? "Chuyên ngành: " + subject : ""}`,
        sections: [
            {
                title: "📖 Nội dung",
                content: "Tài liệu này chứa các thông tin và kiến thức hữu ích. Vui lòng tải xuống để xem chi tiết."
            }
        ],
        insights: [
            "Cập nhật lần cuối: " + new Date().toLocaleDateString("vi-VN")
        ]
    };
}
