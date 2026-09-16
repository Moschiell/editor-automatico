# Editor Automático V0.7

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


V0.7: após cada vídeo ser processado, o navegador inicia automaticamente o download do MP4 em vez de abrir o vídeo. Um link "Baixar novamente" fica disponível como fallback caso o Chrome bloqueie downloads automáticos.


## V0.7
- Barra de progresso visual em vez dos logs frame/fps/time/speed.
- Desfoque do fundo calculado em 360×640 antes da ampliação para 1080×1920, reduzindo o custo do filtro no celular.
- Saída H.264 em 30 fps e CRF 30 com preset ultrafast para priorizar velocidade de processamento local.
- O vídeo final continua em 1080×1920 (9:16).


## Progresso V0.10
100% só aparece quando o FFmpeg terminou e o arquivo de saída foi lido. O download automático começa imediatamente depois. Durante o processamento, a barra fica em no máximo 99%, mesmo que o evento interno do FFmpeg informe ratio=1 antes da conclusão completa.


## V0.10 — desempenho
- Pré-carrega o motor FFmpeg ao selecionar o primeiro vídeo, reduzindo a espera ao clicar em gerar.
- Reduz a resolução intermediária do fundo desfocado para diminuir o custo do filtro.
- Evita forçar 30 FPS quando não é necessário, preservando o FPS da origem.
- Mantém uma única passagem de filtros e uma única codificação por vídeo.
