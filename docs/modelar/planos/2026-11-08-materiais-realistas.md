# Materiais realistas e exportação glTF

**Estado:** ativo

**Território:** `modulos/textura/`, `modulos/exportador-gltf/`, `tools/modelar/exportar-gltf.mjs`, `src/bancada/`, `src/autoria/adaptar-three.js`, `src/autoria/material-da-receita.js`, `tools/fixtures/acervo/materiais-de-prova/`, `src/autoria/descrever-partes.js`, `tools/modelagem/revisao-modelagem.mjs`, `tools/modelar/exportar-obj.mjs`

**Responsável:** Tiago (aprovação por imagem) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-modelar`, base na main de 2026-11-08.

Em 2026-11-08, na fatia 1, entraram no território a pasta da peça de prova, que segue o padrão dos ensaios em `tools/fixtures/acervo/`, e os três lugares que liam o material com lista própria: a revisão, que só rastreia as oito propriedades antigas, e o exportador OBJ, que passa a usar o normalizador. O adaptador do núcleo, que alimenta a Oficina, fica fora e ignora os campos novos.

A fatia 2 fechou em 2026-11-08 com a pessoa aprovando por imagem a peça de prova: estúdio escuro de faixas recortadas, céu aberto, tinta com verniz, vidro, metal espelhado, borracha e plástico acetinado. O aço pintado ainda lê como plástico claro e passa à fatia 3. A primeira versão saiu com o ambiente de cabeça para baixo (a linha 0 da textura de dados é o nadir), o que deixava o metal cinza e a tinta desbotada; os testes do ambiente passaram a conferir a orientação. A imagem de auditoria do crítico segue sem ambiente, e a opção `--ambiente` da `olhar-bancada.mjs` fica para a etapa de materiais do furgão, que é dona do arquivo.

A fatia 3 fechou em 2026-11-08 com a pessoa aprovando por imagem os prismas da lente, o granulado, a banda de rodagem no desenho `costelas` (o `v` fica como opção) e o relevo `flanco` (medida numa linha, duas vezes na volta, textos genéricos menores, anéis, faixa serrilhada e grão fino), e o aço pintado acertado. O adaptador não gerava coordenada de textura, e a pessoa escolheu a projeção declarada no próprio `relevo` (`projecao` plana, cilíndrica ou caixa, e `eixo`), calculada por uma função pura em `src/autoria/coordenada-de-textura.js` que o exportador glTF vai usar igual. Nenhuma peça do acervo usa relevo, e a cena delas segue idêntica.

## Problema observado

Hoje o material da receita é uma cor com transparência, aspereza e metalicidade, e o módulo de textura gera só a imagem da cor
(madeira, liso, metal e tecido). Na etapa 8 do furgão realista isso apareceu de três modos. A lente de ré incolor, com opacidade
0,2, sumiu na lanterna e teve de virar um material leitoso próprio. O refletor de metal claro não reflete nada, porque a bancada
não tem ambiente. O relevo de prismas das lentes, a borda de cada faixa na cor da lente e o cromado ficaram parados à espera
deste plano. A exportação sai em OBJ e STEP, e nenhum dos dois leva verniz, transmissão do vidro ou relevo.

## Resultado

Cada material é declarado uma vez na receita, e a mesma declaração faz a bancada mostrar a peça com verniz, vidro, metal
espelhado e relevo sob um ambiente de estúdio, e faz `npm run exportar:gltf -- <peça>` gravar um `.glb` que passa no validador
oficial do glTF e abre no Blender com os mesmos materiais.

## Decisões da pessoa (2026-11-08)

As texturas, os relevos e o ambiente são gerados pelo projeto, a partir de números, sem imagem de fora; uma exceção por
material só entra se a imagem não convencer, com a origem e a licença registradas. A bancada e o arquivo exportado mostram o
mesmo material. O ambiente padrão é um estúdio de fundo neutro, chão cinza e faixas de luz suaves, e o céu aberto com
horizonte fica como segunda opção, escolhida na bancada e na exportação.

Para o furgão realista, aplicadas pelo plano dele: a lataria em tinta sólida com verniz, no azul de hoje, e a tinta
metálica com flocos fica como opção do material para outras peças; as rodas em aço pintado de prata acetinado, com o alumínio
como opção; o pneu em borracha preta fosca com o relevo da banda de rodagem e das letras da lateral, sem nome de fabricante;
o para-brisa e os vidros da cabine claros com leve tom verde e os vidros das portas de trás escurecidos; as lentes com relevo
de prismas, a borda de cada faixa da lanterna na cor da lente, o refletor espelhado; os para-choques, as saias e as molduras dos arcos em plástico preto acetinado, entre o fosco e o
brilhante, com um granulado fino que quebra o reflexo sem deixar a superfície com cara de giz.

## Filtro Agent-First

O material da receita é a interface que o modelador escreve: REFATORAR, com um normalizador único
(`src/autoria/material-da-receita.js`) que recusa campo desconhecido com o nome do campo e os aceitos, para o modelador não
descobrir pela imagem que um campo foi ignorado. Os campos que existem hoje continuam valendo com o mesmo sentido.

O módulo de textura: ENVOLVER. Ganha os mapas de aspereza e de relevo ao lado da cor, com a mesma regra de determinismo (a
mesma entrada e a mesma semente dão os mesmos bytes) e de tile sem emenda; o que já gera não muda.

A exportação: USAR DIRETO o formato glTF 2.0 binário com as extensões oficiais de verniz, transmissão e índice de refração
(`KHR_materials_clearcoat`, `KHR_materials_transmission`, `KHR_materials_ior`), escrito pelo projeto a partir da malha
neutra, como o exportador OBJ já faz, sem depender do navegador. O validador oficial do glTF entra como prova.

A bancada: ENVOLVER. O material físico do Three.js já tem verniz, transmissão e relevo; o trabalho é traduzir o material
normalizado e criar o ambiente gerado. O pacote do crítico e as vistas do Blender ficam como estão (ver Excluído).

## Incluído

- os campos novos do material: verniz e a aspereza dele, transmissão, índice de refração, tom do vidro, flocos da tinta
  metálica, e o relevo por tipo (prismas, banda de rodagem, letras em baixo-relevo, granulado), com escala e intensidade;
- os mapas de aspereza e de relevo gerados em `modulos/textura/`;
- o ambiente de estúdio e o de céu aberto gerados, a escolha na bancada e na exportação;
- o exportador glTF com as texturas embutidas, determinístico byte a byte;
- uma peça de prova geral com os seis materiais (tinta com verniz, vidro, metal espelhado, aço pintado, borracha com relevo,
  plástico granulado) para a pessoa aprovar por imagem antes de qualquer peça do acervo.

## Excluído

- o pacote do crítico e as vistas do Blender, que seguem neutros para a nota continuar comparável entre rodadas;
- desgaste, sujeira, decalques, logotipos e qualquer nome de fabricante;
- a aplicação dos materiais no furgão, que é etapa do plano do furgão, sobre a ferramenta deste plano;
- animação, luzes acesas e emissão.

## Gate de saída

1. O normalizador recusa campo desconhecido e aceita todas as receitas do acervo sem mudar a cena delas.
2. Mapas e `.glb` são determinísticos: duas execuções dão os mesmos bytes, e o tile não tem emenda.
3. O `.glb` da peça de prova e o de uma peça do acervo passam no validador oficial sem erro, e o Blender os importa com os
   materiais (render de conferência pelo Blender da sessão).
4. A pessoa aprova por imagem a peça de prova na bancada, no estúdio e no céu aberto, e o mesmo arquivo renderizado no
   Blender.
5. Testes do normalizador, dos mapas e do exportador, e a ficha de capacidade do material e da exportação atualizadas.

## Fatias

1. O contrato do material: o normalizador, os campos novos e a peça de prova com os seis materiais em cor chapada.
2. A bancada: o material físico, o ambiente de estúdio e o de céu aberto; primeira aprovação por imagem.
3. Os relevos e a aspereza: prismas, banda de rodagem, letras e granulado, com a coordenada de textura que cada um pede.
4. O exportador glTF e a prova pelo validador e pelo Blender; segunda aprovação por imagem.
5. Fechamento, com o furgão liberado para a etapa de materiais no plano dele.

## Riscos e parada

O relevo depende da coordenada de textura da peça. Se as ilhas que o adaptador gera hoje não derem uma faixa contínua na banda
do pneu ou uma grade regular na lente, parar e trazer à pessoa as duas saídas antes de seguir: uma coordenada de textura
declarada por parte na receita, ou o relevo do pneu feito em geometria e só o granulado por mapa. Se o vidro com transmissão
deixar a bancada lenta demais para girar a peça, o vidro da bancada cai para transparência simples, e a transmissão fica só
na exportação, escrito aqui.

## Fechamento

Preencher ao concluir ou cancelar.
