# O esboço detalhado coerente

**Estado:** ativo

**Responsável:** Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, branch da sessão sobre a `main`

## Problema observado

O plano [o esboço sem conta à mão](encerrados/2026-09-29-o-esboco-sem-conta-a-mao.md)
fechou em 2026-10-01 com o fluxo por unidades funcionando: duas rodadas de
medição independentes, uma moto naked de 219 formas em 19 unidades e uma mini
escavadeira de 173 formas em 13, gastaram cerca de 10 KB de código auxiliar
contra 106 KB da primeira moto. As duas voltaram com o gate de contato
aprovado e, mesmo assim, o crítico cego deu 7 de 10 à moto: o motor não tem
quadro que o prenda, o escapamento termina contra a balança e o pinhão, os
espelhos são grandes demais e a rabeta é um conjunto de blocos soltos. O gate
mede contato e relações declaradas, e esses defeitos são de ligação e de função.

As duas rodadas também acharam seis bugs que mandaram a IA contornar o fluxo:
`unidade` numa instância de componente espelhada é recusada, `--feito` aceita
unidade com colisão aberta no mestre, `--detalhar` usa a tolerância da caixa
isolada e inventa peças soltas, `--editar` e `--integrar` regravam o JSON com
um número por linha, os Marcos de 25% a 75% disparam todos de uma vez, e o
máximo implícito da junta na mesma unidade estoura em eixo no cubo sem a
mensagem dizer que basta declarar `max`.

## Resultado

Um objeto detalhado de dezenas de unidades sai pelo fluxo sem a IA contornar a
ferramenta, e o gate e o crítico por unidade apontam as ligações que faltam e as
peças sem função antes de a imagem chegar à pessoa.

## Incluído

- os seis bugs acima, cada um com teste de reprodução mínima, e também
  `--remover a,b`, `--adicionar` com `arranja`, `arranja` radial com centro por
  expressão no `--detalhar`, e o aviso de ciclo que sobrevive a `--mover`;
- a conectividade estrutural no contrato: `plano.contrato.fixa` declara que uma
  peça precisa estar presa a outra por pelo menos N pontos de contato distintos
  (um motor ao quadro por dois), e o gate reprova a peça que só toca por um
  pino;
- o componente `roda` com raios, e perfis de pneu e de disco de freio por
  função (`gerar`);
- a forma `envolve`: faixa de largura e espessura dadas que contorna uma lista
  ordenada de círculos (centro, raio, eixo) por tangentes e arcos, para correia,
  corrente, esteira e cabo em polia; os elos saem pelo `arranja` sobre o caminho;
- o achado de ponta livre no gate: ponta de tubo, haste ou cilindro que não
  encosta em nada, ou várias pontas que terminam no mesmo ponto sem forma que as
  una, sem declaração de `ponta`;
- o crítico visual por unidade já no `--feito` de unidade com mais de 8 formas
  (e também no Marco): a skill despacha o crítico cego com as quatro imagens
  `--unidade`, em resolução suficiente (`--largura <px>`), e a `funcao` da
  unidade, sem a história da construção; ele responde que pontas ficam no ar, o
  que atravessa o quê, o que está fora do lugar em relação à parte a que deveria
  estar preso e o que a vista mostra que o nome não explica;
- ferramentas para a IA (fatia 4): bloco `modulos` no esboço, com parâmetros e
  formas reutilizáveis por `usa`, e uma biblioteca genérica pequena (parafuso,
  mola, engrenagem, rolamento, perfil estrutural, dobradiça); `--corte
  <eixo>=<valor>` e `--explodir` por unidade; `ligar: [A.ancora, B.ancora]` e
  `encaixa`, que criam a haste ou posicionam a peça pela âncora; `--ligacoes`,
  mapa de ligações em texto (quem toca quem, pontos, pontas livres, unidades
  presas a nada), também entregue ao crítico; modo de prévia com menos facetas,
  `--unidade` que só redesenha a unidade mudada e `--zoom-forma <id>`;
- o campo `funcao` por unidade no plano, uma frase (por exemplo "laço fechado
  que contorna coroa e pinhão"); unidade com mais de 8 formas sem `funcao` não
  passa no `--feito`;
- `--medidas` em texto, com o valor medido ao lado de cada medida do plano, e
  `--feito` que imprime só os Marcos novos.

## Excluído

- a ponte entre o esboço e o Mecanifica, que fica para depois;
- a conferência com foto real, que espera uma referência;
- mudança no núcleo do Mecanifica;
- curva livre e seção côncava de loft.

## Gate de saída

1. Os seis bugs e os quatro ajustes de comando têm teste que falhava antes.
2. `plano.contrato.fixa` reprova uma peça presa por um só ponto e aprova a presa
   por dois, com teste.
3. A `roda` com raios, o perfil de pneu e de disco e o `envolve` saem sem Python.
4. A moto refeita pelo fluxo, sem os defeitos que o crítico apontou (motor preso,
   escapamento com terminação, rabeta com suporte), tem nota 8 ou mais do crítico
   cego por unidade.
5. A mini escavadeira refeita não precisa contornar nenhum comando.
6. A pessoa confirma, olhando a moto e a escavadeira, que as ligações faltantes
   sumiram.
7. `npm run gates --completo` passa.

## Fatias

1. Os seis bugs e os ajustes de comando, com teste (feita; `correcoes-do-fluxo.test.js`).
2. (feita) `plano.contrato.fixa`, a `roda` com raios, os perfis de pneu e de disco, o `envolve`, a ponta livre, a `funcao` por unidade e o crítico por unidade no `--feito`.
3. (feita) O crítico por unidade também no Marco, `--medidas` e o Marco incremental (este já vinha da fatia 1).
4. (feita) As ferramentas para a IA: `modulos` e biblioteca, `--corte` e `--explodir`,
   `ligar` e `encaixa`, `--ligacoes`, prévia rápida, `--unidade` incremental e `--zoom-forma`.
5. A moto e a escavadeira refeitas com elas, medidas no transcript, anatomia
   prévia opcional (lista de partes e relações pelo conhecimento do modelo, e
   medidas da ficha técnica na web quando houver, com `origem`), e o fechamento.

## Riscos e desvios

O risco maior é a coerência funcional ser o que nenhuma medida pega, e o plano
virar uma lista infinita de regras por objeto. O desvio é manter a conectividade
genérica (pontos de contato distintos, sem citar objeto) e deixar o resto ao
crítico por unidade. Se o crítico e a pessoa divergirem de forma sistemática, o
plano para e volta à pessoa.

## Fechamento

A preencher.

## Depois deste plano

O candidato principal é [as partes do braço](congelados/2026-09-26-as-partes-do-braco.md),
congeladas em 2026-09-29 e que voltam quando este plano fechar. A ponte entre o
esboço e o Mecanifica também fica para depois, e exige decidir antes como o
módulo, independente do núcleo, entrega o esqueleto de montagem sem importá-lo.
