class ChatSession {
    constructor(data) {
        Object.assign(this, data);
        this.title = this.title || "Cuộc hội thoại mới";
    }
}

export default ChatSession;
