const { GoogleGenAI } = require("@google/genai");

const test = async () => {
    try {
        const ai = new GoogleGenAI({ apiKey: "YOUR_GEMINI_KEY" });
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "say hi",
            config: {
                responseMimeType: "application/json"
            }
        });
        console.log(response.text);
    } catch(err) {
        console.error("error:", err);
    }
}
test();
