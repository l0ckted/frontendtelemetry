   // Fetch CSRF token and set it in the hidden input field
   document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/get-csrf-token');
        if (!response.ok) {
            throw new Error('Network response was not ok.');
        }
        const data = await response.json();
        
        // Check if the token is valid
        const storedToken = data.csrfToken;
        
        // Perform validation (e.g., against a known value or pattern)
        if (!storedToken || storedToken.length < 20) {
            // Token is invalid or missing, redirect to root
            window.location.href = '/';
        } else {
            // Set token in the hidden input field
            document.getElementById('csrfToken').value = storedToken;
        }
    } catch (error) {
        console.error('Error fetching CSRF token:', error);
        window.location.href = '/';
    }
});