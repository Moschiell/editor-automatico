# Editor Automático V0.4

Correção do travamento da V0.3. A V0.3 usava o core single-thread 0.11 no thread principal, o que pode congelar a página durante a codificação. A V0.4 volta ao FFmpeg.wasm 0.12, mas fornece um Worker `ffmpeg-worker.js` hospedado no próprio GitHub Pages, evitando que o Chrome tente construir o Worker diretamente do CDN. O core/WASM continua sendo baixado do CDN dentro desse Worker.

Recursos mantidos: preview, 9:16, fundo desfocado/preto, espelho, 1,03x, nitidez, texto, @, logo e lote de até 5 vídeos.
