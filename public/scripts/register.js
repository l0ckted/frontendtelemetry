document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // Obtener el token CSRF del meta tag
    const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');

    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken // Incluir el token CSRF en el encabezado
        },
        body: JSON.stringify({ username, email, password })
    });

    const data = await response.json();
    
    if (response.ok) {
        alert(data.message);
    } else {
        alert('Error: ' + data.message);
    }
});