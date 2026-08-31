# Malha otimizada e prova por objeto — progresso

Documento auxiliar do plano
[`planos/2026-08-31-malha-otimizada-e-prova-por-objeto.md`](planos/2026-08-31-malha-otimizada-e-prova-por-objeto.md).
Aqui ficam o estado de cada fatia, as medições e os atritos anotados na hora em
que aparecem — que é o produto real das fatias de modelagem.

## Estado das fatias

| fatia | o que faz | estado |
| --- | --- | --- |
| H0 | dividir o `AUTORIA-IA` | em curso |
| H1 | a cadeira | concluída |
| H2 | redução de vértice | concluída — **funciona e rende ~zero** |
| H3 | organizador de topologia | concluída |
| H4 | preparação para micropolígono | concluída |
| H5 | armas brancas | pendente |
| H6 | colher os atritos | pendente |

## H1 — a cadeira

Modelada por `PASSOS` declarativos, sem `construir(ctx)`. Lê como cadeira de
jantar nas quatro vistas: pernas, assento, travessas de canela, encosto com três
ripas e travessa de topo.

Duas economias declaradas e uma entrega que faltava:

- perna, travessa e ripa são `chamferBox`, não cilindro. Madeira serrada não tem
  curva, e o chanfro dá a quebra de luz a um custo que 16 lados não dariam;
- o lado esquerdo vem de `espelha`, então uma correção na direita não pode
  divergir da esquerda — economia de erro antes de economia de vértice;
- o cabeçalho prometia curva real na quina do assento e no topo do encosto e a
  geometria não tinha nenhuma das duas. Entregues por `arredondarAresta` depois
  de **medir** qual índice de aresta é o da frente, provando as quatro.

Seis atritos anotados abaixo, todos encontrados fazendo, nenhum deles previsto.

## H2, H3 e H4 — os três módulos

Entraram três módulos puros em `modulos/` e uma porta única,
`npm run malha:conferir <receita>`, que responde as três perguntas de uma vez.
A porta existe porque uma IA no meio de uma modelagem não deve precisar de três
importações para saber se acabou de produzir malha furada.

### H3 — organizador de topologia: funciona

`modulos/topologia/` devolve veredito e lista, **nunca geometria**. Acusa canto
repetido, área nula, casca aberta, aresta não-manifold, orientação incoerente,
n-gon, polo de valência alta, ilha solta e vértice sem uso.

Doze casos de teste, cada regra vista **reprovando** um defeito construído de
propósito e **aprovando** a malha sã correspondente. Na cadeira real: zero
reprovas, 13 corpos (correto), e quatro faces de sete cantos criadas pelo
`arredondarAresta` — achado que ninguém tinha visto.

### H2 — redução de vértice: prova o invariante e rende quase nada

O limiar foi declarado antes de medir, e é o mais duro possível: caixa
envolvente e área idênticas até 1e-9. O módulo confere o próprio invariante e
**lança** se a forma mudar, em vez de entregar em silêncio.

O resultado é honesto e vale mais que um ganho inventado:

| objeto | faces | triângulos |
| --- | --- | --- |
| cadeira | 304 → 304 | 532 → 532 |
| prensa progressiva | — | 392 → 392 |
| cutelo de sucata | 194 → **182** | 340 → 340 |

**Fundir coplanares reduz FACE, não TRIÂNGULO** — e triângulo é o que custa no
motor. Isso decide a pergunta que a fatia existia para responder: sim, dá para
reduzir sem perder qualidade, e o ganho de renderização é ~zero, porque a
geometria procedural já nasce mínima. A redução que cortaria triângulo é
decimação, que move a silhueta e portanto é decisão de autoria, não passo de
saída. **Quem quer menos triângulo muda a receita** — foi o que a cadeira fez
escolhendo `chamferBox` em vez de cilindro.

### H4 — preparo para micropolígono: funciona, com o não-coberto escrito

