// Función para eliminar todas las cookies
function deleteAllCookies() {
    const cookies = document.cookie.split(';'); // Obtener todas las cookies
    cookies.forEach(function(cookie) {
      const cookieName = cookie.split('=')[0].trim();
      document.cookie = `${cookieName}=; max-age=0; path=/`; // Eliminar cada cookie
      console.log(`Cookie '${cookieName}' eliminada.`);
    });
  }
  
  // Función para eliminar localStorage
  function deleteLocalStorage() {
    localStorage.clear();
  }
  
  // Función para eliminar todos los datos de IndexedDB
  // Función para eliminar todas las bases de datos en IndexedDB
function deleteAllIndexedDB() {
    // Obtener todas las bases de datos existentes
    const request = indexedDB.databases();
  
    request.then(databases => {
      // Iterar sobre cada base de datos y eliminarla
      databases.forEach(db => {
        const deleteRequest = indexedDB.deleteDatabase(db.name);
        deleteRequest.onsuccess = function() {
          console.log(`Base de datos "${db.name}" eliminada exitosamente.`);
        };
        deleteRequest.onerror = function() {
          console.error(`Error al eliminar la base de datos "${db.name}".`);
        };
      });
    }).catch(error => {
      console.error("Error al obtener las bases de datos:", error);
    });
  }
  
  // Llamar a la función para eliminar todas las bases de datos
  deleteAllIndexedDB();
  
  
  // Función para realizar logout
  function logout() {
    // Eliminar cookies, localStorage e IndexedDB
    deleteAllCookies();
    deleteLocalStorage();
    deleteAllIndexedDB();
  
    // Redirigir al login (o página que desees)
    window.location.href = '/login.html'; // Cambia esto por la ruta de tu página de login
  }
  
  // Asociar la función logout al enlace de cerrar sesión
  const logoutLink = document.querySelector('.logout');
  if (logoutLink) {
    logoutLink.addEventListener('click', function(event) {
      event.preventDefault(); // Evitar la acción predeterminada del enlace
      logout(); // Llamar a la función logout
    });
  }
  