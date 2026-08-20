# Mecanifica

Oficina procedural para IA criar, organizar, inspecionar, medir e corrigir
objetos 3D mecânicos. O repositório reúne o núcleo geométrico, receitas
determinísticas, bancada de inspeção e ferramentas de validação necessárias para
a IA evoluir peças, montagens, carros e, futuramente, robôs.

## Acesso

- [Abrir a bancada](https://warbookbr.github.io/nos-mecanifica/bancada.html) —
  seleção, isolamento, contexto fantasma, explosão e vistas reproduzíveis.

`bancada.html` é a única aplicação publicada. A Oficina humana, a aplicação
jogável e o som foram removidos porque não ampliavam o trabalho de modelagem da
IA neste repositório.

## Objetivo

O objetivo é melhorar e facilitar o trabalho da IA durante todo o ciclo de
autoria:

```text
entender o alvo
→ criar ou alterar a definição
→ executar o núcleo
→ observar e medir o resultado
→ validar relações
→ corrigir
→ revalidar os conjuntos afetados
```

A unidade geométrica editável é a **peça**. A unidade de composição é a
**montagem**. Montagens podem conter outras montagens e formar sistemas, carros
completos e, depois que esse modelo estiver maduro, robôs.

Carro e motor não devem ser receitas monolíticas. A IA deve conseguir trabalhar
em um alvo reduzido, escolher quais componentes observar juntos, manter acesso
às dependências e revalidar as montagens afetadas depois de uma alteração.

O mapa de composição, relações e dependências deve ser dado estruturado do
sistema, não apenas documentação manual. MCP, CLI e API são possíveis portas de
acesso; nenhuma delas substitui o núcleo ou define o modelo de autoria.

Leia [`docs/mecanifica/AUTORIA-IA.md`](docs/mecanifica/AUTORIA-IA.md) para a
definição completa e
[`docs/mecanifica/MONTAGENS-SEMANTICAS.md`](docs/mecanifica/MONTAGENS-SEMANTICAS.md)
para a direção de composição.

## Ferramentas centrais

Duas ferramentas que vale nomear aqui porque não são óbvias pelo nome do
arquivo, e `docs/mecanifica/INDEX.md` (ver "Desenvolvimento" abaixo) tem o
resto:

- **motor de prancha** (`tools/mecanifica/prancha.mjs`, skill
  `desenhar-prancha`) — desenha a referência ortográfica de uma carroceria antes
  de existir geometria 3D, e mede a própria saída (contorno fechado, curvatura,
  landmarks). `tools/mecanifica/comparar-alvo.mjs` sobrepõe esse desenho ao
  resultado modelado;
- **crítico visual** (`.claude/agents/critico-visual.md`) — agente sem contexto
  que só olha imagem e diz se o modelo bate com o alvo. Ver
  [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md)
  para o fluxo completo.

## Estado

- O **fluxo de autoria** foi homologado nos Casos 1 e 2, e a série foi encerrada
  aí. O que esses casos aprovam é o processo — briefing, execução na bancada,
  medição e revisão. A peça usada em cada caso continua sendo exemplo, como
  todas as outras: homologar o fluxo nunca homologou geometria.
- **Plano executivo ativo:** [plataforma procedural extensível e
  descobrível](docs/mecanifica/planos/2026-08-18-plataforma-procedural-extensivel.md).
  A R00 está mapeando a linha de base e as dependências do motor antes da
  extração modular. O plano cria núcleo pequeno, registro tipado, módulos,
  grafo de capacidades, subgrafos reutilizáveis, extensões verificáveis e
  descoberta Agent-First, sem manter cópia `legacy` ou segundo executor.
- O núcleo, as receitas, o visor compatível, a bancada e as ferramentas continuam
  ativos.
- Montagem persistida v1/v2/v3, contexto JSON consultável, mapa canônico de
  dependências e revalidação em cascata persistida existem e foram aprovados.
- Escrita para IA existe como **perfil MCP opt-in do host**: autoria de montagem
  e de receita declarativa, com transação, revalidação condicionante, alteração
  por campo semântico, histórico e restauração. Ela não é ligada por padrão.
- O Módulo 1 do MCP, de leitura e auditoria, foi aprovado. A primeira tentativa
  de autoria controlada de pacotes foi encerrada com decisão `interromper`; o
  PR #25 foi fechado sem merge.
- Na autoria de peça, o núcleo expressa rasgo (`furo` com `ate`), perfil e
  caminho fechados (`lathe` e `loft`), posição e eixo na criação (`em`/`eixo`),
  contato derivado (`encostar`), ponto nomeado e nome de cópia no `arranja`.
- **Ainda não existem:** solver geral de encaixe, colisão geral, contrato
  genérico de materiais e revalidação automática de dependentes.
- O visor legado resolve `earcut` também nos servidores estáticos locais.

## Peças são exemplos

**Nenhuma peça deste repositório é homologada, e nenhuma serve de base.**

Tudo em `prototipos/procedural/v3/pecas/` é exemplo. Cada peça existe para exercitar e
provar uma capacidade do núcleo, e nada mais. Nenhuma é referência de
engenharia, componente aprovado ou ponto de partida de produto.

Os nomes enganam de propósito pouco: `roda-dianteira`, `freio-disco`, `moto` e
`drone-inspecao` soam definitivos, e não são. Medidas e proporções foram
escolhidas para fazer uma capacidade passar ou falhar, não para descrever um
componente real.

O que este repositório sustenta é **o núcleo e as capacidades provadas**. A
geometria das peças pode mudar ou ser removida a qualquer momento, sem aviso e
sem migração. Se uma mudança boa no núcleo exigir refazer uma peça de exemplo,
refaça a peça — ela nunca foi o contrato.

### O consumidor externo não governa este repositório

Duas peças são exportadas para `pecas-resolvidas/` e lidas pelo repositório do
produto. Isso as torna dado de integração, e **não** dá a elas poder de veto
aqui.

Nenhuma decisão deste repositório precisa ser adiada, reduzida ou recusada
porque mudaria um arquivo exportado. O foco é o trabalho da IA ao criar,
inspecionar e corrigir peças — melhorar o núcleo e as ferramentas de autoria
vale mais do que manter estável uma geometria de exemplo.

Quando uma mudança alterar o dado exportado, o procedimento é **avisar**, não
pedir permissão: registre no PR o que mudou e siga. Compatibilidade com o
consumidor é assunto dele, na hora em que ele decidir atualizar.

Por isso toda peça abre com o mesmo selo, nestas palavras e nesta posição:

```js
/* PEÇA DE EXEMPLO — NÃO HOMOLOGADA, NÃO É BASE DE PROJETO.
 *
 * Todas as peças de `prototipos/procedural/v3/pecas/` são exemplos. Elas existem para
 * exercitar e provar capacidades do núcleo, e nada mais. Nenhuma é referência de
 * engenharia, componente aprovado ou ponto de partida de produto.
 *
 * Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
 * falhar, não para descrever um componente real. Esta geometria pode mudar ou
 * ser removida a qualquer momento, sem aviso e sem migração.
 *
 * O que este repositório sustenta é o núcleo e as capacidades provadas — nunca
 * a geometria daqui. Ver "Peças são exemplos" no README.md.
 */
```

O selo é a primeira coisa do arquivo porque um aviso que aparece depois da
receita não é aviso. Peça nova sem selo **reprova** em
`tools/bancadas/pecas-sao-exemplos.test.ts`, que também recusa selo reescrito
por conta própria — o padrão vale byte a byte, comparado com `_modelo.js`.

Ao criar uma peça, copie `_modelo.js`: o selo vem junto.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
npm run criar -- _viga
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`.

Comece por [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md). Ele aponta
fontes de verdade, leitura por tarefa, comandos e gates. O inventário completo
está em [`docs/uso/MAPA.md`](docs/uso/MAPA.md).

Documentos em `docs/uso/`, `docs/rumo/` e `docs/historico/` descrevem o NÓS ou
resultados históricos. Não autorizam trabalho novo. Em caso de divergência,
`docs/mecanifica/` prevalece.

## Licença e origem

O código permanece sob a licença [MIT](LICENSE). O histórico Git original foi
preservado para comparação e contribuições futuras.
