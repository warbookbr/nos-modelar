# v3 — núcleo procedural, peças e visor

Este diretório mantém o núcleo procedural e o visor neutro usados pela
Mecanifica. O antigo jogo v3 foi retirado; a bancada é a superfície visual ativa.

## Recorte mantido na Mecanifica

Este diretório conserva o núcleo procedural, as peças e o visor de referência.
A bancada neutra atual vive em `/bancada.html` e usa Three.js por meio de um
adaptador.

```
v3/
  motor/        o motor (compartilhado com o futuro cliente)
    mat4.js     matrizes (persp/ortho/lookAt/rotY/translate)
    tex.js      paleta Resurrect64, ruído, dither, texCanvas (índice | [r,g,b] | -1)
    geo.js      Mesh/quad/quadUV/tri/box (8 floats/vértice)
    render.js   o VISOR: sol+sombra PCF, luz de céu, névoa, partículas, grama e blit
                — câmera de órbita no visor
  pecas/        cada peça é um módulo JS autocontido (contrato abaixo)
    freio-disco.js  conjunto mecânico de referência da Mecanifica
    _modelo.js      template comentado ("olá mundo": cubo animado)
  visor.html    abre uma peça ISOLADA: ?peca=nome&res=640&ts=4[&a=&e=&r=] — órbita
```

## O contrato de peça

```js
export const meta = { nome, tipo: 'objeto' | 'chao', desc };
export function construir(ctx) {
  // ctx = { TS, tex: {texCanvas, dth, hash2, vnoise, fbm, PALETTE, RGB},
  //         geo: {Mesh, quad, quadUV, tri, box}, m4 }
  return {
    lotes: [{ mesh, tex, matriz? }],   // malha CPU + canvas; o visor sobe pra GPU
    animar?: (t, lotes) => {},          // anima trocando lotes[i].matriz
    // opções de paisagem:
    palco?: false,        // a peça É o chão -> some a grama padrão do visor
    particulas?: false,   // sem pólen (em paisagem lia como enxame)
    fog?: [início, alcance],  // névoa própria (a padrão esmaga cenas grandes)
    far?: 320,            // far plane próprio (o padrão 60 cortaria o longe)
    camera?: { e, r },    // órbita sugerida (?e/?r da URL vencem)
  };
}
```

## O ciclo

1. copie `pecas/_modelo.js` → `pecas/minha-peca.js`
2. `npm run peca -- minha-peca` — screenshots em 3 ângulos (tools/bancadas/out/)
3. LEIA os PNGs, itere até ficar bom de verdade (crítico, não complacente)
4. publique: push na `main` — o `pages.yml` copia `v3/` direto pro Pages —
   `https://brigsd.github.io/nos/fps/v3/visor.html?peca=minha-peca`

## Limites honestos (hoje)

- **Reflexos**: recurso do motor (passe planar/água), planejado, não feito.
- O visor mostra peças isoladas. Câmera livre, jogo, áudio e benchmark antigo
  pertencem ao legado removido nesta rodada.
