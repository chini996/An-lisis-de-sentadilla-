# Aplicación de Análisis Bioinstrumental de la Sentadilla Bilateral

**Asignatura:** Análisis Bioinstrumental del Movimiento Humano  
**Institución:** Universidad de Chile — Carrera de Kinesiología  
**Plataforma:** Aplicación Web Cliente (HTML5 / CSS3 / JavaScript)  
**Publicación:** Compatible con GitHub Pages  

---

## 1. Nombre del Proyecto
**Análisis Bioinstrumental de la Sentadilla Bilateral mediante Estimación de Pose 2D**.

## 2. Problemática
La evaluación kinésica de la sentadilla mediante inspección visual directa presenta alta variabilidad inter e intraobservador. La instrumentación clásica (sistemas optoelectrónicos 3D con marcadores) requiere laboratorios especializados y altos costos. Se requiere una herramienta objetiva, accesible y libre de simulación para cuantificar parámetros cinemáticos directamente desde archivos de video.

## 3. Objetivo
Desarrollar una aplicación web funcional e interactiva que procese videos reales de perfil (plano sagital) y de frente (plano frontal) para cuantificar la flexión de rodilla y el índice de separación rodillas/tobillos durante una sentadilla bilateral, generando métricas y gráficos sin datos simulados ni juicios de diagnóstico clínico.

## 4. Gesto Motor Evaluado
Sentadilla Bilateral (fases excéntrica/descenso, punto de máxima profundidad y fase concéntrica/ascenso).

## 5. Variables Cuantitativas
- **Vista Lateral:** Flexión de rodilla en grados (°), tiempo de máxima flexión (s) y curva continua temporal.
- **Vista Frontal:** Índice de separación rodillas/tobillos (adimensional), índice inicial, índice mínimo alcanzado y curva evolutiva temporal.

## 6. Fuente de Datos
Videos en formatos estándar (MP4, WebM, MOV) cargados directamente por el usuario. No se utilizan datos ficticios ni valores por defecto.

## 7. MediaPipe Pose
Se utiliza la librería ejecutable en navegador `@mediapipe/pose` que aplica redes neuronales convolucionales para inferir 33 puntos de referencia anatómicos (landmarks) en coordenadas $(x, y, z)$ normalizadas.

## 8. Landmarks Utilizados
- **Vista Lateral:** Cadera (11 o 12), Rodilla (13 o 14), Tobillo (15 o 16).
- **Vista Frontal:** Rodilla Derecha (14), Rodilla Izquierda (13), Tobillo Derecho (16), Tobillo Izquierdo (15).

## 9. Cálculo de Flexión de Rodilla (Plano Sagital)
Se obtienen las coordenadas en píxeles reales ($x \cdot \text{ancho}, y \cdot \text{alto}$). Se construyen dos vectores con vértice en la rodilla:
$$\vec{V}_1 = \text{Cadera} - \text{Rodilla}$$
$$\vec{V}_2 = \text{Tobillo} - \text{Rodilla}$$

Se calcula el ángulo geométrico interno $\theta$ mediante el producto escalar:
$$\cos(\theta) = \frac{\vec{V}_1 \cdot \vec{V}_2}{\Vert{}\vec{V}_1\Vert{} \Vert{}\vec{V}_2\Vert{}}$$
$$\theta = \arccos(\cos(\theta)) \times \left(\frac{180}{\pi}\right)$$

Para reflejar la convención kinésica (0° en extensión completa):
$$\text{Flexión de Rodilla} = 180^\circ - \theta$$

## 10. Cálculo del Índice Frontal
Se calculan las distancias horizontales en píxeles:
$$\text{Distancia Rodillas} = \vert{}x_{\text{Rodilla Izquierda}} - x_{\text{Rodilla Derecha}}\vert{}$$
$$\text{Distancia Tobillos} = \vert{}x_{\text{Tobillo Izquierdo}} - x_{\text{Tobillo Derecho}}\vert{}$$
$$\text{Índice R/T} = \frac{\text{Distancia Rodillas}}{\text{Distancia Tobillos}}$$

## 11. Procesamiento del Video
El video se muestrea secuencialmente a una tasa de 30 FPS ajustando la propiedad `currentTime` y procesando el canvas de imagen mediante `pose.send()`.

## 12. Filtro de Confianza
Cada landmark posee una métrica de visibilidad entre 0.0 y 1.0. Si alguno de los puntos críticos presenta una visibilidad inferior a $0.5$, el frame se marca como **inválido** y se descarta del análisis sin inventar o interpolar valores.

## 13. Suavizado
Se aplica un filtro de **Mediana Móvil con ventana de 3 muestras** sobre la serie de frames válidos para atenuar el ruido de alta frecuencia u oscilaciones leves de la estimación de pose, preservando las amplitudes máximas reales.

## 14. Gráficos
Construidos dinámicamente con **Chart.js**. Muestran la variable biomecánica en el eje Y frente al tiempo en segundos en el eje X, resaltando con un punto rojo el hito de máxima flexión o mínimo índice.

## 15. Dependencias
- `@mediapipe/pose` (vía CDN)
- `Chart.js` (vía CDN)

## 16. Ejecución Local
1. Descargar los 4 archivos en una misma carpeta.
2. Abrir `index.html` en Google Chrome o un navegador moderno. No requiere servidor web local (Node.js o Python son opcionales).

## 17. Publicación en GitHub Pages
1. Crear un repositorio público en GitHub.
2. Subir `index.html`, `style.css`, `script.js` y `README.md`.
3. Ir a **Settings > Pages**.
4. En "Branch", seleccionar `main` o `master` y guardar.
5. La aplicación quedará disponible en un enlace público `https://<usuario>.github.io/<repositorio>/`.

## 18. Estructura de Archivos
```text
├── index.html     # Estructura semántica HTML5 y contenedores
├── style.css      # Estilos kinésicos/clínicos, responsive y diseño card
├── script.js       # Lógica cinemática, MediaPipe, Chart.js y snapshots
└── README.md      # Documentación técnica y académica completa
