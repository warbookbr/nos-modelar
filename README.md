# Mecanifica

Oficina procedural para IA criar, organizar, inspecionar, medir e corrigir
objetos 3D mecânicos. O repositório reúne o núcleo geométrico, receitas
determinísticas, bancada de inspeção e ferramentas de validação necessárias para
a IA evoluir peças e montagens de qualquer domínio mecânico.

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
**montagem**. Montagens podem conter outras montagens e formar sistemas e
máquinas inteiras, sem limite declarado de profundidade.

Nenhuma máquina composta deve ser uma receita monolítica, por maior que seja o
conjunto. A IA deve conseguir trabalhar em um alvo reduzido, escolher quais
componentes observar juntos, manter acesso às dependências e revalidar as
montagens afetadas depois de uma alteração.

O mapa de composição, relações e dependências deve ser dado estruturado do
sistema, não apenas documentação manual. MCP, CLI e API são possíveis portas de
acesso; nenhuma delas substitui o núcleo ou define o modelo de autoria.

Leia [`docs/mecanifica/AUTORIA-IA.md`](docs/mecanifica/AUTORIA-IA.md) para a
definição completa e
[`docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md`](docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md)
para a direção de composição.

## Ferramentas centrais

Duas ferramentas que vale nomear aqui porque não são óbvias pelo nome do
arquivo, e `docs/mecanifica/INDEX.md` (ver "Desenvolvimento" abaixo) tem o
resto:

- **motor de prancha** (`tools/mecanifica/prancha.mjs`, skill
  `desenhar-prancha`) — desenha o CONTORNO de referência de um invólucro em 2D
  (vistas lateral, frontal, traseira, superior), antes de existir geometria 3D,
  e mede a própria saída (contorno fechado, curvatura, landmarks).
  `tools/mecanifica/comparar-alvo.mjs` sobrepõe esse desenho ao resultado
  modelado, para checar se um bate com o outro;
- **crítico visual** (`.claude/agents/critico-visual.md`) — agente sem contexto
  que só olha imagem e diz se o modelo bate com o alvo. Ver
  [`docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`](docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md)
  para o fluxo completo.

## Estado

- **Plano ativo:** [nada depende da
  bicicleta](docs/mecanifica/planos/2026-09-17-nada-depende-da-bicicleta.md).
  Guardas de navegador e testes dependem hoje de propriedades que a peça de
  acervo tem por acaso, e o plano move essa dependência para uma peça de prova
  governada pelas ferramentas, em `tools/fixtures/`.
- O núcleo, as receitas, o visor compatível, a bancada e as ferramentas de
  medição e validação estão ativos e cobertos por gates.
- Montagem persistida, contexto consultável em JSON, mapa canônico de
  dependências e revalidação em cascata existem.
- Escrita para IA existe como **perfil MCP opt-in do host**: autoria de montagem
  e de receita declarativa, com transação, revalidação condicionante, alteração
  por campo semântico, histórico e restauração. Ela não é ligada por padrão.
- Na autoria de peça, o núcleo expressa rasgo (`furo` com `ate`), perfil e
  caminho fechados (`lathe` e `loft`), posição e eixo na criação (`em`/`eixo`),
  contato derivado (`encostar`), ponto nomeado e nome de cópia no `arranja`.
- **Ainda não existem:** solver geral de encaixe, colisão geral, contrato
  genérico de materiais, revalidação automática de dependentes e vocabulário
  poligonal aberto para subdivisão e bisel em aresta arbitrária.

O que já foi decidido, aprovado ou interrompido em rodadas anteriores está em
`docs/mecanifica/planos/encerrados/` e em `docs/mecanifica/historico/`, e não é
estado atual.

## Peças são exemplos

**Nenhuma peça deste repositório é homologada, e nenhuma serve de base.**

Tudo em `prototipos/procedural/v3/pecas/` é exemplo. Cada peça existe para exercitar e
provar uma capacidade do núcleo, e nada mais. Nenhuma é referência de
engenharia, componente aprovado ou ponto de partida de produto.

Os nomes enganam de propósito pouco: `bicicleta-quadro` soa definitivo, e não
é. Medidas e proporções foram escolhidas para fazer uma capacidade passar ou
falhar, e não para descrever um componente real. O acervo já teve cinquenta
peças com nomes assim — `roda-dianteira`, `freio-disco`, `moto` — e todas foram
apagadas quando deixaram de provar alguma coisa.

O que este repositório sustenta é **o núcleo e as capacidades provadas**. A
geometria das peças pode mudar ou ser removida a qualquer momento, sem aviso e
sem migração. Se uma mudança boa no núcleo exigir refazer uma peça de exemplo,
refaça a peça — ela nunca foi o contrato.

### O consumidor externo não governa este repositório

Peças exportadas para `pecas-resolvidas/` são lidas pelo repositório do
produto, o que as torna dado de integração e **não** lhes dá poder de veto
aqui. Hoje o manifesto está vazio e nenhuma peça é exportada; a regra vale para
quando voltar a haver.

Nenhuma decisão deste repositório precisa ser adiada, reduzida ou recusada
porque mudaria um arquivo exportado. O foco é o trabalho da IA ao criar,
inspecionar e corrigir peças — melhorar o núcleo e as ferramentas de autoria
vale mais do que manter estável uma geometria de exemplo.

Quando uma mudança alterar o dado exportado, o procedimento é **avisar**, não
pedir permissão: registre no PR o que mudou e siga. Compatibilidade com o
consumidor é assunto dele, na hora em que ele decidir atualizar.

Esta regra vale por escrito, e hoje **não** existe gate que a imponha. Houve um:
um selo obrigatório no topo de cada receita, um modelo para copiar e um teste
que comparava o selo byte a byte. Os três saíram juntos em `c78961f`, quando o
acervo não homologado foi removido e o catálogo publicado passou a ser vazio —
não fazia sentido policiar o selo de peças que tinham deixado de existir.

O acervo foi repovoado depois, com outras peças, e o selo não voltou. Quem
retomar essa exigência precisa decidir as três coisas juntas: o texto do selo, o
modelo a copiar e o gate que confere. Enquanto isso, a seção acima é o contrato,
e cabeçalho de peça é convenção de autoria, não verificação automática.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
npm run criar -- bicicleta-quadro
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`.

Comece por [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md). Ele aponta
fontes de verdade, leitura por tarefa, comandos e gates. O inventário completo
está em [`docs/MAPA.md`](docs/MAPA.md).

Documentos em `docs/nos-herdado/` descrevem o NÓS, e os de
`docs/mecanifica/historico/` descrevem resultados já medidos. Nenhum dos dois
autoriza trabalho novo. Em caso de divergência, `docs/mecanifica/` prevalece.

## Licença e origem

O código permanece sob a licença [MIT](LICENSE). O histórico Git original foi
preservado para comparação e contribuições futuras.
