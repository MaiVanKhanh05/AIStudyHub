import { generateOTP } from "../controllers/auth.controller.js";

async function runTests() {
    console.log("=== BẮT ĐẦU CHẠY KIỂM THỬ TỰ ĐỘNG AUTH ===");
    let failures = 0;

    // Test 1: Kiểm tra định dạng của OTP
    try {
        const otp = generateOTP();
        if (typeof otp !== "string") {
            throw new Error(`OTP phải là một chuỗi (string), nhận được: ${typeof otp}`);
        }
        if (otp.length !== 6) {
            throw new Error(`OTP phải có độ dài đúng 6 ký tự, nhận được độ dài: ${otp.length}`);
        }
        if (!/^\d{6}$/.test(otp)) {
            throw new Error(`OTP phải chỉ chứa các chữ số từ 0 đến 9, nhận được: ${otp}`);
        }
        console.log("✅ Test 1 Pass: generateOTP tạo mã OTP 6 chữ số hợp lệ.");
    } catch (err) {
        console.error("❌ Test 1 Fail:", err.message);
        failures++;
    }

    // Test 2: Chạy nhiều lần để đảm bảo OTP luôn là 6 chữ số
    try {
        let allValid = true;
        let invalidOtp = "";
        for (let i = 0; i < 1000; i++) {
            const otp = generateOTP();
            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                allValid = false;
                invalidOtp = otp;
                break;
            }
        }
        if (!allValid) {
            throw new Error(`Có OTP được sinh ra không hợp lệ: ${invalidOtp}`);
        }
        console.log("✅ Test 2 Pass: generateOTP tạo OTP hợp lệ trong 1000 lần liên tiếp.");
    } catch (err) {
        console.error("❌ Test 2 Fail:", err.message);
        failures++;
    }

    console.log("=== TỔNG KẾT KIỂM THỬ ===");
    if (failures === 0) {
        console.log("TẤT CẢ THÀNH CÔNG!");
        process.exit(0);
    } else {
        console.error(` CÓ ${failures} BÀI TEST AUTH BỊ THẤT BẠI!`);
        process.exit(1);
    }
}

runTests();
