# A pele exterior da carroceria nasce de subdivisão com vincos, e não de loft, envelope varrido, campo implícito nem kernel próprio

Estado: em vigor.
Decidido em: 2026-08-19.
Origem: `docs/modelar/planos/encerrados/2026-08-18-chassi-realista-kernel-geometrico.md`, no commit `088147fc`.
Substitui: nada.

## O que ficou decidido
A superfície exterior de carroceria é autorada como malha de controle de quadriláteros com vincos, avaliada por subdivisão Catmull-Clark determinística no núcleo, sem dependência externa; a unidade editável é o loop de aresta nomeado. O `loft` e o envelope varrido ficam recusados como base da pele, as aberturas são loops fechados na cage e a pele primária não sofre booleana. Ficam rejeitados também o campo implícito (SDF) e um kernel B-rep próprio. O `loft` segue válido em peça genuinamente varrida.

## Por quê
O `loft` e o envelope não abrem para-brisa, vidro nem vão de porta sem booleana, acoplam capô, para-lama e túnel e convergem para tubo. A carroceria rejeitada era um único `loft` de nove seções elípticas, com 86 vértices, e o protótipo de três envelopes, com 1.014 vértices, mostrou que densidade não corrige abstração. O campo implícito é ruim em painel fino, vinco e vão, e o kernel próprio traz risco desproporcional.

## Quando reabrir
Para o campo implícito, se surgir forma orgânica sem requisito de painel. Para o `loft` na pele exterior e para o kernel próprio, a origem diz que nenhuma condição está prevista.
