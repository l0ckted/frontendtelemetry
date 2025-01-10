// Función para abrir la base de datos
async function abrirBaseDeDatos() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('baseDeDatosHumedad', 1);

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
                db.createObjectStore('humedad', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

// Función para cargar datos desde IndexedDB y graficarlos
async function cargarDatosDesdeIndexedDB() {
    try {
        const db = await abrirBaseDeDatos();
        const transaction = db.transaction(['humedad'], 'readonly');
        const store = transaction.objectStore('humedad');

        const getAllRequest = store.getAll();

        const resultados = await new Promise((resolve, reject) => {
            getAllRequest.onsuccess = () => resolve(getAllRequest.result);
            getAllRequest.onerror = () => reject('Error al obtener los datos de IndexedDB.');
        });

        console.log('Resultados obtenidos de IndexedDB:', resultados);

        if (resultados.length > 0) {
            // Agrupar datos por sensor_id y area_id
            const agrupados = agruparPorSensorYArea(resultados);

            // Convertir los grupos a un array para facilitar el manejo de los datos
            const agrupadosArray = Object.values(agrupados);

            // Generar gráficos dinámicamente para cada grupo
            agrupadosArray.forEach(grupo => {
                // Suponiendo que el primer elemento del grupo tiene el sensor_id y area_id
                const { sensor_id, area_id, datos } = grupo[0]; 
                generarGraficos(datos, sensor_id, area_id);
            });
        } else {
            throw new Error('No se encontraron datos almacenados en IndexedDB.');
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
    const contenedor = document.createElement('div');
    contenedor.id = 'graficosContainer';
    document.body.appendChild(contenedor);

    try {
        cargarDatosDesdeIndexedDB()
            .then(() => console.log('Datos cargados y gráficos generados exitosamente.'))
            .catch(error => console.error('Error al cargar los datos desde IndexedDB:', error));
    } catch (error) {
        console.error('Error inesperado al inicializar la carga de datos:', error);
    }
});