`modulos/preparo-micropoligono/` verifica fechamento, orientação, área não nula
e planaridade **antes** de triangular, porque triangular esconde: um leque sobre
face de borda produz triângulos que parecem sãos e o buraco continua lá.
Converte escala declarada (metro → centímetro, que é o que o motor assume) e
**não entrega geometria junto de um veredito de reprova**.

O que ele não cobre está escrito no próprio retorno: cluster e hierarquia de
LOD, UV e material, densidade de triângulo, e interseção entre partes.

A cadeira passa limpa: 532 triângulos, fechada, coerente, 88 cm.

### Um defeito que o teste achou em mim

O `ler` do preparo validava `p.slice(0,3).every(Number.isFinite)` sem conferir a
aridade. `[0,0]` passa, porque os dois elementos que existem são finitos. Um
ponto de duas coordenadas entraria como válido.

## Atritos encontrados

Anotados na hora, com o que estava tentando fazer quando apareceram.

| # | atrito | onde | custo do conserto |
| --- | --- | --- | --- |
| A1 | A skill `criar-peca` afirma que "não existe modelo de receita no acervo atual". Existem várias desde o PR #58 — prensa, cutelo, gabarito. A frase manda a IA não olhar exatamente o que ajudaria. | `.claude/skills/criar-peca/SKILL.md` | baixo: corrigir a frase |
| A2 | ~~`sel.grupos` não é recusado como chave desconhecida~~ — **diagnóstico errado, corrigido**. O motor recusa, e com a mensagem certa: "seleção desconhecida 'grupos' (só tudo, v, f, grupo, regiao, origem, porta, alias)". O defeito real era outro e maior: `executarReceita` **acumula em `neutro.orfaos` em vez de lançar**, e nem `conferir-malha` nem `ativar:bancada` liam esse campo. O canal de erro inteiro do motor era invisível nos dois comandos mais usados — a mensagem certa existia e não tinha quem a mostrasse. | `conferir-malha.mjs`, `ativar-bancada.mjs` | **resolvido nesta fatia**: os dois imprimem os gritos, e `conferir-malha` sai com código 1 |
| A3 | O modo estrutural de `espelha` exige `origemId`, `derivaDe` e `sel:{origem}` juntos, e o erro revela **um requisito por vez**: corrigi três vezes para descobrir os três. | `transformacoes.js` | médio: enunciar o contrato inteiro no primeiro erro |
| A4 | `em` é centro em X e Z mas **base** em Y. Supor centro nos três põe a peça a meia altura no ar. Não está no schema, que só diz "em". | schema de `cubo`/`chamferBox` | baixo: descrever a convenção no schema |
| A5 | Parte **sem material** renderiza cinza e nada acusa. O diagnóstico diz "nenhuma superfície sem identidade" — identidade de parte, não cobertura de material. Parece escolha estética. | diagnóstico da bancada | baixo: contar parte sem material |
| A6 | A barra de vistas cobre o topo do objeto enquadrado. Em objeto alto, o topo raspa a barra na imagem de evidência. | enquadramento da bancada | baixo: descontar a faixa da barra |
| A7 | `ativar:bancada` imprimia **o literal `0 faces órfãs`** e o critério fixo "Validado sem órfãos". A maça entrou com quatro faces sem parte e o comando anunciou zero. O dado já era calculado e descartado na linha seguinte. | `ativar-bancada.mjs` | **resolvido nesta fatia** |
| A8 | `{op:'cilindro', id}` sem eixo resolve só as laterais — decisão deliberada do motor, documentada. Mas quem escreve `['parte', {sel:{origem:{op:'cilindro'}}}]` perde as duas tampas **em silêncio**. | contrato de seleção | **mitigado**: o diagnóstico agora nomeia as faces e a causa |
| A9 | No harness headless os painéis não existem, as fábricas devolvem `null` por contrato, e `aoAtualizar` chamava `.renderizar` sem guarda. A sincronização caía na primeira entrega e **`--selecionadas` era aceito e ignorado**. | `main.js` | **resolvido nesta fatia** |
| A10 | A tolerância de planaridade era `1e-6`, e com ela todo loft curvo saía alertado. Alerta que aparece sempre não é lido. | `preparar.js` | **resolvido**: `1e-9`, calibrado pela bimodalidade medida |
| A11 | O conferente listava os cinco primeiros achados, não os cinco piores. Li os brandos da espada e concluí que a lâmina estava sã — a pior face dela torcia 25%. | `conferir-malha.mjs` | **resolvido nesta fatia** |
| A12 | A captura headless saía com todo o cromo da bancada, mais piso, grade e sombra. A peça ficava numa tira no meio e a sombra já foi lida como geometria. | `olhar-bancada.mjs` | **resolvido**: `--auditoria` e `--cores` |

