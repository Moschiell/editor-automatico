# Editor Automático — V0.2 corrigida

Editor web para processar vídeos locais no navegador.

## Nesta versão
- Seleção de 1 a 5 vídeos sem depender do FFmpeg.
- Preview 9:16 real usando o vídeo escolhido.
- Fundo desfocado ou preto no preview.
- Espelho, velocidade 1,03x, nitidez, texto, @ opcional e logo no preview.
- FFmpeg só é carregado quando o usuário toca em GERAR VÍDEOS.
- Correção do Worker do FFmpeg no GitHub Pages usando `classWorkerURL` em Blob URL.
- Processamento local; os vídeos não são enviados para um servidor do projeto.

## Observação
A primeira geração baixa o motor FFmpeg (~30 MB). O processamento pode exigir bastante memória em celulares. Teste primeiro com 1 vídeo curto.

A implementação usa @ffmpeg/ffmpeg 0.12.10 com @ffmpeg/core 0.12.6, combinação publicada na release correspondente do projeto.
