# tools/ — ferramentas da Mecanifica e do núcleo herdado

```
tools/
  bancadas/    As BANCADAS — prova por medição (Playwright headless / Node, offline):
               olhar-peca.mjs — screenshot de PEÇA em 3 ângulos / giro / visão de
                                geometria --geo=normais|flat (npm run peca)
               jogar.mjs      — screenshot do jogo (jogo.html): câmera livre, menu,
                                tiers de gráfico (npm run jogar)
               auditar.mjs    — gate de senso crítico [cpu]: os 5 críticos numa peça,
                                exit≠0 em achado (npm run auditar)
               porteiro.mjs   — gate de render: pageerror/__ready/frame degenerado
                                (npm run porteiro)
               executar.mjs   — replay headless do núcleo procedural em Node (npm run executar)
               bench/         — benchmark dos críticos (defeitos plantados → placar F1)
               out/           — PNGs/saídas (gitignorado; evidência regenerável)
  mapa/        mapa.mjs (docs/uso/MAPA.md gerado dos cabeçalhos + gate mapa:check),
               links.mjs (referências + alcançabilidade a partir do índice da
               Mecanifica) e toc.mjs (índice de docs/oficina.md)
  mecanifica/  Testes vitest dos contratos novos: ponte Three.js, semântica do
               drone e estado reproduzível da bancada
  oficina/     Testes vitest do núcleo procedural (motor/oficina.js)
```

**Pré-requisito das bancadas visuais:** `npm ci` na raiz, uma vez (o Playwright
está nas devDependencies; o Chromium já vem no ambiente — as bancadas avisam se
faltar). O contexto da aplicação está em **`docs/mecanifica/INDEX.md`**; os
o contrato herdado do núcleo está em **`docs/uso/oficina-contrato.md`**.

Regra: **ferramenta nova de coder (bancada/auditoria) nasce em `tools/bancadas/`**.
