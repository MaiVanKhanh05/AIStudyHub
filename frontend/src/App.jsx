import { useState } from 'react'


function App() {
  // 1. Các State quản lý dữ liệu dữ liệu giao diện
  const [emailInput, setEmailInput] = useState("") // Lưu email gõ vào ô nhập
  const [userData, setUserData] = useState(null)     // Lưu thông tin User trả về từ Backend
  const [error, setError] = useState("")             // Lưu thông báo lỗi nếu có
  const [loading, setLoading] = useState(false)       // Trạng thái hiệu ứng đợi khi tải dữ liệu

  // 2. Hàm xử lý khi nhấn nút "Tìm kiếm"
  const handleSearch = async (e) => {
    e.preventDefault() // Ngăn trang bị reload lại
    setError("")       // Reset lỗi cũ
    setUserData(null)   // Reset dữ liệu cũ
    setLoading(true)    // Bật hiệu ứng loading

    try {
      // Gọi API đến Backend (đảm bảo Backend Node.js của bạn đang chạy ở port 5000 nhé)
      const response = await fetch("http://localhost:5000/api/users/find-by-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: emailInput }), // Gửi email dưới dạng JSON string
      })

      const result = await response.json()

      if (result.error) {
        setError(result.error)
      } else {
        setUserData(result)
      }
    } catch (err) {
      setError("Không thể kết nối đến Backend. Hãy chắc chắn Backend đang chạy ở port 5000!")
    } finally {
      setLoading(false) // Tắt hiệu ứng loading khi xong xuôi
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6">
      <div className="bg-white p-8 rounded-xl shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
          Tìm Kiếm Người Dùng
        </h2>

        {/* Form Nhập Email */}
        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Địa chỉ Email
            </label>
            <input
              type="email"
              placeholder="Nhập email cần tìm (Ví dụ: an@gmail.com)..."
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition text-gray-900"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200 disabled:bg-blue-400"
          >
            {loading ? "Loading..." : "Tìm kiếm"}
          </button>
        </form>

        {/* Khu vực hiển thị thông báo lỗi */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded">
            <p className="font-medium">❌ Thất bại</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {/* Khu vực kết quả: Hiển thị thông tin User khi tìm thấy */}
        {userData && (
          <div className="mt-6 p-5 bg-green-50 border border-green-200 rounded-xl">
            <h3 className="text-lg font-bold text-green-800 mb-3 flex items-center gap-2">
              🎉 Đã tìm thấy thành viên!
            </h3>

            <div className="space-y-2 text-sm text-gray-700">
              <p><strong className="text-gray-900">ID:</strong> {userData.id}</p>
              <p><strong className="text-gray-900">Họ và tên:</strong> {userData.name}</p>
              <p><strong className="text-gray-900">Email:</strong> {userData.email}</p>
              <p>
                <strong className="text-gray-900">Quyền hạn:</strong>{" "}
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-semibold rounded">
                  {userData.role}
                </span>
              </p>
              <p>
                <strong className="text-gray-900">Trạng thái:</strong>{" "}
                <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-semibold rounded">
                  {userData.status}
                </span>
              </p>
              <div className="pt-2 border-t border-green-200">
                <p className="text-xs text-gray-500 font-medium mb-1">Mật khẩu đã băm (DB Hash):</p>
                <p className="text-xs bg-white p-2 rounded border border-gray-200 font-mono break-all text-gray-600">
                  {userData.password}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Trạng thái ban đầu khi chưa bấm nút */}
        {!userData && !error && (
          <p className="mt-6 text-sm text-gray-500 text-center">
            Nhập email chính xác được lưu trong PostgreSQL để xem thông tin chi tiết.
          </p>
        )}
      </div>
    </div>
  )
}

export default App