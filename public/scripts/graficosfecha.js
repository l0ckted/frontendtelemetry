// Función para abrir la base de datos
async function abrirBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('BaseDeDatosHumedad', 1); // Asegurarse de que el nombre sea exacto

        request.onerror = (event) => {
            console.error('Error al abrir la base de datos:', event);
            reject(event);
        };

        request.onsuccess = (event) => {
            console.log('Base de datos abierta correctamente.');
            resolve(event.target.result);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('humedad')) {
                db.createObjectStore('humedad', { keyPath: 'id' }); // Usar 'id' como keyPath
            }
        };
    });
}

// Función para cargar datos desde IndexedDB y graficarlos
async function cargarDatosDesdeIndexedDB() {
    console.log('Iniciando la función cargarDatosDesdeIndexedDB...');

    try {
        // Abrir la base de datos
        console.log('Intentando abrir la base de datos...');
        const db = await abrirBaseDeDatos();
        console.log('Base de datos abierta con éxito.');

        // Iniciar transacción para el objectStore "humedad"
        console.log('Iniciando transacción para el objectStore "humedad"...');
        const transaction = db.transaction(['humedad'], 'readonly');
        const store = transaction.objectStore('humedad');

        // Definir la clave principal
        const clavePrincipal = 'humedadesuelo';  // ID de la clave primaria
        console.log('Clave principal generada:', clavePrincipal);

        // Realizar solicitud get utilizando la clave primaria
        console.log('Realizando solicitud get para obtener datos con la clave principal...');
        const getRequest = store.get(clavePrincipal);

        // Promesa para manejar el éxito/error de la solicitud
        const resultado = await new Promise((resolve, reject) => {
            getRequest.onsuccess = () => {
                console.log('Solicitud get exitosa.');
                resolve(getRequest.result);
            };
            getRequest.onerror = () => {
                console.error('Error al realizar la solicitud get.');
                reject('Error al obtener los datos de IndexedDB.');
            };
        });

        console.log('Resultado obtenido de IndexedDB:', resultado);

        // Comprobar si se obtuvo el resultado esperado
        if (resultado) {
            const { datos_humedad } = resultado; // Extraer los datos de humedad
            if (Array.isArray(datos_humedad)) {
                console.log('Datos de humedad extraídos:', datos_humedad);
                // Llamar a la función para graficar el array de datos de humedad
                generarGraficos(datos_humedad);
            } else {
                console.warn('No se encontraron datos de humedad válidos.');
                throw new Error('No se encontraron datos de humedad válidos.');
            }
        } else {
            console.warn('No se encontraron datos para la clave principal solicitada.');
            throw new Error('No se encontraron datos para la clave principal solicitada.');
        }
    } catch (error) {
        console.error('Error al cargar los datos:', error);
    }
}


// Función para agrupar datos por sensor_id y area_id
function agruparPorSensorYArea(datos) {
    return datos.reduce((grupos, dato) => {
        const clave = `${dato.sensor_id}-${dato.area_id}`;
        if (!grupos[clave]) {
            grupos[clave] = [];
        }
        grupos[clave].push(dato);
        return grupos;
    }, {});
}

function generarGraficos(datos, sensor_id, area_id) {
    const fechas = datos.map(dato => dato.fecha_hora);
    const humedad = datos.map(dato => parseFloat(dato.valor_humedad));
    const conductividad = datos.map(dato => parseFloat(dato.valor_conductividad));
    const temperatura = datos.map(dato => parseFloat(dato.valor_temperatura_suelo));

    const container = document.getElementById('graficosContainer');
    if (!container) {
        console.error('No se encontró el contenedor para los gráficos.');
        return;
    }

    const subContainer = document.createElement('div');
    subContainer.className = 'grafico-grupo';
    subContainer.innerHTML = `<h3>Sensor ${sensor_id} - Área ${area_id}</h3>`;
    container.appendChild(subContainer);

    // Crear gráficos
    crearGrafico(subContainer, `graficoHumedad-${sensor_id}-${area_id}`, 'Humedad (%)', fechas, humedad, 'blue', 'Humedad del Suelo');
    crearGrafico(subContainer, `graficoTemperatura-${sensor_id}-${area_id}`, 'Temperatura (°C)', fechas, temperatura, 'red', 'Temperatura del Suelo');
    crearGrafico(subContainer, `graficoConductividad-${sensor_id}-${area_id}`, 'Conductividad (μS/cm)', fechas, conductividad, 'green', 'Conductividad del Suelo');
}

