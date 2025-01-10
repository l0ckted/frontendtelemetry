// Función para obtener el valor del token desde el almacenamiento local
function getTokenFromLocalStorage() {
  return new Promise((resolve, reject) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      resolve(token);
    } else {
      reject('Token no encontrado');
    }
  });
}

// Función para decodificar un JSON Web Token (JWT)
function decodeToken(token) {
  try {
    const payload = token.split('.')[1]; // El payload está en la segunda parte del token
    return JSON.parse(atob(payload));   // Decodifica el payload en base64
  } catch (e) {
    console.error('Error al decodificar el token:', e);
    return null;
  }
}

// Función para verificar si el token ha expirado
function isTokenExpired(token) {
  const decoded = decodeToken(token);
  if (!decoded || !decoded.exp) return true; // Si no tiene `exp`, lo consideramos inválido o expirado
  return decoded.exp * 1000 < Date.now();   // Comparar el tiempo de expiración con la hora actual
}

// Función para renovar el token (simulada)
function renewSession() {
  return new Promise((resolve, reject) => {
    // Aquí deberías hacer una solicitud al backend para renovar el token
    // En este ejemplo, vamos a suponer que simplemente extendemos la expiración por una hora
    const newToken = "nuevo_token_generado"; // Simulación del nuevo token
    localStorage.setItem('auth_token', newToken);
    resolve(newToken);
  });
}

// Función para preguntar al usuario si desea renovar la sesión
function askToRenewSession() {
  return new Promise((resolve, reject) => {
    const userResponse = window.confirm("Tu sesión está a punto de caducar. ¿Deseas renovarla por una hora más?");
    if (userResponse) {
      renewSession().then((newToken) => {
        resolve(newToken);
      }).catch(reject);
    } else {
      reject('El usuario no renovó la sesión');
    }
  });
}

// Función principal para verificar el token y redirigir si es necesario
async function verifyToken() {
  try {
    const token = await getTokenFromLocalStorage(); // Obtener el token de manera asíncrona

    // Verificar si el token está expirado
    if (isTokenExpired(token)) {
      alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      window.location.href = '/login.html'; // Cambia '/login' por la ruta de tu página de inicio de sesión
    } else {
      // Si el token no ha expirado, preguntar si desea renovarlo
      const decodedToken = decodeToken(token);
      const expirationTime = decodedToken.exp * 1000;
      const timeBeforeExpire = expirationTime - Date.now();

      // Preguntar si desea renovar la sesión 5 minutos antes de que expire
      if (timeBeforeExpire > 0 && timeBeforeExpire <= 5 * 60 * 1000) {
        askToRenewSession().then(() => {
          console.log("Sesión renovada exitosamente.");
        }).catch(() => {
          console.log("No se renovó la sesión.");
        });
      }
    }
  } catch (error) {
    alert('No tienes acceso a esta página. Por favor, inicia sesión.');
    window.location.href = '/login.html'; // Cambia '/login' por la ruta de tu página de inicio de sesión
  }
}

// Esperar a que el DOM esté completamente cargado antes de ejecutar la verificación
document.addEventListener('DOMContentLoaded', function () {
  verifyToken(); // Ejecutar la verificación del token al cargar la página
});
