// Función para formatear la fecha a un formato estándar
function obtenerFechaFormateada(fecha) {
    const año = fecha.getFullYear();
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
    const dia = fecha.getDate().toString().padStart(2, '0');
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    return `${año}-${mes}-${dia} ${horas}:${minutos}:${segundos}`;
}

// Función para poblar las opciones del combobox
function poblarOpcionesSensores(sessionData) {
    const sensorSelect = document.getElementById("sensorSelect");
    sensorSelect.innerHTML = "";

    if (!sessionData || !sessionData.tiposSensor || sessionData.tiposSensor.length === 0) {
        console.error("No hay datos disponibles para llenar los sensores.");
        return;
    }

    sessionData.tiposSensor.forEach((sensor) => {
        const option = document.createElement("option");
        option.value = `${sensor.sensor_id}_${sensor.area_id}_${sensor.cliente_id}`;
        option.textContent = `${sensor.descripcion} (ID: ${sensor.sensor_id})`;
        sensorSelect.appendChild(option);
    });
}

// Función para cargar datos desde la API
async function cargarDatosDeHumedad(sensor_id, area_id, cliente_id, fechaInicio, fechaFin) {
    try {
        if (isNaN(new Date(fechaInicio).getTime()) || isNaN(new Date(fechaFin).getTime())) {
            throw new Error("Fechas inválidas proporcionadas.");
        }

        const apiUrl = `http://localhost:3000/api/humedad-suelo/${fechaInicio}/${fechaFin}/${sensor_id}/${area_id}/${cliente_id}`;
        const response = await axios.get(apiUrl);

        const datosConFechasFormateadas = response.data.map((dato) => {
            if (dato.fecha_hora) {
                dato.fecha_hora = obtenerFechaFormateada(new Date(dato.fecha_hora));
            }
            return dato;
        });

        await almacenarDatosEnIndexedDB("humedad", sensor_id, area_id, datosConFechasFormateadas);

        console.log("Datos almacenados en IndexedDB:", datosConFechasFormateadas);
    } catch (error) {
        console.error("Error al obtener o almacenar datos de humedad del suelo:", error);
    }
}

// Función para almacenar datos en IndexedDB
async function almacenarDatosEnIndexedDB(storeName, sensor_id, area_id, datos) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BaseDeDatosHumedad', 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                const objectStore = db.createObjectStore(storeName, { keyPath: 'id' });
                objectStore.createIndex('sensor_id_area_id', ['sensor_id', 'area_id'], { unique: false });
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(storeName, 'readwrite');
            const store = transaction.objectStore(storeName);

            // Nueva clave simplificada
            const key = 'humedadesuelo';  // Usamos una clave estática para los datos de humedad del suelo

            const entry = {
                id: key,  // Usamos la clave 'humedaddesuelo'
                sensor_id,
                area_id,
                datos_humedad: datos,  // Guardamos todos los datos bajo una sola propiedad
            };

            store.put(entry);  // Guardar los datos en el store

            transaction.oncomplete = () => resolve('Datos almacenados con éxito en IndexedDB');
            transaction.onerror = (error) => reject(`Error al almacenar datos: ${error.target.error}`);
        };

        request.onerror = (event) => reject(`Error al abrir IndexedDB: ${event.target.error}`);
    });
}


// Función para analizar datos
async function analizarDatos() {
    const startDateElement = document.getElementById("startDate");
    const endDateElement = document.getElementById("endDate");
    const sensorSelect = document.getElementById("sensorSelect");
    const errorMensaje = document.getElementById("errorMensaje");

    errorMensaje.textContent = ""; // Limpiar mensajes de error

    if (!startDateElement || !endDateElement) {
        errorMensaje.textContent = "Los elementos de fecha no están presentes en el DOM.";
        return;
    }

    const startDate = startDateElement.value;
    const endDate = endDateElement.value;

    if (!startDate || !endDate) {
        errorMensaje.textContent = "Seleccione una fecha de inicio y una fecha de fin.";
        return;
    }

    const selectedSensors = Array.from(sensorSelect.selectedOptions);
    if (selectedSensors.length === 0) {
        errorMensaje.textContent = "Seleccione al menos un sensor.";
        return;
    }

    try {
        const startDateFormatted = obtenerFechaFormateada(new Date(startDate));
        const endDateFormatted = obtenerFechaFormateada(new Date(endDate));

        console.log("Fecha de inicio formateada:", startDateFormatted);
        console.log("Fecha de fin formateada:", endDateFormatted);

        // Iterar sobre cada sensor seleccionado y procesar los datos
        selectedSensors.forEach(sensor => {
            const [sensor_id, area_id, cliente_id] = sensor.value.split("_");
            console.log("Analizando datos para:", { sensor_id, area_id, cliente_id, startDate, endDate });

            // Llamar a la función de análisis o API
            cargarDatosDeHumedad(sensor_id, area_id, cliente_id, startDateFormatted, endDateFormatted);
        });
    } catch (error) {
        errorMensaje.textContent = "Error al analizar los datos. Revise las fechas seleccionadas.";
        console.error("Error al analizar los datos:", error);
    }
}

// Inicializar la aplicación
document.addEventListener("DOMContentLoaded", () => {
    // Cargar sessionData desde localStorage
    const sessionData = JSON.parse(localStorage.getItem('sessionData'));

    if (!sessionData || !sessionData.tiposSensor || sessionData.tiposSensor.length === 0) {
        console.error("sessionData no está disponible o no contiene datos de sensores.");
        return;
    }

    // Llenar el select de sensores con los datos reales
    poblarOpcionesSensores(sessionData);

    // Obtener referencia al botón y asignar el evento
    const analyzeDataButton = document.getElementById("analyzeDataButton");
    if (analyzeDataButton) {
        analyzeDataButton.addEventListener("click", analizarDatos);
    } else {
        console.error("El botón con id 'analyzeDataButton' no existe en el DOM.");
    }
});
