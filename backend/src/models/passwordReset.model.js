class PasswordReset {
    constructor(data) {
        Object.assign(this, data);
        this.is_used = this.is_used !== undefined ? this.is_used : false;
    }
}

export default PasswordReset;
