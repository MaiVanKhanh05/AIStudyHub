import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isValidUrl = (url) => {
    try {
        return url && (url.startsWith("http://") || url.startsWith("https://"));
    } catch {
        return false;
    }
};

let supabaseClient = null;

if (!isValidUrl(SUPABASE_URL) || !SUPABASE_ANON_KEY || SUPABASE_URL.includes("your_supabase_url_here")) {
    console.warn(
        "⚠️ Supabase is not configured or configured with placeholder values. " +
        "Please set valid VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env to enable document uploads."
    );
} else {
    try {
        supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (error) {
        console.error("⚠️ Failed to initialize Supabase client:", error.message);
    }
}

export const supabase = supabaseClient;

// Helper function to upload file to Supabase Storage
export const uploadFileToSupabase = async (file, bucket = "documents", userId = "") => {
    try {
        if (!supabase) {
            throw new Error("Supabase storage is not configured on this application.");
        }
        if (!file) throw new Error("No file provided");

        // Keep original file name as requested
        const fileName = file.name;
        const filePath = userId ? `${userId}/${fileName}` : fileName;

        const { data, error } = await supabase.storage
            .from(bucket)
            .upload(filePath, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) throw error;

        // Get public URL
        const { data: publicData } = supabase.storage
            .from(bucket)
            .getPublicUrl(filePath);

        return {
            success: true,
            fileName: filePath,
            fileUrl: publicData?.publicUrl || "",
            size: file.size,
            type: file.type,
        };
    } catch (error) {
        return {
            success: false,
            error: error.message || "Upload failed",
        };
    }
};

// Helper to delete file from Supabase
export const deleteFileFromSupabase = async (filePath, bucket = "documents") => {
    try {
        if (!supabase) {
            throw new Error("Supabase storage is not configured on this application.");
        }
        const { error } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
};

// Helper to get file public URL
export const getFilePublicUrl = (filePath, bucket = "documents") => {
    if (!supabase) {
        console.warn("Supabase is not configured.");
        return "";
    }
    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    return data?.publicUrl || "";
};
