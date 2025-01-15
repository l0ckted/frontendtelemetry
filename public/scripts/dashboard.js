// Función para verificar y transformar fechas
function transformarFecha(fechaInput) {
    let fecha; // Inicializamos una variable para la fecha

    if (typeof fechaInput === 'string') {
        // Intentar convertir la cadena en una fecha
        fecha = new Date(fechaInput);
        if (isNaN(fecha.getTime())) {
            console.error('La cadena proporcionada no es una fecha válida:', fechaInput);
            return null; // Retornar null si no es válida
        }
    } else if (fechaInput instanceof Date) {
        // Si ya es un objeto Date, lo usamos directamente
        fecha = fechaInput;
    } else {
        console.error('El tipo de entrada no es ni una cadena ni un objeto Date:', fechaInput);
        return null; // Retornar null si el tipo no es válido
    }

    // Formatear la fecha al formato deseado
    const fechaFormateada = obtenerFechaFormateada(fecha);

    // Mostrar en consola la fecha antes y después de la transformación
    console.log(`Fecha original: ${fecha}`);
    console.log(`Fecha transformada: ${fechaFormateada}`);

    return fechaFormateada;
}

// Función para formatear la fecha en formato YYYY-MM-DD HH:mm:ss
function obtenerFechaFormateada(fecha) {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

// Función para cargar y mostrar datos desde localStorage (clave sessionData)
function cargarDatosDesdeSessionData() {
    // Obtener los datos de 'sessionData' desde localStorage
    const sessionDataJSON = localStorage.getItem('sessionData');
    if (!sessionDataJSON) {
        console.error('No se encontraron datos en sessionData.');
        return;
    }

    // Parsear los datos
    const sessionData = JSON.parse(sessionDataJSON);

    // Asegurarse de que existen los sensores dentro de los datos
    const sensores = sessionData.tiposSensor;
    if (!sensores || !Array.isArray(sensores)) {
        console.error('Los datos de sensores no están disponibles o no son válidos.');
        return;
    }

    // Elementos donde se mostrarán los datos
    const sensorInfoContainer = document.querySelector('.sensor-info');
    const alertsList = document.getElementById('alertsList');

    // Limpiar contenido previo
    sensorInfoContainer.innerHTML = '';
    alertsList.innerHTML = '';

    // Iterar sobre los sensores para mostrarlos
    sensores.forEach(sensor => {
        const sensorHTML = `
            <p><strong>Sensor ID:</strong> ${sensor.sensor_id}</p>
            <p><strong>Área ID:</strong> ${sensor.area_id}</p>
            <p><strong>Tipo:</strong> ${sensor.tipo_sensor}</p>
            <p><strong>Modelo:</strong> ${sensor.modelo}</p>
            <p><strong>Descripción:</strong> ${sensor.descripcion}</p>
            <p><strong>Fecha de Instalación:</strong> ${new Date(sensor.fecha_instalacion).toLocaleDateString()}</p>
            <hr>
        `;
        sensorInfoContainer.innerHTML += sensorHTML;

        // Agregar alertas ficticias (puedes adaptar según tu lógica)
        const alertHTML = `<li>Alerta del sensor ${sensor.sensor_id}: Verificar estado del ${sensor.tipo_sensor}.</li>`;
        alertsList.innerHTML += alertHTML;
    });
}

// Función para convertir una fecha ISO a objeto Date
function convertirFechaISOaDate(fechaISO) {
    return new Date(fechaISO);  // Convertimos la fecha ISO (string) a un objeto Date
}

// Función para abrir (o crear) una base de datos IndexedDB
function abrirBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('baseDeDatosHumedad', 1);  // Nombre de la base de datos y versión

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event);
            reject(event);
        };

        request.onsuccess = (event) => {
            resolve(event.target.result);  // Retorna la instancia de la base de datos
        };

        // Definir el esquema de la base de datos si no existe
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('humedad')) {
                // Crear el objeto store donde se guardarán los datos
                db.createObjectStore('humedad', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Función para almacenar los datos en IndexedDB
function almacenarDatosEnIndexedDB(storeName, sensor_id, area_id, datos) {
    return abrirBaseDeDatos().then(db => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);

            // Crear un identificador único basado en sensor_id y area_id
            const uniqueId = `sensor-${sensor_id}-area-${area_id}`;

            // Comprobar si ya existen datos con el mismo identificador
            const getRequest = store.get(uniqueId);

            getRequest.onsuccess = () => {
                if (getRequest.result) {
                    console.log(`Los datos del sensor ${sensor_id} en el área ${area_id} ya están almacenados, no se cargarán de nuevo.`);
                    resolve(); // No almacenar si ya existe
                } else {
                    // Función para formatear la fecha en formato YYYY-MM-DD HH:mm:ss
                    const formatearFecha = (fecha) => {
                        const date = new Date(fecha);
                        const año = date.getFullYear();
                        const mes = String(date.getMonth() + 1).padStart(2, '0');
                        const dia = String(date.getDate()).padStart(2, '0');
                        const hora = String(date.getHours()).padStart(2, '0');
                        const minutos = String(date.getMinutes()).padStart(2, '0');
                        const segundos = String(date.getSeconds()).padStart(2, '0');
                        
                        return `${año}-${mes}-${dia} ${hora}:${minutos}:${segundos}`;
                    };

                    // Transformar los datos antes de almacenarlos
                    const datosFormateados = datos.map(dato => {
                        return {
                            valor_humedad: parseFloat(dato.valor_humedad).toFixed(2), // Convertir a número con 2 decimales
                            valor_conductividad: parseFloat(dato.valor_conductividad).toFixed(2), // Convertir a número con 2 decimales
                            valor_temperatura_suelo: parseFloat(dato.valor_temperatura_suelo).toFixed(2), // Convertir a número con 2 decimales
                            fecha_hora: formatearFecha(dato.fecha_hora) // Formatear la fecha
                        };
                    });

                    // Añadir los datos con el identificador único
                    const datosConId = { id: uniqueId, sensor_id, area_id, datos: datosFormateados };

                    const addRequest = store.add(datosConId);

                    addRequest.onsuccess = () => {
                        console.log(`Datos almacenados correctamente en IndexedDB para sensor ${sensor_id} en área ${area_id} con ID: ${uniqueId}`);
                        resolve();
                    };

                    addRequest.onerror = (event) => {
                        console.error('Error al almacenar los datos en IndexedDB:', event);
                        reject(event);
                    };
                }
            };

            getRequest.onerror = (event) => {
                console.error('Error al verificar los datos existentes en IndexedDB:', event);
                reject(event);
            };
        });
    });
}


