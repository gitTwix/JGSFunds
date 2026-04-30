// netlify/functions/submit-form.js
// This code runs securely on the Netlify server.

exports.handler = async (event, context) => {
    // 1. Access the API Key from the environment variables
    const apiKey = process.env.JOTFORM_API_KEY;

    if (!apiKey) {
        console.error("JotForm Submission Failed: API Key is missing.");
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: "Server configuration error: Jotform API Key is missing." })
        };
    }

    // 2. Get the data sent from the client-side fetch request
    const formData = event.body ? JSON.parse(event.body) : {};

    console.log("--- JotForm Submission Attempt ---");
    console.log("Received Data:", formData);
    console.log("Using API Key (Partial):", apiKey.substring(0, 5) + "...");

    try {
        // 3. Execute the actual API Call
        const response = await fetch('https://api.jotform.com/submit', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            console.log("✅ JotForm Success: Data submitted successfully.");
            return {
                statusCode: 200,
                body: JSON.stringify({ success: true, message: "Form submitted successfully." })
            };
        } else {
            // Handle API-specific errors (e.g., validation failure)
            console.error("❌ JotForm Failure:", result.message || "Unknown API error.");
            return {
                statusCode: 400,
                body: JSON.stringify({ success: false, message: `JotForm API Error: ${result.message || 'Validation failed.'}` })
            };
        }

    } catch (error) {
        console.error("❌ Critical Submission Error:", error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ success: false, message: "Internal server error during submission." })
        };
    }
};