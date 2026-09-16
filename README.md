# Editor Automático — V0.2

Editor web para processar vídeos localmente no navegador, com preview 9:16 antes da geração.

## O que esta versão testa
- Preview real do primeiro vídeo selecionado.
- Fundo ampliado/desfocado ou preto.
- Espelhamento.
- Velocidade 1,03x.
- Nitidez leve.
- Texto superior.
- @ opcional como marca d'água dentro do vídeo.
- Logo opcional.
- Até 5 vídeos por lote.
- Processamento local com FFmpeg.wasm.

## Observação
O preview é visual e interativo no navegador; a renderização final é feita pelo FFmpeg. O editor visual com arrastar/redimensionar elementos, templates salvos, legendas automáticas e ZIP de saída ficam para etapas posteriores.

O projeto não inclui recursos para burlar sistemas de detecção de plataformas.
