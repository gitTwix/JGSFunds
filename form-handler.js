// form-handler.js (Client-Side)
document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form'); 
    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault(); 

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        console.log("Submitting data to Netlify Function...");

        try {
            // This calls the serverless function endpoint
            const response = await fetch('/.netlify/functions/submit-form', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (result.success) {
                alert("Success! Form submitted.");
                form.reset();
            } else {
                alert("Submission failed: " + result.message);
            }
        } catch (error) {
            console.error("Network or function error:", error);
            alert("An error occurred while connecting to the server.");
        }
    });
});