// Función para realizar la solicitud API de humedad y almacenar los datos en IndexedDB
async function cargarDatosDeHumedad(sensor_id, area_id, cliente_id) {
    const fechaFin = new Date();
    const fechaInicio = new Date(fechaFin);
    fechaInicio.setDate(fechaFin.getDate() - 1); // Restar 1 día para fechaInicio (ayer)

    const fechaInicioFormateada = obtenerFechaFormateada(fechaInicio);
    const fechaFinFormateada = obtenerFechaFormateada(fechaFin);

    try {
        const apiUrl = `https://api.desert-iot.cl/api/humedad-suelo/${fechaInicioFormateada}/${fechaFinFormateada}/${sensor_id}/${area_id}/${cliente_id}`;
        const response = await axios.get(apiUrl);

        // Filtrar y transformar datos para eliminar aquellos con valores '0.00'
        const datosValidos = response.data
            .map(dato => {
                if (dato.fecha_data) {
                    dato.fecha_data = transformarFecha(dato.fecha_data); // Transformar la fecha
                }
                return dato;
            })
            .filter(dato =>
                parseFloat(dato.valor_humedad) !== 0 &&
                parseFloat(dato.valor_conductividad) !== 0 &&
                parseFloat(dato.valor_temperatura_suelo) !== 0
            );

        if (datosValidos.length > 0) {
            // Solo almacenar datos válidos si existen
            await almacenarDatosEnIndexedDB('humedad', sensor_id, area_id, datosValidos);
            console.log('Datos válidos almacenados:', datosValidos);
        } else {
            console.log('No hay datos válidos para almacenar.');
        }
    } catch (error) {
        console.error('Error al obtener datos de humedad del suelo:', error);
    }
}




