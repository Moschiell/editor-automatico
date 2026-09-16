# Editor Automático — V0.3

Esta versão troca o carregamento UMD 0.12.x que estava causando o erro `Failed to construct 'Worker'` no GitHub Pages por **FFmpeg.wasm 0.11.6 + core-st 0.11.1**.

## O que permanece
- 1 a 5 vídeos por lote
- Preview 9:16 real
- Fundo ampliado + desfoque ou preto
- Espelho
- Velocidade 1,03×
- Nitidez leve
- Texto superior
- @ opcional
- Logo opcional
- Processamento local no navegador
- Download de cada resultado

## Correção principal
O 0.12 UMD estava tentando criar o `814.ffmpeg.js` diretamente no domínio do CDN. Em navegadores isso pode ser bloqueado por origem. O 0.11.x usa o carregador antigo e a versão single-thread `core-st`, evitando esse Worker externo.

A primeira geração ainda precisa baixar o motor FFmpeg, e processamento de vídeo pode consumir bastante RAM/CPU no celular.

Fontes técnicas consultadas:
- Documentação oficial do ffmpeg.wasm
- Histórico/release oficial 0.12.x
- Discussões oficiais sobre o problema do Worker UMD 0.12
