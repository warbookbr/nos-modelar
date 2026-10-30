# Modelar — entrada atual

Este repositório mantém a oficina procedural para IA: núcleo geométrico,
receitas determinísticas de peças, bancada de inspeção e ferramentas de medição,
revisão e validação.

O objetivo é melhorar e facilitar o trabalho da IA ao criar, organizar,
inspecionar, corrigir e manter objetos 3D mecânicos. Interface humana, jogo,
narrativa e apresentação externa não definem o escopo. A Oficina humana, a
aplicação jogável e o som foram removidos desta árvore. `bancada.html` é a única
aplicação publicada aqui.

## Entrada

A entrada de qualquer tarefa é o `CLAUDE.md`, o contrato mínimo, e
`npm run comecar -- <roteiro>`, que diz o que ler. Este índice é a leitura do
roteiro `mudar/plano`; criar, inspecionar, corrigir ou auditar uma peça segue o
roteiro de modelar e a porta [`usar/README.md`](usar/README.md). O que está
encerrado vive em
[`historico/README.md`](historico/README.md)
(`docs/modelar/historico/README.md`) e não governa trabalho novo.

## Estado atual

- Ativo: nenhum. O sucessor escolhido é o [furgão realista](planos/2026-10-30-furgao-realista.md), em rascunho. [Ajustes no núcleo dos veículos](planos/encerrados/2026-10-21-ajustes-no-nucleo-dos-veiculos.md) fechou em 2026-10-30. [Renomear para Modelar](planos/encerrados/2026-10-25-renomear-para-modelar.md) fechou em 2026-10-28. [Bateria rápida e retorno cedo](planos/encerrados/2026-10-27-bateria-rapida-e-retorno-cedo.md) fechou em 2026-10-28. [Leitura por demanda e limpeza](planos/encerrados/2026-10-22-leitura-por-demanda-e-limpeza.md) fechou em 2026-10-27, com a entrada por perguntas e o repositório sem as áreas que ninguém usava. [Carroceria por rede de curvas](planos/encerrados/2026-10-24-carroceria-por-rede-de-curvas.md) fechou em 2026-10-25 com o nível oficial de carroceria. [Veículos de referência livre](planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md) fechou em 2026-10-20 com 27 veículos de licença livre sem exigência de crédito aprovados pela pessoa. [Objetos externos](planos/encerrados/2026-10-19-objetos-externos-como-familias.md) fechou em 2026-10-20 com 19 peças. [Receitas com material e textura](planos/encerrados/2026-10-19-receitas-com-material-e-textura.md) fechou em 2026-10-19. [Importar objeto de código](planos/encerrados/2026-10-15-importar-objeto-de-codigo.md) fechou em 2026-10-16, e [gates em poucos minutos](planos/encerrados/2026-10-16-gates-em-poucos-minutos.md) fechou no mesmo dia, com a bateria padrão abaixo de 5 minutos.
- A [exportação CAD/STEP modular](./planos/encerrados/2026-08-28-exportacao-cad-step.md)
  entregou `modulos/exportador-cad/`, `modulos/exportador-obj/` e as CLIs
  `npm run exportar:step` e `npm run exportar:obj`. O STEP sai por
  `occt-wasm@4.3.2`, MIT/Apache-2.0 com `.wasm` LGPL-2.1 consumido como pacote
  separado, o que não muda a licença deste repositório. Detalhe em
  [`DOSSIE-EXPORTACAO-CAD-STEP.md`](DOSSIE-EXPORTACAO-CAD-STEP.md) e prova em
  [`RELATORIO-EXPORTACAO-CAD-STEP-R00.md`](./historico/RELATORIO-EXPORTACAO-CAD-STEP-R00.md).
- `npm run ativar:bancada` carrega peça ou montagem na bancada e sincroniza a
  sessão; o estado é local e não versionado. Procedimento em
  [`ATIVACAO-BANCADA-SESSAO-ATIVA.md`](./usar/ATIVACAO-BANCADA-SESSAO-ATIVA.md);
  hospedagem estática e isolamento de rede em
  [`ARQUITETURA-SESSAO-E-SEGURANCA.md`](ARQUITETURA-SESSAO-E-SEGURANCA.md).
