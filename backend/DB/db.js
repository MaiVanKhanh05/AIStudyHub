import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

// Parse DATE database column as a raw string instead of local Date object
pg.types.setTypeParser(1082, (val) => val);

const { Pool } = pg;

const pool = new Pool({
    ...(process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.POSTGRES_HOST || "localhost",
            port: Number(process.env.PORT_DB) || 5432,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD || "dummy_password_to_avoid_pg_crash",
            database: process.env.POSTGRES_DB,
        }),
    ssl: (process.env.DATABASE_URL || (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST !== "localhost"))
        ? { rejectUnauthorized: false }
        : false,
    max: 5,
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 5000,
});

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
});

export const connectDB = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to PostgreSQL (AIStudyHub) successfully!");

        // Ensure views and downloads columns exist in the document table
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS views INT DEFAULT 0");
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0");
        console.log("Database schema columns (views, downloads) verified.");

        // Ensure user profile columns exist
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(100)");
        console.log("Database schema columns for users (phone, dob, gender, major) verified.");

        // Create document_permissions table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_permissions (
                permission_id SERIAL PRIMARY KEY,
                document_id INT NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                role VARCHAR(20) NOT NULL CHECK(role IN ('EDITOR','VIEWER')),
                granted_by VARCHAR(50),
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_docperm_document FOREIGN KEY (document_id) REFERENCES document(document_id) ON DELETE CASCADE,
                CONSTRAINT FK_docperm_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT FK_docperm_grantedby FOREIGN KEY (granted_by) REFERENCES users(user_id) ON DELETE SET NULL,
                UNIQUE(document_id, user_id)
            )
        `);

        // Create indexes if not exists
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_docperm_document ON document_permissions(document_id);
            CREATE INDEX IF NOT EXISTS idx_docperm_user ON document_permissions(user_id);
        `);

        // Migrate document.visibility values: PRIVATE -> RESTRICTED
        await pool.query(`
            UPDATE document SET visibility = 'RESTRICTED' WHERE visibility = 'PRIVATE'
        `);

        // Fix inconsistent old records where is_community is false but visibility is PUBLIC
        await pool.query(`
            UPDATE document SET visibility = 'RESTRICTED' WHERE is_community = FALSE AND visibility = 'PUBLIC'
        `);

        // Alter default visibility column default constraint to RESTRICTED
        await pool.query(`
            ALTER TABLE document ALTER COLUMN visibility SET DEFAULT 'RESTRICTED'
        `);

        console.log("Database document_permissions migrations verified and executed successfully.");
        
        // Create document_bookmarks table for favorites feature
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_bookmarks (
                user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
                document_id INT REFERENCES document(document_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, document_id)
            )
        `);
        
        // Create chat_sessions and chat_messages tables for AI Assistant Chat History
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_sessions (
                id VARCHAR(50) PRIMARY KEY,
                user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
                title VARCHAR(255) NOT NULL,
                is_pinned BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id VARCHAR(50) PRIMARY KEY,
                session_id VARCHAR(50) REFERENCES chat_sessions(id) ON DELETE CASCADE,
                sender VARCHAR(10) NOT NULL CHECK(sender IN ('ai','user')),
                text TEXT NOT NULL,
                files JSONB DEFAULT '[]'::jsonb,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chatsess_user ON chat_sessions(user_id);
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_chatmsg_session ON chat_messages(session_id);
        `);

        console.log("Database schema columns and tables verified.");

        // Ensure is_community column exists in document table
        await pool.query(
            "ALTER TABLE document ADD COLUMN IF NOT EXISTS is_community BOOLEAN DEFAULT FALSE"
        );
        console.log("Database schema column is_community verified.");

        // Create quizzes table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quizzes (
                quiz_id SERIAL PRIMARY KEY,
                document_id INT,
                user_id VARCHAR(50),
                title VARCHAR(255) NOT NULL,
                quiz_type VARCHAR(50) DEFAULT 'MULTIPLE_CHOICE',
                source_type VARCHAR(50),
                topics JSONB DEFAULT '[]'::jsonb,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_quiz_document FOREIGN KEY (document_id) REFERENCES document(document_id) ON DELETE SET NULL,
                CONSTRAINT FK_quiz_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Create quiz_questions table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_questions (
                question_id SERIAL PRIMARY KEY,
                quiz_id INT NOT NULL,
                question_text TEXT NOT NULL,
                options JSONB NOT NULL,
                correct_answer INT NOT NULL,
                explanation TEXT,
                topic VARCHAR(255),
                CONSTRAINT FK_question_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE
            )
        `);

        // Create quiz_attempts table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_attempts (
                attempt_id SERIAL PRIMARY KEY,
                quiz_id INT NOT NULL,
                user_id VARCHAR(50),
                score INT NOT NULL,
                total_questions INT NOT NULL,
                time_spent_seconds INT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_attempt_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes(quiz_id) ON DELETE CASCADE,
                CONSTRAINT FK_attempt_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Create quiz_attempt_answers table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS quiz_attempt_answers (
                attempt_answer_id SERIAL PRIMARY KEY,
                attempt_id INT NOT NULL,
                question_id INT NOT NULL,
                selected_answer INT,
                is_correct BOOLEAN NOT NULL,
                CONSTRAINT FK_attans_attempt FOREIGN KEY (attempt_id) REFERENCES quiz_attempts(attempt_id) ON DELETE CASCADE,
                CONSTRAINT FK_attans_question FOREIGN KEY (question_id) REFERENCES quiz_questions(question_id) ON DELETE CASCADE
            )
        `);

        // Create indexes for optimization
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_quizzes_user ON quizzes(user_id);
            CREATE INDEX IF NOT EXISTS idx_quizzes_document ON quizzes(document_id);
            CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);
            CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);
            CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);
            CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt ON quiz_attempt_answers(attempt_id);
        `);
        console.log("Database quiz tables and indexes verified successfully.");

        // Create flashcard_sets table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS flashcard_sets (
                set_id SERIAL PRIMARY KEY,
                document_id INT,
                user_id VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                card_count INT DEFAULT 0,
                source_type VARCHAR(50) DEFAULT 'RESEARCH_ASSISTANT',
                generation_prompt TEXT,
                topics JSONB DEFAULT '[]'::jsonb,
                document_snapshot TEXT,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_fc_set_document FOREIGN KEY (document_id) REFERENCES document(document_id) ON DELETE SET NULL,
                CONSTRAINT FK_fc_set_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
            )
        `);

        // Create flashcards table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS flashcards (
                card_id SERIAL PRIMARY KEY,
                set_id INT NOT NULL,
                front TEXT NOT NULL,
                back TEXT NOT NULL,
                card_type VARCHAR(50) DEFAULT 'DEFINITION',
                topic VARCHAR(255),
                importance_score INT DEFAULT 50,
                status VARCHAR(20) DEFAULT 'ACTIVE',
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_flashcard_set FOREIGN KEY (set_id) REFERENCES flashcard_sets(set_id) ON DELETE CASCADE
            )
        `);

        // Create indexes
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_fc_sets_user ON flashcard_sets(user_id);
            CREATE INDEX IF NOT EXISTS idx_fc_sets_document ON flashcard_sets(document_id);
            CREATE INDEX IF NOT EXISTS idx_flashcards_set ON flashcards(set_id);
        `);
        console.log("Database flashcard tables and indexes verified successfully.");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
};

export default pool;
