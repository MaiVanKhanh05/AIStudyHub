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