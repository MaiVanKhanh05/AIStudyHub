<<<<<<< HEAD
class User {
    constructor(data) {
        Object.assign(this, data);
        this.role = this.role || "STUDENT";
        this.status = this.status || "ACTIVE";
        
        // Tự động ghép họ và tên để đảm bảo tương thích ngược
        if (this.first_name && this.last_name) {
            this.full_name = `${this.last_name} ${this.first_name}`.trim();
        } else if (this.first_name) {
            this.full_name = this.first_name;
        } else if (this.last_name) {
            this.full_name = this.last_name;
        } else {
            this.full_name = this.full_name || "";
        }
    }
}

export default User;
=======
import pg from "pg";
import dotenv from "dotenv";

class User {
    constructor(data) {
        Object.assign(this, data);

        this.role = this.role || "STUDENT";
        this.status = this.status || "ACTIVE";
    }
}

export default User;
>>>>>>> feature-document-list
