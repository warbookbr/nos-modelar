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

- **motor de prancha** (`tools/mecanifica/prancha/prancha.mjs`, skill
  `desenhar-prancha`) — desenha o CONTORNO de referência de um invólucro em 2D
  (vistas lateral, frontal, traseira, superior), antes de existir geometria 3D,
  e mede a própria saída (contorno fechado, curvatura, landmarks).
  `tools/mecanifica/comparar-alvo.mjs` sobrepõe esse desenho ao resultado
  modelado, para checar se um bate com o outro;
- **crítico visual** (`.claude/agents/critico-visual.md`) — agente sem contexto
  que só olha imagem e diz se o modelo bate com o alvo. Ver
  [`docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md`](docs/mecanifica/usar/REFERENCIA-E-CRITICA-VISUAL.md)
  para o fluxo completo.

## Módulos

`modulos/` guarda ferramentas isoladas, cada uma com `package.json`, `src/` e
`tests/` próprios. Um módulo não importa o núcleo procedural; a única exceção
hoje é o esboço, que lê o avaliador de expressões do núcleo, como explica o
README dele. O nome não tem relação com o bloco `modulos` do JSON do esboço, que
guarda partes reutilizáveis dentro de um esboço.

- [`contorno-da-imagem`](modulos/contorno-da-imagem/) mapeia as partes de uma
  imagem de referência e tira o contorno de cada uma em milímetro;
- [`esboco`](modulos/esboco/README.md) desenha um objeto em formas primitivas a
  partir de um JSON declarativo, com gate de contato e condutor por unidades;
- [`exportador-cad`](modulos/exportador-cad/) converte a malha neutra para
  formatos CAD;
- [`exportador-obj`](modulos/exportador-obj/) exporta Wavefront OBJ com partes
  nomeadas para Unreal Engine e Blender;
- [`otimizador-malha`](modulos/otimizador-malha/) reduz a malha de saída sem
  mudar a silhueta;
- [`preparo-micropoligono`](modulos/preparo-micropoligono/) deixa a malha densa
  pronta para motores de micropolígono;
- [`topologia`](modulos/topologia/) diz o que há de errado no traçado de uma
  malha, sem reescrevê-la.

## Estado

Cada afirmação aqui tem endereço. Se uma delas não puder ser conferida pelo
comando ou arquivo citado, ela está desatualizada e vale o que o comando diz.

**O que o motor sabe fazer.** As operações estão listadas com intenção,
schema de argumentos e custo em
[`docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md`](docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md),
que é gerado do registro do motor por `npm run catalogo:gerar` e conferido por
`catalogo:check`; o número delas é o que o catálogo diz, e por isso não é
repetido aqui. O catálogo é a fonte da convenção de cada operação; receita de
exemplo não é. Para autoria de peça isso inclui rasgo passante (`furo` com
`ate`), perfil de revolução e caminho fechado (`lathe` e `loft`), posição e eixo
na criação (`em`/`eixo`), contato derivado em vez de coordenada digitada
(`encostar`), união e corte de sólidos, ponto nomeado e nome de cópia no
`arranja`, e portas de encaixe cilíndricas, anulares, de plano de apoio, de
padrão de furos e de trilho, com folga por classe de ajuste da ISO 286.

**O que ainda não existe.** Não há solver geral de encaixe: a montagem deriva a
pose de uma peça a partir de uma porta da vizinha, sem resolver um conjunto de
restrições. Não há verificação geral de colisão nem de movimento: a montagem
audita interseções e contato entre sólidos parados. Não há contrato genérico de
materiais. A subdivisão, o bisel em aresta escolhida, o corte em anel e a edição
proporcional estão num plano
[congelado](docs/mecanifica/planos/congelados/2026-09-17-vocabulario-poligonal-da-bancada.md)
por decisão de fila, e não por terem sido refutados; ele volta quando uma peça
precisar, com medida, de uma dessas formas, e o
[plano das ferramentas de modelagem](docs/mecanifica/planos/congelados/2026-10-07-as-ferramentas-de-modelagem.md)
deve reabri-lo quando chegar ao arredondamento de arestas escolhidas e à
superfície suave. Intenção que o catálogo não resolve vira registro de lacuna
pelo formato de
[`LACUNAS-DE-CAPACIDADE-V1.md`](docs/mecanifica/LACUNAS-DE-CAPACIDADE-V1.md); ela
não autoriza inventar operação dentro da receita.

**O que segura a qualidade.** Os gates estão listados em `tools/gates.mjs` e
repetidos em `.github/workflows/ci.yml`, e rodam de uma vez por `npm run gates`.
`reguas:check` reprova quando os dois não batem, então gate que existe só no
script local não existe. Eles vão de tipo e teste às guardas de navegador que
dirigem a bancada de verdade, mais a varredura do acervo, os limites de
documentação, o teto de leitura obrigatória e os documentos gerados (catálogo,
ferramentas por objeto e banco de provas). Gate que passa aqui e falha no CI, ou
o contrário, está medindo a máquina e não o repositório, e isso é defeito do
gate.

**O que existe além da peça.** Montagem persistida com contexto consultável em
JSON, mapa canônico de dependências e revalidação em cascata; a direção e os
formatos estão em `docs/mecanifica/MONTAGEM-PERSISTIDA-V1.md` a `V4.md` e
`CONTEXTO-MONTAGEM-IA.md`. A escrita por IA existe como perfil MCP opt-in do
host, em `tools/mcp/perfis/`, com transação, revalidação condicionante,
alteração por campo semântico, histórico e restauração. Nenhum perfil de escrita
é ligado por padrão.

**O que o acervo tem agora.** O braço robótico, em
`procedural/pecas/braco-robotico/`, com base, anel da cintura, ombro e tambor do
ombro; o resto das partes está no plano
[congelado](docs/mecanifica/planos/congelados/2026-09-26-as-partes-do-braco.md).
`guarda:acervo` varre o acervo, mede cada peça e reprova a que tiver peça
atravessando peça, ponta solta ou plano de modelagem faltando. A peça de prova em
`tools/fixtures/acervo/` existe para as guardas de navegador terem o que abrir e
não é exemplo de forma.

**O plano ativo** é [o caminho curto da
IA](docs/mecanifica/planos/2026-10-07-o-caminho-curto-da-ia.md), e
`planos:check` confere o estado dos planos contra
`docs/mecanifica/planos/README.md`.

O que já foi decidido, aprovado ou interrompido em rodadas anteriores está em
`docs/mecanifica/planos/encerrados/` e em `docs/mecanifica/historico/`, e não é
estado atual.

## Peças são exemplos

**Nenhuma peça deste repositório é homologada, e nenhuma serve de base.**

Tudo em `procedural/pecas/` é exemplo. Cada peça existe para exercitar e
provar uma capacidade do núcleo, e nada mais. Nenhuma é referência de
engenharia, componente aprovado ou ponto de partida de produto.

Os nomes enganam de propósito pouco: um nome como `roda-dianteira` soa
definitivo, e não é. Medidas e proporções são escolhidas para fazer uma
capacidade passar ou falhar, e não para descrever um componente real. O acervo
já teve cinquenta peças com nomes assim, e todas foram apagadas quando deixaram
de provar alguma coisa. Hoje ele está sem peça, declarado em
`procedural/pecas/ACERVO-SEM-PECA.md`, e as ferramentas se provam
contra a peça de prova em `tools/fixtures/acervo/`.

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
npm run criar -- <nome-da-peca>
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
