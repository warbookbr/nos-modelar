# Contrato de autoria de prancha v1

Uma prancha não é apenas SVG bem-formado. Antes de o motor desenhar, a especificação declara de onde veio o alvo, o quanto ele é confiável e se pode orientar uma modelagem precisa. O contrato é `mecanifica.prancha-autoria@1` e é validado por `tools/mecanifica/prancha-autoria.mjs`.

## Bloco obrigatório

```js
autoria: {
  versao: 'mecanifica.prancha-autoria@1',
  estado: 'pronta',
  modo: 'quatro-vistas',
  confianca: 'alta',
  intencao: 'cupê ficcional de cunha para validar quatro vistas',
  procedencias: [{
    id: 'briefing',
    tipo: 'briefing-ficcional',
    evidencia: 'dimensões e invariantes declarados neste arquivo',
  }],
  incertezas: [],
}
```

`id` de procedência e de incerteza é semântico e único dentro da prancha. Ele é o que aparece no relatório; não use índice de array como identidade.

Quando a fonte não permite fixar medida ou forma, a alternativa correta não é preencher lacunas: declare `estado: 'bloqueada'`, `confianca: 'baixa'` e ao menos uma incerteza com efeito `bloqueia`:

```js
incertezas: [{
  id: 'escala', sobre: 'dimensões', fonte: 'foto', efeito: 'bloqueia',
  motivo: 'imagem em perspectiva sem medida independente',
}]
```

O motor ainda pode desenhar e relatar esse artefato, mas acrescenta o alerta de bloqueio e o consumidor não pode usá-lo como alvo de modelagem precisa. `pronta` não aceita confiança baixa nem incerteza bloqueante.

## Quatro vistas, relações e medidas

`modo: 'quatro-vistas'` exige `lateral`, `frontal`, `traseira` e `planta`, cada uma com pelo menos uma camada real. A relação espacial vem das declarações de `vistas`: cada vista informa `leitura: 'projecao'` ou `leitura: 'secao'`; o motor compara os eixos compartilhados e o `envelope` contra o traçado. Não declare uma seção para silenciar discrepância.

Landmarks e cotas continuam nas listas top-level `landmarks` e `cotas` da especificação. Seus IDs dão identidade aos pontos medidos; a procedência deste contrato explica por que esses números podem (ou não) ser usados.

## Fluxo mínimo

1. Declare intenção, fontes e qualquer incerteza antes de criar camadas.
2. Desenhe somente com `estado: pronta` se a evidência sustenta o alvo; senão entregue uma prancha bloqueada com a causa explícita.
3. Rode o script da prancha e leia a linha `autoria:` e todos os alertas antes de inspeção visual, crítica independente ou modelagem 3D.

O contrato não converte raster em verdade geométrica, não mede confiança por adivinhação e não substitui a crítica visual independente.
