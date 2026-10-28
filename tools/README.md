# tools/ — ferramentas do Modelar e do núcleo herdado

```
tools/
  bancadas/    As BANCADAS — prova por medição (Playwright headless / Node, offline):
               porteiro.mjs   — gate de render: pageerror/__ready/frame degenerado
                                (npm run porteiro)
               bench/         — estatísticas PNG usadas pelas bancadas
               out/           — PNGs/saídas (gitignorado; evidência regenerável)
  blender/     Ferramentas opcionais do Blender, fora do núcleo, do CI e do --completo:
               regua.py, pacote-cego.py, olhar-candidata.py e oraculo-subdivisao.mjs
               (uso em docs/modelar/blender/REGUA-E-PACOTE-CEGO.md)
  mapa/        mapa.mjs (docs/MAPA.md gerado dos cabeçalhos + gate mapa:check),
               links.mjs (referências + alcançabilidade a partir do índice do
               Modelar) e toc.mjs (índice de docs/oficina.md)
  modelar/     Testes vitest dos contratos novos: ponte Three.js, semântica do
               drone e estado reproduzível da bancada
  oficina/     Testes vitest do núcleo procedural (motor/oficina.js)
```

**Pré-requisito das bancadas visuais:** `npm ci` na raiz, uma vez (o Playwright
está nas devDependencies; o Chromium já vem no ambiente — as bancadas avisam se
faltar). O contexto da aplicação está em **`docs/modelar/INDEX.md`**; os
o contrato herdado do núcleo está em **`docs/nos-herdado/oficina-contrato.md`**.

Regra: **ferramenta nova de coder (bancada/auditoria) nasce em `tools/bancadas/`**.