- Os invariantes e os roteiros de leitura por intenção são dados em
  [`roteiros/roteiros.json`](roteiros/roteiros.json). Dele saem as regras e a
  lista de roteiros do `CLAUDE.md` (entre marcadores) e a página
  [`roteiros/ROTEIROS.md`](roteiros/ROTEIROS.md), geradas por
  `npm run roteiros:gerar` e conferidas pelo gate `leitura:obrigatoria`;
  `npm run comecar -- <roteiro>` e a ferramenta MCP `comecar` devolvem o
  roteiro com o passo seguinte lido do estado.
- O banco de provas versionado e o registro de custo do plano de modelagem vivem em
  [`banco-de-provas/BANCO-DE-PROVAS.md`](banco-de-provas/BANCO-DE-PROVAS.md)
  (`docs/modelar/banco-de-provas/BANCO-DE-PROVAS.md`).

A crônica dos planos concluídos e cancelados está em
[`planos/encerrados/README.md`](planos/encerrados/README.md)
(`docs/modelar/planos/encerrados/README.md`): evidência consultável, não
governa trabalho novo.

## Direção estabelecida

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas e
máquinas inteiras, sem limite declarado de profundidade.

Máquina composta não é receita monolítica. A IA deve trabalhar em alvos
reduzidos, escolher quais componentes observar juntos, manter o contexto
estrutural e revalidar as montagens afetadas depois de uma alteração.

Composição, relações e dependências devem existir como dado estruturado do
sistema. Documentação e diagramas podem ser gerados desse mapa, mas não podem
ser sua única fonte de verdade.

MCP, CLI, API ou edição assistida são portas possíveis. Nenhuma delas substitui
o núcleo nem define o modelo de autoria.

## Estrutura principal

| Caminho | Papel |
|---|---|
| `procedural/nucleo/` | núcleo procedural e adaptadores compatíveis |
| `procedural/pecas/` | uma pasta por peça: receita, referências, plano e rodadas |
| `modulos/` | ferramentas isoladas (esboço, contorno da imagem, exportadores), cada uma com o próprio README |
| `bancada.html`, `src/bancada/` | bancada: inspeção para a IA, edição para a pessoa |
| `src/autoria/` | núcleo headless: topologia, alvo, descrição do gesto, adaptadores |
| `tools/bancadas/` | porteiro e harness de render das fixtures |
| `tools/modelar/` | gates da bancada, revisão e contratos |
| `tools/mcp/` | adaptador MCP sobre serviços existentes; hoje principalmente leitura |
| `docs/modelar/planos/` | contrato de planos, programas e backlog aberto |
| `docs/modelar/historico/` | evidências encerradas, sem autoridade nova |
| `docs/modelar/blender/` | [Blender](blender/README.md) externo e opcional, com fluxo de modelagem |

Montagem persistida v1 tem contrato e resolvedor em `src/autoria/` e provas em
`tools/modelar/fixtures/montagens-persistidas/`; o mapa global de dependências
tem contrato em `MAPA-CANONICO-DEPENDENCIAS.md` e serviços em `src/autoria/`. Não
invente uma localização por implicação.

Qual documento manda em cada assunto está na lista de fontes de verdade, em
[`INVENTARIO.md`](INVENTARIO.md) (`docs/modelar/INVENTARIO.md`): listar 21
fontes é inventário, não porta de entrada.

## Leitura por tarefa

A leitura por assunto saiu desta página para [`LEITURA-POR-TAREFA.md`](LEITURA-POR-TAREFA.md). Cada roteiro de [`roteiros/ROTEIROS.md`](roteiros/ROTEIROS.md) já diz o que ler antes de começar; a página nova serve quando nenhum deles cobre a pergunta.

