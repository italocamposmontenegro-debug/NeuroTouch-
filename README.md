# NeuroTouch Pro (GitHub Pages)
Proyecto listo para iPhone: pointer events robustos, alto contraste, audio, sensores, exportación CSV y PWA opcional.

## Publicación
1. Crea repo público vacío (ej. `neurotouch-pro`).
2. Sube **todo** el contenido de esta carpeta a la **raíz** del repo.
3. Activa Pages:
   - **Opción A**: Settings → Pages → Deploy from a branch → Branch `main` / Folder `/ (root)` → Save.
   - **Opción B (recomendada)**: usa el workflow incluido (`.github/workflows/pages.yml`), ve a *Actions* y espera el deploy.

URL final: `https://TU_USUARIO.github.io/NOMBRE_DEL_REPO/`

## iPhone (Safari)
- Si ya tenías otra versión instalada, ciérrala del conmutador.
- Abre la URL con `?v=1` para evitar caché.
- Toca **Habilitar modo offline** cuando el touch funcione bien.

## Módulos
- **Simple** (tap/hold, beep, contadores)
- **Tapping 30s** (alterno L-R, aciertos/errores, tiempo)
- **Tiempo de reacción** (falsas salidas, promedio, N)
- **Metrónomo** (BPM, click/flash visual)
- **Doble tarea** (reglas, aciertos/FP/omisiones)
- **Sensores** (RMS/pico/gráfico, export CSV)

## Notas de robustez
- Eventos: `pointerdown/pointerup` con fallback a `touchstart/mousedown` y extra `click` por seguridad.
- CSS: `touch-action: manipulation`; `user-select: none`; `viewport user-scalable=no`.
- SW: no se registra automáticamente; se activa manualmente con el botón para evitar caché vieja durante pruebas.
