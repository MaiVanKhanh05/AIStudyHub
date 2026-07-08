// Cấu hình API URL trung tâm
// - Local: dùng http://localhost:5000
// - Production (Vercel): VITE_API_URL được set trong Vercel Environment Variables
export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
