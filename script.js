/**
 * Análisis Bioinstrumental del Movimiento Humano - Sentadilla Bilateral
 * Universidad de Chile - Carrera de Kinesiología
 * Procesamiento real con MediaPipe Pose y Chart.js
 */

document.addEventListener("DOMContentLoaded", () => {
    // === ELEMENTOS VISTA LATERAL ===
    const inputVideoLateral = document.getElementById("inputVideoLateral");
    const fileNameLateral = document.getElementById("fileNameLateral");
    const videoLateral = document.getElementById("videoLateral");
    const canvasLateralOverlay = document.getElementById("canvasLateralOverlay");
    const btnAnalyzeLateral = document.getElementById("btnAnalyzeLateral");
    const selectSide = document.getElementById("selectSide");

    const progressLateralContainer = document.getElementById("progressLateralContainer");
    const progressBarLateral = document.getElementById("progressBarLateral");
    const statusLateral = document.getElementById("statusLateral");

    const valMaxFlexion = document.getElementById("valMaxFlexion");
    const valTimeMaxFlexion = document.getElementById("valTimeMaxFlexion");
    const valDurationLateral = document.getElementById("valDurationLateral");
    const valValidFramesLateral = document.getElementById("valValidFramesLateral");
    const canvasLateralSnapshot = document.getElementById("canvasLateralSnapshot");
    const snapshotLateralCaption = document.getElementById("snapshotLateralCaption");

    // === ELEMENTOS VISTA FRONTAL ===
    const inputVideoFrontal = document.getElementById("inputVideoFrontal");
    const fileNameFrontal = document.getElementById("fileNameFrontal");
    const videoFrontal = document.getElementById("videoFrontal");
    const canvasFrontalOverlay = document.getElementById("canvasFrontalOverlay");
    const btnAnalyzeFrontal = document.getElementById("btnAnalyzeFrontal");

    const progressFrontalContainer = document.getElementById("progressFrontalContainer");
    const progressBarFrontal = document.getElementById("progressBarFrontal");
    const statusFrontal = document.getElementById("statusFrontal");

    const valMinIndex = document.getElementById("valMinIndex");
    const valTimeMinIndex = document.getElementById("valTimeMinIndex");
    const valInitialIndex = document.getElementById("valInitialIndex");
    const valValidFramesFrontal = document.getElementById("valValidFramesFrontal");
    const canvasFrontalSnapshot = document.getElementById("canvasFrontalSnapshot");
    const snapshotFrontalCaption = document.getElementById("snapshotFrontalCaption");

    // === GENERAL Y TEXTOS ===
    const btnResetAll = document.getElementById("btnResetAll");
    const interpretationTextLateral = document.getElementById("interpretationTextLateral");
    const interpretationTextFrontal = document.getElementById("interpretationTextFrontal");

    // === INSTANCIAS GRÁFICOS ===
    let chartLateralInstance = null;
    let chartFrontalInstance = null;

    // === CONFIGURACIÓN MEDIAPIPE POSE ===
    const pose = new Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
    });

    pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    // Constante de umbral de confianza de landmarks
    const MIN_VISIBILITY_THRESHOLD = 0.5;

    // === MANEJO DE ARCHIVOS Y REPRODUCCIÓN ===
    inputVideoLateral.addEventListener("change", (e) => handleFileSelect(e, videoLateral, fileNameLateral, btnAnalyzeLateral));
    inputVideoFrontal.addEventListener("change", (e) => handleFileSelect(e, videoFrontal, fileNameFrontal, btnAnalyzeFrontal));

    function handleFileSelect(event, videoElem, labelElem, btnElem) {
        const file = event.target.files[0];
        if (file) {
            labelElem.textContent = file.name;
            const fileURL = URL.createObjectURL(file);
            videoElem.src = fileURL;
            videoElem.load();
            btnElem.disabled = false;
        }
    }

    btnResetAll.addEventListener("click", () => {
        location.reload();
    });

    // ==========================================
    // ANÁLISIS VISTA LATERAL (PLANO SAGITAL)
    // ==========================================
    btnAnalyzeLateral.addEventListener("click", async () => {
        if (!videoLateral.src) return;

        btnAnalyzeLateral.disabled = true;
        progressLateralContainer.classList.remove("hidden");
        updateProgress(statusLateral, progressBarLateral, 0, "Iniciando análisis lateral...");

        const width = videoLateral.videoWidth;
        const height = videoLateral.videoHeight;
        canvasLateralOverlay.width = width;
        canvasLateralOverlay.height = height;

        const duration = videoLateral.duration;
        const fps = 30; // Muestreo estándar
        const totalFrames = Math.floor(duration * fps);
        const frameInterval = 1 / fps;

        let rawResults = [];
        let validFramesCount = 0;

        // Evaluación de lado si es automático
        const chosenSide = selectSide.value; // "auto", "right", "left"

        for (let i = 0; i < totalFrames; i++) {
            const currentTime = i * frameInterval;
            videoLateral.currentTime = currentTime;

            await new Promise((resolve) => {
                videoLateral.onseeked = resolve;
            });

            const poseResults = await processFrameWithPose(videoLateral);

            const pct = Math.round(((i + 1) / totalFrames) * 100);
            updateProgress(statusLateral, progressBarLateral, pct, `Procesando frame ${i + 1} de ${totalFrames}...`);

            if (poseResults && poseResults.poseLandmarks) {
                const landmarks = poseResults.poseLandmarks;

                // Determinar lado activo
                let sideToUse = chosenSide;
                if (chosenSide === "auto") {
                    const rightConf = (landmarks[12].visibility + landmarks[14].visibility + landmarks[16].visibility) / 3;
                    const leftConf = (landmarks[11].visibility + landmarks[13].visibility + landmarks[15].visibility) / 3;
                    sideToUse = rightConf >= leftConf ? "right" : "left";
                }

                const hipIdx = sideToUse === "right" ? 12 : 11;
                const kneeIdx = sideToUse === "right" ? 14 : 13;
                const ankleIdx = sideToUse === "right" ? 16 : 15;

                const hip = landmarks[hipIdx];
                const knee = landmarks[kneeIdx];
                const ankle = landmarks[ankleIdx];

                // Verificar filtro de confianza
                if (hip.visibility >= MIN_VISIBILITY_THRESHOLD &&
                    knee.visibility >= MIN_VISIBILITY_THRESHOLD &&
                    ankle.visibility >= MIN_VISIBILITY_THRESHOLD) {

                    // Coordenadas en píxeles reales
                    const hipPx = { x: hip.x * width, y: hip.y * height };
                    const kneePx = { x: knee.x * width, y: knee.y * height };
                    const anklePx = { x: ankle.x * width, y: ankle.y * height };

                    // Vectores desde la rodilla
                    const v1 = { x: hipPx.x - kneePx.x, y: hipPx.y - kneePx.y };
                    const v2 = { x: anklePx.x - kneePx.x, y: anklePx.y - kneePx.y };

                    // Ángulo interno geométrico
                    const dotProduct = v1.x * v2.x + v1.y * v2.y;
                    const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
                    const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

                    let innerAngleDeg = 0;
                    if (mag1 * mag2 !== 0) {
                        const cosTheta = Math.max(-1, Math.min(1, dotProduct / (mag1 * mag2)));
                        innerAngleDeg = Math.acos(cosTheta) * (180 / Math.PI);
                    }

                    // Flexión de rodilla = 180° - ángulo interno
                    const flexionAngle = 180 - innerAngleDeg;

                    rawResults.push({
                        time: currentTime,
                        flexion: flexionAngle,
                        valid: true,
                        hipPx, kneePx, anklePx
                    });
                    validFramesCount++;
                } else {
                    rawResults.push({ time: currentTime, flexion: null, valid: false });
                }
            } else {
                rawResults.push({ time: currentTime, flexion: null, valid: false });
            }
        }

        // Manejo de error si hay muy pocos frames válidos
        if (validFramesCount < 5) {
            alert("Error: No se detectaron suficientes frames válidos con alta confianza en el video lateral. Verifique iluminación y encuadre.");
            progressLateralContainer.classList.add("hidden");
            btnAnalyzeLateral.disabled = false;
            return;
        }

        // Suavizado ligero mediante Mediana Movil (Ventana de 3) sobre frames válidos
        const smoothedResults = applyMedianFilter(rawResults, "flexion");

        // Búsqueda de flexión máxima
        let maxFlexion = -Infinity;
        let maxTime = 0;
        let maxFrameObj = null;

        smoothedResults.forEach((res) => {
            if (res.valid && res.flexion > maxFlexion) {
                maxFlexion = res.flexion;
                maxTime = res.time;
                maxFrameObj = res;
            }
        });

        const validPercentage = ((validFramesCount / totalFrames) * 100).toFixed(1);

        // Desplegar métricas
        valMaxFlexion.textContent = `${maxFlexion.toFixed(1)}°`;
        valTimeMaxFlexion.textContent = `${maxTime.toFixed(2)} s`;
        valDurationLateral.textContent = `${duration.toFixed(2)} s`;
        valValidFramesLateral.textContent = `${validFramesCount} / ${totalFrames} (${validPercentage}%)`;

        // Renderizar Gráfico
        renderLateralChart(smoothedResults, maxTime, maxFlexion);

        // Captura de Frame Representativo
        if (maxFrameObj) {
            await drawLateralSnapshot(videoLateral, maxFrameObj, canvasLateralSnapshot);
            snapshotLateralCaption.textContent = `Frame de máxima flexión (${maxFlexion.toFixed(1)}°) capturado a los ${maxTime.toFixed(2)} segundos.`;
        }

        // Generar texto descriptivo
        interpretationTextLateral.innerHTML = `<p><strong>Análisis Lateral:</strong> Durante la sentadilla analizada, la rodilla alcanzó una flexión máxima de <strong>${maxFlexion.toFixed(1)}°</strong> a los <strong>${maxTime.toFixed(2)}</strong> segundos de la ejecución, registrada sobre un total de ${validFramesCount} frames válidos (${validPercentage}% de confiabilidad de seguimiento).</p>`;

        progressLateralContainer.classList.add("hidden");
        btnAnalyzeLateral.disabled = false;
    });

    // ==========================================
    // ANÁLISIS VISTA FRONTAL (PLANO FRONTAL)
    // ==========================================
    btnAnalyzeFrontal.addEventListener("click", async () => {
        if (!videoFrontal.src) return;

        btnAnalyzeFrontal.disabled = true;
        progressFrontalContainer.classList.remove("hidden");
        updateProgress(statusFrontal, progressBarFrontal, 0, "Iniciando análisis frontal...");

        const width = videoFrontal.videoWidth;
        const height = videoFrontal.videoHeight;
        canvasFrontalOverlay.width = width;
        canvasFrontalOverlay.height = height;

        const duration = videoFrontal.duration;
        const fps = 30;
        const totalFrames = Math.floor(duration * fps);
        const frameInterval = 1 / fps;

        let rawResults = [];
        let validFramesCount = 0;

        for (let i = 0; i < totalFrames; i++) {
            const currentTime = i * frameInterval;
            videoFrontal.currentTime = currentTime;

            await new Promise((resolve) => {
                videoFrontal.onseeked = resolve;
            });

            const poseResults = await processFrameWithPose(videoFrontal);

            const pct = Math.round(((i + 1) / totalFrames) * 100);
            updateProgress(statusFrontal, progressBarFrontal, pct, `Procesando frame ${i + 1} de ${totalFrames}...`);

            if (poseResults && poseResults.poseLandmarks) {
                const landmarks = poseResults.poseLandmarks;

                // Landmarks requeridos: Rodilla D (14), Rodilla I (13), Tobillo D (16), Tobillo I (15)
                const rKnee = landmarks[14];
                const lKnee = landmarks[13];
                const rAnkle = landmarks[16];
                const lAnkle = landmarks[15];

                if (rKnee.visibility >= MIN_VISIBILITY_THRESHOLD &&
                    lKnee.visibility >= MIN_VISIBILITY_THRESHOLD &&
                    rAnkle.visibility >= MIN_VISIBILITY_THRESHOLD &&
                    lAnkle.visibility >= MIN_VISIBILITY_THRESHOLD) {

                    const rKneePx = { x: rKnee.x * width, y: rKnee.y * height };
                    const lKneePx = { x: lKnee.x * width, y: lKnee.y * height };
                    const rAnklePx = { x: rAnkle.x * width, y: rAnkle.y * height };
                    const lAnklePx = { x: lAnkle.x * width, y: lAnkle.y * height };

                    // Distancias horizontales en píxeles (|x1 - x2|)
                    const distKnees = Math.abs(rKneePx.x - lKneePx.x);
                    const distAnkles = Math.abs(rAnklePx.x - lAnklePx.x);

                    let indexRatio = null;
                    if (distAnkles > 0) {
                        indexRatio = distKnees / distAnkles;
                    }

                    if (indexRatio !== null) {
                        rawResults.push({
                            time: currentTime,
                            indexRatio: indexRatio,
                            valid: true,
                            rKneePx, lKneePx, rAnklePx, lAnklePx
                        });
                        validFramesCount++;
                    } else {
                        rawResults.push({ time: currentTime, indexRatio: null, valid: false });
                    }
                } else {
                    rawResults.push({ time: currentTime, indexRatio: null, valid: false });
                }
            } else {
                rawResults.push({ time: currentTime, indexRatio: null, valid: false });
            }
        }

        if (validFramesCount < 5) {
            alert("Error: No se detectaron suficientes frames válidos en la vista frontal. Asegúrese de que ambas rodillas y tobillos sean visibles.");
            progressFrontalContainer.classList.add("hidden");
            btnAnalyzeFrontal.disabled = false;
            return;
        }

        // Suavizado mediante Mediana Móvil
        const smoothedResults = applyMedianFilter(rawResults, "indexRatio");

        // Obtener valor inicial (primer frame válido) e índice mínimo
        let initialIndex = null;
        let minIndex = Infinity;
        let minTime = 0;
        let minFrameObj = null;

        smoothedResults.forEach((res) => {
            if (res.valid) {
                if (initialIndex === null) initialIndex = res.indexRatio;
                if (res.indexRatio < minIndex) {
                    minIndex = res.indexRatio;
                    minTime = res.time;
                    minFrameObj = res;
                }
            }
        });

        const validPercentage = ((validFramesCount / totalFrames) * 100).toFixed(1);

        // Desplegar métricas
        valMinIndex.textContent = minIndex.toFixed(2);
        valTimeMinIndex.textContent = `${minTime.toFixed(2)} s`;
        valInitialIndex.textContent = initialIndex ? initialIndex.toFixed(2) : "--";
        valValidFramesFrontal.textContent = `${validFramesCount} / ${totalFrames} (${validPercentage}%)`;

        // Renderizar Gráfico
        renderFrontalChart(smoothedResults, minTime, minIndex);

        // Captura de Frame Representativo
        if (minFrameObj) {
            await drawFrontalSnapshot(videoFrontal, minFrameObj, canvasFrontalSnapshot);
            snapshotFrontalCaption.textContent = `Frame de mínimo índice de separación (${minIndex.toFixed(2)}) capturado a los ${minTime.toFixed(2)} segundos.`;
        }

        // Generar texto descriptivo
        interpretationTextFrontal.innerHTML = `<p><strong>Análisis Frontal:</strong> Durante el movimiento, el índice de separación entre rodillas y tobillos comenzó en <strong>${initialIndex.toFixed(2)}</strong> en bipedestación y alcanzó un valor mínimo de <strong>${minIndex.toFixed(2)}</strong> a los <strong>${minTime.toFixed(2)}</strong> segundos de la ejecución.</p>`;

        progressFrontalContainer.classList.add("hidden");
        btnAnalyzeFrontal.disabled = false;
    });

    // ==========================================
    // FUNCIONES AUXILIARES DE PROCESAMIENTO
    // ==========================================

    function processFrameWithPose(videoElement) {
        return new Promise((resolve) => {
            pose.onResults((results) => {
                resolve(results);
            });
            pose.send({ image: videoElement });
        });
    }

    function updateProgress(statusElem, progressFillElem, percentage, text) {
        statusElem.textContent = text;
        progressFillElem.style.width = `${percentage}%`;
    }

    /**
     * Filtro de Mediana Móvil con ventana de 3 para mitigar oscilaciones
     */
    function applyMedianFilter(dataArray, key) {
        const result = JSON.parse(JSON.stringify(dataArray));
        for (let i = 1; i < result.length - 1; i++) {
            if (result[i - 1].valid && result[i].valid && result[i + 1].valid) {
                const vals = [result[i - 1][key], result[i][key], result[i + 1][key]];
                vals.sort((a, b) => a - b);
                result[i][key] = vals[1]; // Valor central (mediana)
            }
        }
        return result;
    }

    // ==========================================
    // DIBUJO DE SNAPSHOTS SOBRE CANVAS
    // ==========================================

    async function drawLateralSnapshot(videoElem, frameData, canvasElem) {
        videoElem.currentTime = frameData.time;
        await new Promise((resolve) => { videoElem.onseeked = resolve; });

        canvasElem.width = videoElem.videoWidth;
        canvasElem.height = videoElem.videoHeight;
        const ctx = canvasElem.getContext("2d");

        ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

        const { hipPx, kneePx, anklePx, flexion } = frameData;

        // Dibujar segmentos
        ctx.lineWidth = 4;
        ctx.strokeStyle = "#00E676"; // Verde claro
        ctx.beginPath();
        ctx.moveTo(hipPx.x, hipPx.y);
        ctx.lineTo(kneePx.x, kneePx.y);
        ctx.lineTo(anklePx.x, anklePx.y);
        ctx.stroke();

        // Dibujar Puntos
        drawPoint(ctx, hipPx.x, hipPx.y, "#FF5252");
        drawPoint(ctx, kneePx.x, kneePx.y, "#FFD600");
        drawPoint(ctx, anklePx.x, anklePx.y, "#FF5252");

        // Texto informativo
        ctx.font = "bold 22px Arial";
        ctx.fillStyle = "#FFFFFF";
        ctx.shadowColor = "black";
        ctx.shadowBlur = 4;
        ctx.fillText(`Flexión: ${flexion.toFixed(1)}°`, kneePx.x + 15, kneePx.y);
    }

    async function drawFrontalSnapshot(videoElem, frameData, canvasElem) {
        videoElem.currentTime = frameData.time;
        await new Promise((resolve) => { videoElem.onseeked = resolve; });

        canvasElem.width = videoElem.videoWidth;
        canvasElem.height = videoElem.videoHeight;
        const ctx = canvasElem.getContext("2d");

        ctx.drawImage(videoElem, 0, 0, canvasElem.width, canvasElem.height);

        const { rKneePx, lKneePx, rAnklePx, lAnklePx, indexRatio } = frameData;

        ctx.lineWidth = 4;
        ctx.strokeStyle = "#29B6F6"; // Azul claro

        // Línea entre rodillas
        ctx.b
