# Editor Automático V0.6

Editor de vídeos local no navegador, pensado para celular.

## Correção desta versão
- O carregador principal do FFmpeg agora é local (`ffmpeg-local.js`).
- O Worker do processamento é local (`ffmpeg-worker.js`).
- Não depende mais de `@ffmpeg/ffmpeg` hospedado em CDN para criar o Worker.
- Usa `@ffmpeg/core@0.12.6` no Worker, com fallback jsDelivr → unpkg.
- A comunicação usa a API de Worker diretamente e não mistura as APIs antigas `FS/run` com a API 0.12.

## Recursos
- Preview 9:16
- Até 5 vídeos por lote
- Fundo ampliado + desfoque ou preto
- Espelho
- Velocidade 1,03x
- Nitidez leve
- Texto superior
- @ opcional
- Logo
- Saída MP4

O processamento continua sendo local no navegador. O Worker evita bloquear a interface enquanto o FFmpeg processa o vídeo.


V0.6: após cada vídeo ser processado, o navegador inicia automaticamente o download do MP4 em vez de abrir o vídeo. Um link "Baixar novamente" fica disponível como fallback caso o Chrome bloqueie downloads automáticos.
