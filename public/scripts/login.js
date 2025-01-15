document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const resultElement = document.getElementById('result');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default form behavior

        // Get the form values
        const email = document.getElementById('email').value;
        const contrasena = document.getElementById('contrasena').value;

        if (!email || !contrasena) {
            resultElement.textContent = 'Por favor, ingresa tu correo y contraseña.';
            resultElement.style.color = 'red';
            return;
        }

        try {
            // Fetch CSRF token from the server (localhost:5000)
            const csrfResponse = await fetch('http://localhost:5000/api/auth/csrf-token', {
                method: 'GET', // Make sure the CSRF token request is a GET request
                credentials: 'include', // Ensure cookies (if any) are sent
            });

            if (!csrfResponse.ok) {
                throw new Error('Error al obtener el token CSRF');
            }

            const csrfData = await csrfResponse.json();
            const csrfToken = csrfData.csrfToken;

            // Send login request to the backend (localhost:3000) with CSRF token in headers
            const response = await fetch('https://api.desert-iot.cl/api/usuarios/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-csrf-token': csrfToken, // Include CSRF token in request headers
                },
                body: JSON.stringify({ email, contrasena }),
                credentials: 'include', // Ensure cookies (if any) are sent
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Error en el inicio de sesión');
            }

            // Get the response data
            const data = await response.json();

            // Store the complete response (including the JWT token) in localStorage
            localStorage.setItem('userData', JSON.stringify(data));

            // Show success message
            resultElement.textContent = 'Inicio de sesión exitoso';
            resultElement.style.color = 'green';

            console.log('Datos almacenados en localStorage:');
            console.log('Respuesta completa:', data);

            // Redirect to the dashboard or another page
            window.location.href = '/dashboard';

        } catch (error) {
            console.error('Error:', error);
            resultElement.textContent = 'Error en el inicio de sesión: ' + error.message;
            resultElement.style.color = 'red';
        }
    });
});
