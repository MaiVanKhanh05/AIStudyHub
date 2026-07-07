const fs = require('fs');

const code = `
export const getApiUsage = async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days, 10) || 14, 30);
        const apiKey = process.env.OPENAI_ADMIN_KEY;

        if (!apiKey) {
            return res.status(403).json({ 
                error: "NO_API_KEY", 
                message: "Không tìm thấy API Key (Admin) trong cấu hình hệ thống."
            });
        }

        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (days * 86400);

        const headers = { "Authorization": \`Bearer \${apiKey}\` };

        const [costRes, usageRes] = await Promise.all([
            fetch(\`https://api.openai.com/v1/organization/costs?start_time=\${startTime}&end_time=\${endTime}&limit=31\`, { headers }),
            fetch(\`https://api.openai.com/v1/organization/usage/completions?start_time=\${startTime}&end_time=\${endTime}&limit=31\`, { headers })
        ]);

        if (!costRes.ok || !usageRes.ok) {
            const errBody = await costRes.json().catch(() => ({}));
            const errMsg = (errBody.error?.message || '').toLowerCase();
            console.error("OpenAI Admin API Error:", errBody);
            if (costRes.status === 403 || costRes.status === 401 || errMsg.includes("permission") || errMsg.includes("scope") || errMsg.includes("session")) {
                return res.status(403).json({ 
                    error: "PERMISSION_DENIED", 
                    message: "API Key thiếu quyền truy cập Organization/Admin APIs."
                });
            }
            throw new Error(\`OpenAI API Error: Costs=\${costRes.status}, Usage=\${usageRes.status}\`);
        }

        const costData = await costRes.json();
        const usageData = await usageRes.json();

        const dailyCostsMap = new Map();
        if (costData.data) {
            costData.data.forEach(bucket => {
                const dateStr = bucket.start_time_iso.split('T')[0];
                let cost = 0;
                bucket.results.forEach(res => {
                    cost += parseFloat(res.amount.value || 0);
                });
                dailyCostsMap.set(dateStr, cost);
            });
        }

        const usageMap = new Map();
        if (usageData.data) {
            usageData.data.forEach(bucket => {
                const dateStr = bucket.start_time_iso.split('T')[0];
                let requests = 0;
                let tokens = 0;
                bucket.results.forEach(res => {
                    requests += res.num_model_requests || 0;
                    tokens += (res.input_tokens || 0) + (res.output_tokens || 0);
                });
                usageMap.set(dateStr, { requests, tokens });
            });
        }

        let totalSpend = 0;
        const apiData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const cost = dailyCostsMap.get(dateStr) || 0;
            const usage = usageMap.get(dateStr) || { requests: 0, tokens: 0 };
            
            totalSpend += cost;
            apiData.push({
                date: dateStr,
                cost: parseFloat(cost.toFixed(4)),
                requests: usage.requests,
                tokens: usage.tokens
            });
        }

        res.json({
            apiData,
            totalSpend: parseFloat(totalSpend.toFixed(4))
        });

    } catch (error) {
        console.error("Error fetching API usage:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
`;

const path = 'd:/AIStudyHub/backend/src/controllers/admin.controller.js';
fs.appendFileSync(path, '\n' + code + '\n');