// Función para crear el gráfico con opción de escalamiento manual del eje Y
function crearGrafico(container, id, label, labels, data, color, title) {
    const canvas = document.createElement('canvas');
    canvas.id = id;
    container.appendChild(canvas);

    const chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: label,
                data: data,
                borderColor: color,
                fill: false
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: title
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true },          // Habilita zoom con rueda del ratón
                        pinch: { enabled: true },          // Habilita zoom con gesto de pellizco
                        mode: 'x'                          // Permite el zoom solo en el eje X
                    },
                    pan: {
                        enabled: true,                    // Habilita el desplazamiento
                        mode: 'x',                         // Desplazamiento solo en el eje X
                        threshold: 10,                     // Sensibilidad del arrastre
                        onPanComplete: ({ chart }) => ajustarEscala(chart) // Actualiza la escala después del pan
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Fecha y Hora'
                    }
                },
                y: { 
                    title: { 
                        display: true, 
                        text: label 
                    },
                    suggestedMin: Math.min(...data),  // Configura el valor mínimo sugerido
                    suggestedMax: Math.max(...data)   // Configura el valor máximo sugerido
                }
            },
            onClick: (event) => {
                const points = chart.getElementsAtEventForMode(event, 'nearest', { intersect: true }, true);

                if (points.length > 0) {
                    const point = points[0];
                    const index = point.index; // Índice del punto seleccionado
                    const xValue = chart.data.labels[index];  // Valor en el eje X donde se hizo clic

                    // Configurar el zoom en el punto seleccionado
                    const zoomOptions = {
                        x: { min: xValue - 1, max: xValue + 1 }, // Ajustar el rango del zoom en el eje X alrededor del punto
                        y: { min: Math.min(...data), max: Math.max(...data) }  // Ajustar el rango del zoom en el eje Y
                    };

                    // Aplicar zoom en la zona seleccionada
                    chart.zoom(zoomOptions);
                }
            }
        }
    });

    agregarBotonesNavegacion(container, chart);  // Agrega los botones de navegación

    // Crear controles para escalar el eje Y
    crearControlesEscalamiento(container, chart, data);
}
// Función para crear los controles de escalamiento en el eje Y
function crearControlesEscalamiento(container, chart, data) {
    const controlContainer = document.createElement('div');
    controlContainer.className = 'controles-escalamiento';

    controlContainer.innerHTML = `
        <h4>Escalar Eje Y</h4>
        <label for="minY-${chart.id}">Mínimo:</label>
        <input type="number" id="minY-${chart.id}" value="${Math.min(...data)}" step="any" />
        <label for="maxY-${chart.id}">Máximo:</label>
        <input type="number" id="maxY-${chart.id}" value="${Math.max(...data)}" step="any" />
        <div class="botones-container">
            <button id="restablecerY-${chart.id}">Restablecer</button>
            <button id="aplicarEscala-${chart.id}">Aplicar Escala</button>
        </div>
    `;

    container.appendChild(controlContainer);

    const minInput = document.getElementById(`minY-${chart.id}`);
    const maxInput = document.getElementById(`maxY-${chart.id}`);
    const resetButton = document.getElementById(`restablecerY-${chart.id}`);
    const applyButton = document.getElementById(`aplicarEscala-${chart.id}`);

    // Función para aplicar los nuevos valores del rango Y
    const aplicarEscalamiento = () => {
        const minY = parseFloat(minInput.value);
        const maxY = parseFloat(maxInput.value);

        if (!isNaN(minY) && !isNaN(maxY)) {
            chart.options.scales.y.suggestedMin = minY;
            chart.options.scales.y.suggestedMax = maxY;
            chart.update();
        }
    };

    // Evento para aplicar el escalamiento
    minInput.addEventListener('change', aplicarEscalamiento);
    maxInput.addEventListener('change', aplicarEscalamiento);

    // Evento para restablecer el rango a los valores predeterminados
    resetButton.addEventListener('click', () => {
        chart.options.scales.y.suggestedMin = Math.min(...data);
        chart.options.scales.y.suggestedMax = Math.max(...data);
        minInput.value = Math.min(...data);
        maxInput.value = Math.max(...data);
        chart.update();
    });

    // Evento para aplicar la escala
    applyButton.addEventListener('click', aplicarEscalamiento);
}

// Función para ajustar la escala del gráfico después de un pan o zoom
function ajustarEscala(chart) {
    const visibleData = chart.scales.x._getMatchingVisibleData();
    const valoresVisibles = visibleData.map(dp => dp.raw);

    const minValor = Math.min(...valoresVisibles);
    const maxValor = Math.max(...valoresVisibles);

    chart.options.scales.y.suggestedMin = minValor;
    chart.options.scales.y.suggestedMax = maxValor;
    chart.options.plugins.annotation.annotations.line.yMin = (minValor + maxValor) / 2;
    chart.options.plugins.annotation.annotations.line.yMax = (minValor + maxValor) / 2;
    chart.update();  // Actualiza el gráfico con los nuevos valores
}

// Función para mover el gráfico hacia la izquierda o derecha
function moverTiempo(chart, pasos) {
    const panOptions = {
        x: pasos, // Cantidad de puntos a desplazar en el eje X
        mode: 'x'  // Desplazamiento en el eje X
    };

    // Desplazar el gráfico usando el plugin de zoom/pan
    chart.pan(panOptions);
}