## Medições

| fatia | medida | valor |
| --- | --- | --- |
| H1 | cadeira: vértices | 292 |
| H1 | cadeira: faces | 304 |
| H1 | cadeira: triângulos | 532 |
| H1 | cadeira: partes nomeadas / órfãs | 8 / 0 |
| H1 | cadeira: caixa (m) | 0,440 × 0,880 × 0,420, apoiada em y=0 |

## H5 — armas melee, e o que elas ensinaram

Três armas, cada uma exercitando uma exigência que as outras não tinham:
espada (seção que muda ao longo do comprimento), machado (assimetria no plano do
corte) e maça (repetição radial).

| peça | V | F | triângulos | corpos | órfãs | micropolígono |
| --- | --- | --- | --- | --- | --- | --- |
| Espada Curta | 124 | 142 | 232 | 4 | 0 | aprova |
| Machado de Guerra | 75 | 77 | 134 | 4 | 0 | alerta (torção aceita e justificada) |
| Maça de Abas | 202 | 212 | 364 | 5 | 0 | aprova |

### A regra que saiu daqui

Um quad de `loft` é plano **exatamente** quando as duas seções vizinhas são
semelhantes. Não é heurística: é o determinante das duas diagonais, e ele zera
só nesse caso. A espada torcia 25% na ponta porque afilava em largura mantendo a
espessura — a seção virava um losango em pé. Fazer a espessura acompanhar a
largura levou a torção de 2,5e-1 para 2,6e-16, ruído de ponto flutuante.

O machado **não pode** obedecer: do olho ao fio a cabeça fica mais alta e mais
fina ao mesmo tempo. Medi as duas saídas antes de aceitar a torção — subdividir
de 4 para 16 estações quadruplica o triângulo e corta a torção só pela metade.

### O que mudou nos módulos por causa disso

A torção transferiu o problema para a triangulação: num quad torto, **qual
diagonal** o leque usa É a silhueta. O preparo escolhia sempre a do primeiro
canto, ou seja, a forma dependia de qual canto o autor escreveu primeiro. Agora
escolhe: entre as diagonais que ficam dentro do quad, a mais curta, e registra a
escolha em `diagonal`.

O critério de "dentro" não é redundante com o de comprimento. Numa varredura de
485 mil quads côncavos, **19% têm a diagonal de fora mais curta** — nesses, o
comprimento sozinho escolheria um par que cobre área que não é da face.

### Auditoria visual

A captura headless saía com painéis, cabeçalho, rodapé, piso, grade e sombra —
a maior parte dos pixels sem peça nenhuma. `--auditoria` tira tudo isso;
`--cores` acrescenta uma cor por parte e imprime a legenda.

A cor por parte não é enfeite: partes do mesmo material são um borrão só, e foi
com ela que a cadeira passou a mostrar a marcenaria de relance. Para aproximar
numa parte é `--modo=isolar --focar` — em `contexto` o enquadramento inclui a
montagem inteira de propósito, e `--focar` ali não aproxima nada.

### O limite que continua de pé

Contagem, fechamento e orientação o conferente resolve por linha de comando. Se
a coisa **lê como o objeto certo**, não. A cabeça da maça saiu duas vezes como
bola facetada antes de ler como maça de abas, e nenhuma medida acusou — as três
imagens acusaram. A proporção continua sendo decidida olhando.
