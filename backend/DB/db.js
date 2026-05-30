import pg from "pg";
import dotenv from "dotenv";

<<<<<<< HEAD
=======
// Load biến môi trường
>>>>>>> feature-document-list
dotenv.config();

const { Pool } = pg;

const pool = new Pool({
<<<<<<< HEAD
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.PORT_DB) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
=======
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST ,
    database: process.env.POSTGRES_DB,
    password: String(process.env.POSTGRES_PASSWORD), 
    port: process.env.PORT_DB,
>>>>>>> feature-document-list
});

export const connectDB = async () => {
    try {
        await pool.query("SELECT 1");
<<<<<<< HEAD
        console.log("✅ Connected to PostgreSQL (AIStudyHub) successfully!");
    } catch (error) {
        console.error("❌ Error connecting to the database:", error.message);
=======
        console.log("Connected to PostgreSQL (AIStudyHub) successfully!");
    } catch (error) {
        console.error("Error connecting to the database:", error);
>>>>>>> feature-document-list
        process.exit(1);
    }
};

<<<<<<< HEAD
export default pool;
=======
export default pool;
>>>>>>> feature-document-list
