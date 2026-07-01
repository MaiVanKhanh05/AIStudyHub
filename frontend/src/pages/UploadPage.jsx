import { useState, useRef, useEffect } from "react";
import { Upload, X, CheckCircle, AlertCircle, Loader, Globe, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFileToSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function UploadPage() {
    // --- KHAI BÁO STATE CƠ BẢN ---
    const [files, setFiles] = useState([]); // Mảng chứa các file người dùng đã chọn
    const [uploading, setUploading] = useState(false); // Trạng thái có đang upload hay không (để xoay spinner)
    const [dragActive, setDragActive] = useState(false); // Trạng thái khi người dùng kéo thả file vào vùng Drag & Drop
    
    // --- THAM CHIẾU (REFS) ---
    const fileInputRef = useRef(null); // Reference đến thẻ <input type="file"> bị ẩn
    const isUploadingRef = useRef(false); // Biến cờ (flag) chống click double khi đang tải
    
    // --- THÔNG TIN TÀI LIỆU (METADATA) ---
    const [documentTitle, setDocumentTitle] = useState("");
    const [subject, setSubject] = useState("");
    const [description, setDescription] = useState("");
    const [visibility, setVisibility] = useState("PRIVATE"); // Trạng thái hiển thị mặc định (Cá nhân)

    // --- THÔNG TIN NGƯỜI DÙNG HIỆN TẠI ---
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    const user = userStr ? JSON.parse(userStr) : null;
    const userRole = user?.role || "STUDENT"; // Phân quyền: LECTURER thì được set Public
    
    // --- KIỂM SOÁT DUNG LƯỢNG LƯU TRỮ ---
    const [currentStorageUsage, setCurrentStorageUsage] = useState(0); // Dung lượng đã dùng
    const storageLimit = user?.max_storage_bytes || 2147483648; // Giới hạn dung lượng (default 2GB)

    // --- EFFECT: LẤY THÔNG TIN DUNG LƯỢNG TỪ SERVER KHI MỞ TRANG ---
    useEffect(() => {
        const fetchStorage = async () => {
            try {
                const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                if (!token) return; // Nếu chưa đăng nhập thì bỏ qua
                
                // Gọi API backend để lấy dung lượng lưu trữ hiện tại
                const res = await fetch("http://localhost:5000/api/documents/dashboard", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentStorageUsage(data.storageUsage || 0); // Cập nhật state dung lượng đã dùng
                }
            } catch (err) {
                console.error("Error fetching storage:", err);
            }
        };
        fetchStorage();
    }, []); // Chạy 1 lần duy nhất khi component mount

    // --- QUY TẮC FILE (VALIDATION CONFIG) ---
    const MAX_FILE_SIZE = 50 * 1024 * 1024; // Dung lượng file tối đa: 50MB
    const ALLOWED_TYPES = [
        "application/pdf", // PDF
        "application/msword", // DOC cũ
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // DOCX
        "application/vnd.ms-excel", // XLS cũ
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // XLSX
        "text/plain", // TXT
        "image/jpeg", // JPG/JPEG
        "image/png", // PNG
        "image/webp", // WEBP
    ];

    // --- XỬ LÝ KÉO THẢ (DRAG & DROP) ---
    // Hiển thị hiệu ứng khi đang kéo thả file vào vùng chỉ định
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true); // Kích hoạt đổi màu nền
        } else if (e.type === "dragleave") {
            setDragActive(false); // Trả lại màu nền cũ
        }
    };

    // Hàm kiểm tra file có hợp lệ (kích thước, định dạng) hay không
    const validateFile = (file) => {
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`File "${file.name}" exceeds 50MB limit`);
            return false;
        }
        if (!ALLOWED_TYPES.includes(file.type)) {
            toast.error(
                `File type "${file.type}" not allowed. Please upload PDF, DOCX, XLSX, TXT, or images.`
            );
            return false;
        }
        return true;
    };

    // Xử lý sự kiện khi người dùng "thả" file vào ô nét đứt
    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        const droppedFiles = Array.from(e.dataTransfer.files);
        addFiles(droppedFiles); // Chuyển sang hàm addFiles để lọc và thêm
    };

    // Xử lý sự kiện khi người dùng "click" chọn file từ máy tính (qua thẻ input ẩn)
    const handleFileInput = (e) => {
        const selectedFiles = Array.from(e.target.files);
        addFiles(selectedFiles);
    };

    // Hàm chung để thêm file mới vào danh sách chờ
    const addFiles = (newFiles) => {
        const validFiles = newFiles.filter(validateFile); // Bỏ qua các file không qua được vòng gửi xe
        if (validFiles.length > 0) {
            setFiles((prev) => [
                ...prev,
                ...validFiles.map((file) => ({
                    file, // Bản thân đối tượng file gốc
                    id: Math.random().toString(36).substring(7), // Tạo ID ngẫu nhiên để quản lý React Key
                    status: "pending", // Trạng thái mặc định là "đang chờ"
                    progress: 0,
                    error: null,
                    uploadedUrl: null,
                })),
            ]);
        }
    };

    // Xóa một file khỏi danh sách chờ (bằng cách click nút X)
    const removeFile = (id) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    // Hàm xử lý chính cho việc Upload tài liệu
    const handleUpload = async () => {
        // 1. Kiểm tra trạng thái: Nếu đang upload thì không cho bấm liên tục
        if (isUploadingRef.current) return;

        // 2. Validate form: Yêu cầu phải có file và tiêu đề tài liệu
        if (files.length === 0) {
            toast.error("Please select files to upload");
            return;
        }

        if (!documentTitle.trim()) {
            toast.error("Please enter a document title");
            return;
        }

        // 3. Lọc ra danh sách các file đang chờ upload
        const pendingFiles = files.filter((f) => f.status === "pending");
        if (pendingFiles.length === 0) return;

        // 4. Kiểm tra giới hạn dung lượng lưu trữ (Storage limit check)
        // Lấy tổng dung lượng các file sắp upload cộng với dung lượng hiện tại đã dùng
        const totalNewBytes = pendingFiles.reduce((acc, f) => acc + f.file.size, 0);
        if (currentStorageUsage + totalNewBytes > storageLimit) {
            toast.error("Dung lượng lưu trữ của bạn đã đầy. Không thể tải lên tài liệu mới.");
            return;
        }

        // Khóa trạng thái giao diện để bắt đầu tiến trình upload
        isUploadingRef.current = true;
        setUploading(true);

        // 5. Tiến hành Upload từng file song song (dùng Promise.all sau đó)
        const uploadPromises = pendingFiles
            .map(async (fileItem) => {
                try {
                    // 5.1. Cập nhật UI: Đổi trạng thái file thành "đang upload" để hiện spinner
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileItem.id ? { ...f, status: "uploading" } : f
                        )
                    );

                    // 5.2. Lấy thông tin User để tạo thư mục lưu trữ cá nhân hóa trên Supabase (ví dụ: /userId/filename)
                    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
                    const user = userStr ? JSON.parse(userStr) : null;
                    const userId = user?.user_id || "";

                    // 5.3. BƯỚC UPLOAD VẬT LÝ LÊN SUPABASE
                    // Gọi hàm uploadFileToSupabase đẩy file vật lý lên bucket 'AIStudyHub' trên Supabase.
                    const result = await uploadFileToSupabase(fileItem.file, "AIStudyHub", userId);

                    if (result.success) {
                        // 5.4. BƯỚC LƯU METADATA LÊN BACKEND (POSTGRESQL)
                        // Nếu file upload lên Supabase thành công, ta lấy được URL của file (result.fileUrl)
                        const token =
                            localStorage.getItem("token") ||
                            sessionStorage.getItem("token");

                        // Gọi API tới backend để lưu thông tin về tài liệu vào Database
                        const response = await fetch("http://localhost:5000/api/documents/upload", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`, // Gửi token để xác thực user
                            },
                            body: JSON.stringify({
                                title: documentTitle,
                                subject,
                                description,
                                file_url: result.fileUrl, // URL file lấy từ Supabase trả về
                                file_name: fileItem.file.name,
                                file_type: fileItem.file.type,
                                file_size: result.size,
                                visibility: userRole === "LECTURER" ? visibility : "PRIVATE"
                            }),
                        });

                        if (!response.ok) {
                            const errorData = await response.json();
                            throw new Error(errorData.error || "Failed to save document metadata");
                        }

                        // 5.5. Cập nhật UI: File upload thành công, hiển thị dấu tích xanh
                        setFiles((prev) =>
                            prev.map((f) =>
                                f.id === fileItem.id
                                    ? {
                                        ...f,
                                        status: "completed",
                                        uploadedUrl: result.fileUrl,
                                    }
                                    : f
                            )
                        );

                        toast.success(`"${fileItem.file.name}" uploaded successfully`);
                    } else {
                        // Bắt lỗi nếu upload Supabase thất bại
                        throw new Error(result.error);
                    }
                } catch (error) {
                    // 5.6. Bắt lỗi: Nếu có bất kì lỗi gì (từ Supabase hoặc Backend), báo đỏ file đó
                    setFiles((prev) =>
                        prev.map((f) =>
                            f.id === fileItem.id
                                ? {
                                    ...f,
                                    status: "error",
                                    error: error.message,
                                }
                                : f
                        )
                    );
                    toast.error(`Lỗi tải lên "${fileItem.file.name}": ${error.message}`);
                }
            });

        // Đợi tất cả các file trong mảng tiến trình xử lý xong
        await Promise.all(uploadPromises);
        
        // Mở khóa UI
        setUploading(false);
        isUploadingRef.current = false;

        // 6. Reset form: Dọn dẹp giao diện nếu toàn bộ file tải lên trơn tru không lỗi lầm
        if (files.every((f) => f.status === "completed")) {
            setDocumentTitle("");
            setSubject("");
            setDescription("");
            setTimeout(() => setFiles([]), 1000);
        }
    };

    // --- HÀM HỖ TRỢ (UTILITIES) ---
    // Trả về icon emoji tương ứng theo định dạng file
    const getFileIcon = (fileName) => {
        const ext = fileName.split(".").pop().toLowerCase();
        if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "🖼️";
        if (ext === "pdf") return "📄";
        if (["doc", "docx"].includes(ext)) return "📝";
        if (["xls", "xlsx"].includes(ext)) return "📊";
        if (ext === "txt") return "📃";
        return "📦"; // Default icon
    };

    // Định dạng byte thành KB, MB, GB cho dễ đọc
    const formatFileSize = (bytes) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 py-10">
            <div className="max-w-2xl mx-auto px-6">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
                        Upload Documents
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400">
                        Share your study materials with the community
                    </p>
                </div>

                {/* Main Card */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
                    {/* Drag and Drop Area */}
                    <div
                        className={`relative rounded-lg border-2 border-dashed transition-all ${dragActive
                            ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                            : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:border-purple-400"
                            } p-8 text-center cursor-pointer`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            onChange={handleFileInput}
                            className="hidden"
                            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
                        />

                        <div className="flex flex-col items-center justify-center">
                            <div
                                className={`p-3 rounded-lg mb-4 transition-colors ${dragActive
                                    ? "bg-purple-200 dark:bg-purple-900"
                                    : "bg-purple-100 dark:bg-purple-900/50"
                                    }`}
                            >
                                <Upload
                                    className={`w-8 h-8 ${dragActive ? "text-purple-600" : "text-purple-500"
                                        }`}
                                />
                            </div>

                            <p className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                Drag and drop your files here
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                or click to browse from your computer
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                                Supported formats: PDF, DOCX, XLSX, TXT, and images (max 50MB each)
                            </p>
                        </div>
                    </div>

                    {/* Document Info Form */}
                    <div className="mt-8 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Document Title <span className="text-red-500">*</span>
                            </label>
                            <Input
                                type="text"
                                placeholder="e.g., Advanced Machine Learning Fundamentals"
                                value={documentTitle}
                                onChange={(e) => setDocumentTitle(e.target.value)}
                                className="w-full"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Subject/Topic
                                </label>
                                <Input
                                    type="text"
                                    placeholder="e.g., AI, Data Science"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                    className="w-full"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Description
                            </label>
                            <textarea
                                placeholder="Brief description of the document..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="3"
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        {/* Visibility Selection for Lecturer */}
                        {userRole === "LECTURER" && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Phạm vi chia sẻ (Giảng viên)
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div
                                        onClick={() => setVisibility("PRIVATE")}
                                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                                            visibility === "PRIVATE"
                                                ? "border-purple-500 bg-purple-50 dark:bg-purple-900/30"
                                                : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg mr-3 ${visibility === "PRIVATE" ? "bg-purple-200 text-purple-700" : "bg-gray-100 text-gray-500"}`}>
                                            <Lock size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Cá nhân</p>
                                            <p className="text-xs text-gray-500">Chỉ mình tôi xem được</p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setVisibility("PUBLIC")}
                                        className={`flex items-center p-4 border rounded-xl cursor-pointer transition-all ${
                                            visibility === "PUBLIC"
                                                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                                : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
                                        }`}
                                    >
                                        <div className={`p-2 rounded-lg mr-3 ${visibility === "PUBLIC" ? "bg-blue-200 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                                            <Globe size={20} />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900 dark:text-white">Cộng đồng</p>
                                            <p className="text-xs text-gray-500">Tất cả sinh viên đều xem được</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Files List */}
                    {files.length > 0 && (
                        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                                Files ({files.length})
                            </h3>
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {files.map((fileItem) => (
                                    <div
                                        key={fileItem.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600"
                                    >
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <span className="text-xl">
                                                {getFileIcon(fileItem.file.name)}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                                    {fileItem.file.name}
                                                </p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {formatFileSize(fileItem.file.size)}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 ml-4">
                                            {fileItem.status === "pending" && (
                                                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                                    Ready
                                                </span>
                                            )}
                                            {fileItem.status === "uploading" && (
                                                <Loader className="w-4 h-4 text-purple-500 animate-spin" />
                                            )}
                                            {fileItem.status === "completed" && (
                                                <CheckCircle className="w-4 h-4 text-green-500" />
                                            )}
                                            {fileItem.status === "error" && (
                                                <AlertCircle className="w-4 h-4 text-red-500" />
                                            )}

                                            {fileItem.status === "pending" && (
                                                <button
                                                    onClick={() => removeFile(fileItem.id)}
                                                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                                                >
                                                    <X className="w-4 h-4 text-gray-500" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Error Message */}
                    {files.some((f) => f.status === "error") && (
                        <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                            <p className="text-sm text-red-800 dark:text-red-200">
                                Some files failed to upload. Please check and try again.
                            </p>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={handleUpload}
                        disabled={files.length === 0 || uploading || !documentTitle.trim()}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 text-white h-11 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {uploading ? (
                            <div className="flex items-center gap-2">
                                <Loader className="w-4 h-4 animate-spin" />
                                Uploading...
                            </div>
                        ) : (
                            "Upload Documents"
                        )}
                    </Button>
                    <Button
                        onClick={() => {
                            setFiles([]);
                            setDocumentTitle("");
                            setSubject("");
                            setDescription("");
                        }}
                        disabled={uploading}
                        className="px-6 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white h-11 rounded-lg font-semibold"
                    >
                        Clear
                    </Button>
                </div>

                {/* Tips */}
                <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <p className="text-sm text-blue-900 dark:text-blue-200">
                        <strong>💡 Tip:</strong> Supported formats include PDF, Word documents, Excel sheets, text files, and images. Maximum file size is 50MB per file.
                    </p>
                </div>
            </div>
        </div>
    );
}
