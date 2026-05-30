class Document {
    constructor(data) {
        Object.assign(this, data);
        this.upload_status = this.upload_status || "SUCCESS";
        this.visibility = this.visibility || "PRIVATE";
    }
}

export default Document;