Carroceria: [`modelar-veiculos.md`](modelar-veiculos.md) e [`modelar-carroceria.md`](modelar-carroceria.md).

## Comandos principais

```text
npm test
npm run typecheck
npm run build
npm run porteiro
npm run exportar:check
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
npm run descrever:gesto -- <ajuste.json>   # e npm run absorver -- <ajuste.json>
npm run diario
```

`descrever:gesto` diz o que a pessoa desenhou na bancada e onde mexer na receita;
`absorver` mede se a reescrita chegou. Em
[`AJUSTE-DA-BANCADA.md`](./usar/AJUSTE-DA-BANCADA.md).

`npm run diario` lê o diário da oficina, que as ferramentas do laço gravam
sozinhas: onde o tempo foi, o que foi repetido sem a receita mudar, que erro se
repete e o que saiu 0 sem entregar. Desligar: `MODELAR_DIARIO=0`.

Antes de tornar o repositório público, ou depois de reescrever o histórico,
`npm run historico:conferir` lê cada versão de cada arquivo que algum ref
alcança e recusa termo proibido, malha 3D e caminho da lista de caminhos
proibidos que tenha ficado num commit antigo. Ele não entra na bateria, porque lê
o histórico inteiro (43 s em 2026-10-28).

## Gates completos

```text
npm run gates
```

A lista vive em `tools/gates.mjs`, conferida contra o `ci.yml`. Cada gate roda
só se algo do que ele lê mudou desde a última rodada verde dele, os baratos
antes, e uma falha entre eles para a bateria; o pesado fica para o CI;
`--completo` roda tudo, e
`npm run gates:vigiar` adianta o trabalho enquanto se edita. O envio vai a um
ramo `claude/**` ou `envio/**`; o CI roda a lista inteira dividida entre
máquinas e só então avança a main.

O gate de vazamento (`tools/arquitetura/termos-proibidos.test.mjs`) pede a chave
da lista em `MODELAR_CHAVE_TERMOS_ARQUIVO=<arquivo fora do repositório>`; sem
ela, ignora esses casos com aviso, e o CI reprova.

## Corrigir um defeito

Um defeito relatado no núcleo, numa ferramenta ou num gate se corrige sem plano
quando a correção devolve o que o código e a documentação já prometem. Primeiro
vem o teste que falha pelo defeito, o que já existe ou um novo ao lado do código
(`procedural/nucleo/operacoes/<operação>.test.ts` no núcleo); depois a correção
na origem, sem mudar o teste para caber nela, e o teste passando. `docs/MAPA.md`
diz o que cada arquivo faz. Se a correção muda o que uma peça do acervo gera, ou
pede um comportamento que nada prometia, ela vira plano. O relato diz se o
processo teria pego o defeito sozinho e, quando não, o que falta.

## Pendências atuais

- O plano ativo, o rascunho aberto e os congelados estão em
  [`planos/README.md`](planos/README.md) e na pasta
  [`congelados/`](planos/congelados/README.md).
- O sucessor escolhido pela pessoa em 2026-10-30 é o furgão realista; a carcaça
  da empilhadeira continua candidata, com o
  [alinhamento](banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) parado
  na ordem de montagem.
- O que foi pesquisado e ainda não entra no código fica no
  [módulo de pesquisa](../../modulos/pesquisa/README.md).
- `alinhar` e variantes nomeadas seguem recusados; `loft` fechado já existe.
  Medida e critérios em `planos/BACKLOG.md`.

Nenhuma pendência desta lista autoriza implementação automática.

## Histórico e inventário

Resultados encerrados ficam em [`historico/README.md`](historico/README.md), os
planos fechados em [`planos/encerrados/README.md`](planos/encerrados/README.md) e
as decisões do NÓS em `docs/nos-herdado/`. Nenhuma delas autoriza trabalho novo.

A lista comentada de documentos e as fontes de verdade estão em
[`INVENTARIO.md`](INVENTARIO.md); o inventário mecânico é gerado em
[`../MAPA.md`](../MAPA.md), nunca à mão.