// Función para agregar botones de navegación (desplazar izquierda/derecha)
function agregarBotonesNavegacion(container, chart) {
    const navContainer = document.createElement('div');
    navContainer.className = 'botones-navegacion';
    navContainer.innerHTML = `
       <button id="moverIzquierda-${chart.id}">⟵</button>  <!-- Cambiado a ⟶ para que esté a la derecha -->
      <button id="moverDerecha-${chart.id}">⟶</button>  <!-- Cambiado a ⟵ para que esté a la izquierda -->
    `;
    container.appendChild(navContainer);

    const moverIzquierda = document.getElementById(`moverIzquierda-${chart.id}`);
    const moverDerecha = document.getElementById(`moverDerecha-${chart.id}`);

    // Asociar los eventos de clic a los botones
    moverIzquierda.addEventListener('click', () => moverTiempo(chart, 100));  // 50 para desplazar hacia la derecha
    moverDerecha.addEventListener('click', () => moverTiempo(chart, -100));   // -50 para desplazar hacia la izquierda
}

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    // Seleccionar el botón
    const analyzeButton = document.getElementById('analyzeDataButton');

    // Agregar evento click al botón
    analyzeButton.addEventListener('click', () => {
        // Seleccionar el contenedor existente para los gráficos
        const graficosContainer = document.getElementById('graficosContainer');
        const loadingMessage = document.getElementById('loadingMessage'); // Mensaje de carga

        if (!graficosContainer) {
            console.error('El contenedor para gráficos (#graficosContainer) no existe.');
            return;
        }

        if (!loadingMessage) {
            console.error('El contenedor para el mensaje de carga (#loadingMessage) no existe.');
            return;
        }

        // Mostrar mensaje de carga
        loadingMessage.textContent = 'Cargando base de datos, por favor espere...';

        // Establecer un límite de tiempo de 15 segundos
        const timeout = 15000;
        let timeoutReached = false;

        // Función para esperar la carga de la base de datos o alcanzar el tiempo límite
        const loadDataWithTimeout = async () => {
            try {
                const loadDataPromise = cargarDatosDesdeIndexedDB(); // Asumimos que esta función devuelve una promesa

                const timeoutPromise = new Promise((resolve, reject) => {
                    setTimeout(() => {
                        timeoutReached = true;
                        reject('Tiempo de espera agotado');
                    }, timeout);
                });

                // Espera a que se complete la carga de datos o el tiempo se agote
                await Promise.race([loadDataPromise, timeoutPromise]);

                if (!timeoutReached) {
                    loadingMessage.textContent = 'Datos cargados y gráficos generados exitosamente.';
                }
            } catch (error) {
                if (timeoutReached) {
                    loadingMessage.textContent = 'La carga de la base de datos ha excedido el tiempo de espera.';
                } else {
                    console.error('Error al cargar los datos desde IndexedDB:', error);
                    loadingMessage.textContent = 'Error al cargar los datos. Intente nuevamente.';
                }
            }
        };

        loadDataWithTimeout();
    });
});

// Esperar a que el DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    const analyzeButton = document.getElementById('graficardata');
    const graficosContainer = document.getElementById('graficosContainer');
    const loadingMessage = document.getElementById('loadingMessage');

    // Verificar que el contenedor de carga exista
    if (!loadingMessage) {
        console.error('El contenedor para el mensaje de carga (#loadingMessage) no existe.');
        return; // Detener el script si no se encuentra el contenedor de carga
    }

    analyzeButton.addEventListener('click', () => {
        loadingMessage.style.display = 'block'; // Mostrar mensaje de carga
        graficosContainer.innerHTML = ''; // Limpiar contenedor de gráficos previo

        let dataLoaded = false;

        // Intentar cargar los datos desde IndexedDB
        cargarDatosDesdeIndexedDB()
            .then(() => {
                dataLoaded = true;
                console.log('Datos cargados exitosamente.');
            })
            .catch(error => {
                console.error('Error al cargar los datos desde IndexedDB:', error);
            });

        // Esperar hasta 15 segundos si los datos se cargan o no
        setTimeout(() => {
            if (!dataLoaded) {
                loadingMessage.textContent = 'No se pudo cargar los datos en el tiempo esperado.';
            }
            loadingMessage.style.display = 'none'; // Ocultar mensaje de carga después de 15 segundos
        }, 15000); // 15 segundos
    });
});

function eliminarBaseDeDatos() {
    const request = indexedDB.deleteDatabase('BaseDeDatosHumedad'); // Nombre de la base de datos a eliminar

    request.onsuccess = () => {
        console.log('Base de datos eliminada con éxito');
    };

    request.onerror = (event) => {
        console.error('Error al eliminar la base de datos', event);
    };

    request.onblocked = () => {
        console.warn('La base de datos está bloqueada y no se puede eliminar en este momento');
    };
}

// Asociar el evento de clic al botón
document.getElementById('eliminarDBBtn').addEventListener('click', eliminarBaseDeDatos);