// Función para actualizar la base de datos con los datos más recientes
// Función para borrar los objetos en IndexedDB con el patrón 'sensor-{n}-area-{n}'
async function borrarDatosDeIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('baseDeDatosHumedad', 1); // Cambia 'baseDeDatosHumedad' con el nombre real de tu base de datos

        request.onsuccess = function(event) {
            const db = event.target.result;
            const transaction = db.transaction(['humedad'], 'readwrite'); // 'humedad' es el objeto donde almacenamos los datos
            const objectStore = transaction.objectStore('humedad');

            const cursorRequest = objectStore.openCursor();

            cursorRequest.onsuccess = function(event) {
                const cursor = event.target.result;

                if (cursor) {
                    const key = cursor.key;

                    // Verificar si la clave sigue el patrón 'sensor-{n}-area-{n}'
                    const regex = /^sensor-\d+-area-\d+$/;
                    if (regex.test(key)) {
                        objectStore.delete(key); // Borrar el objeto con esta clave
                        console.log(`Se ha borrado el objeto con la clave: ${key}`);
                    }

                    cursor.continue(); // Continuar con el siguiente objeto
                } else {
                    console.log('Todos los datos han sido revisados y eliminados si es necesario.');
                    resolve(); // Finalizar la promesa cuando se han revisado todos los objetos
                }
            };

            cursorRequest.onerror = function(event) {
                console.error('Error al acceder a la base de datos:', event.target.error);
                reject(event.target.error);
            };
        };

        request.onerror = function(event) {
            console.error('Error al abrir la base de datos:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Función para actualizar la base de datos
async function actualizarBaseDeDatos() {
    try {
        // Llamar a la función para borrar los datos previos
        await borrarDatosDeIndexedDB();

        // Obtener los datos de 'sessionData' desde localStorage
        const sessionData = JSON.parse(localStorage.getItem('sessionData'));

        // Asegurarnos de que los datos de sesión y los sensores están disponibles
        if (sessionData && sessionData.tiposSensor) {
            // Buscar el sensor con el modelo 'humedadsuelo'
            const sensor = sessionData.tiposSensor.find(s => s.modelo === 'humedadsuelo');

            if (sensor) {
                // Extraer los valores de sensor_id, area_id y cliente_id
                const sensor_id = sensor.sensor_id;
                const area_id = sensor.area_id;
                const cliente_id = sensor.cliente_id;

                // Llamar a la función cargarDatosDeHumedad con los valores extraídos
                await cargarDatosDeHumedad(sensor_id, area_id, cliente_id); // Cargar los datos de humedad

                alert('Base de datos actualizada con éxito');
            } else {
                console.error('No se encontró el sensor con el modelo "humedadsuelo".');
            }
        } else {
            console.error('No se encontraron datos válidos en sessionData.');
        }

        // Recargar la página al finalizar
        location.reload();
    } catch (error) {
        console.error('Error durante la actualización de la base de datos:', error);
    }
}


// Ejecutar la función al cargar la página
// Función que se ejecuta al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    // Cargar los datos desde sessionData (localStorage)
    cargarDatosDesdeSessionData(); 
    
    // Obtener los datos de sessionData
    const sessionData = JSON.parse(localStorage.getItem('sessionData'));
    
    // Asegurarnos de que sessionData y los sensores están disponibles
    if (sessionData && sessionData.tiposSensor) {
        // Buscar el sensor con el modelo 'humedadsuelo'
        const sensor = sessionData.tiposSensor.find(s => s.modelo === 'humedadsuelo');
        
        if (sensor) {
            // Extraer los valores de sensor_id, area_id y cliente_id
            const sensor_id = sensor.sensor_id;
            const area_id = sensor.area_id;
            const cliente_id = sensor.cliente_id;
            
            // Llamar a la función cargarDatosDeHumedad con los valores extraídos
            cargarDatosDeHumedad(sensor_id, area_id, cliente_id);  // Cargar los datos de humedad
        } else {
            console.error('No se encontró el sensor con el modelo "humedadsuelo".');
        }
    } else {
        console.error('No se encontraron datos válidos en sessionData.');
    }
}); 


// Añadir el evento al botón para que al hacer clic actualice la base de datos
document.getElementById('actualizarDatosButton').addEventListener('click', actualizarBaseDeDatos);