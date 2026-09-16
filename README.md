# Editor Automático — v0.1

Primeira versão do editor em lote pensado para uso pelo celular.

## O que já faz
- Seleciona até 5 vídeos por lote.
- Processa no navegador usando FFmpeg.wasm.
- Não envia os vídeos para um servidor.
- Converte para 9:16 (1080x1920).
- Cria fundo ampliado e desfocado.
- Mantém o vídeo original centralizado.
- Espelhamento opcional.
- Velocidade opcional 1,03x.
- Nitidez leve opcional.
- Gera MP4 para download.

## Próximas versões
- Template visual configurável.
- Cabeçalho e @ sobre o vídeo.
- Logo.
- Posições/tamanhos ajustáveis.
- Legendas automáticas.
- Presets salvos.
- ZIP com todos os resultados.
- Controle de quantidade por lote.

## Base
A arquitetura usa FFmpeg.wasm, um port de FFmpeg para WebAssembly que permite processamento no navegador.
Referência: https://github.com/ffmpegwasm/ffmpeg.wasm

Também foi usada como referência a arquitetura open-source do ffmpeg-webCLI:
https://github.com/tejaswigowda/ffmpeg-webCLI

## Observação
Esta versão é um protótipo de edição/formatação. Não inclui mecanismos para ocultar deliberadamente a origem de conteúdo de terceiros ou burlar sistemas de detecção.
