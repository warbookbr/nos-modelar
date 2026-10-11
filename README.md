# Mecanifica

Oficina procedural para IA criar, organizar, inspecionar, medir e corrigir
objetos 3D mecânicos: núcleo geométrico, receitas determinísticas, bancada de
inspeção e ferramentas de validação.
[Abrir a bancada](https://warbookbr.github.io/nos-mecanifica/bancada.html), a
única aplicação publicada.

## Como se trabalha

A unidade geométrica editável é a **peça**, gerada por receita. A unidade de
composição é a **montagem**, que pode conter outras montagens até formar uma
máquina inteira, e nenhuma máquina é uma receita única: a IA trabalha num alvo
reduzido, observa os componentes que escolhe, mantém as dependências e
revalida as montagens afetadas depois de cada alteração. Composição, relações e
dependências são dado estruturado do sistema, e MCP, CLI e API são portas para
ele. A definição completa está em
[`docs/mecanifica/AUTORIA-IA.md`](docs/mecanifica/AUTORIA-IA.md).

## Ferramentas

- **esboço** ([`modulos/esboco`](modulos/esboco/README.md), skills
  `esboco-detalhado` e `laco-do-esboco`): desenha o objeto inteiro em formas
  primitivas a partir de um JSON, com gate de contato, Condutor por estágios e
  crítico cego, antes da peça procedural; a referência do JSON se consulta por
  tópico com `npm run esboco -- --ajuda`.
- **motor de prancha** (`tools/mecanifica/prancha/prancha.mjs`, skill
  `desenhar-prancha`): desenha em 2D o contorno de referência de um invólucro
  antes de existir geometria 3D, e `tools/mecanifica/comparar-alvo.mjs` o
  sobrepõe ao resultado modelado.
- **crítico visual** (`.claude/agents/critico-visual.md`): agente sem contexto
  que só olha imagem e diz se o modelo bate com o alvo.
- [`contorno-da-imagem`](modulos/contorno-da-imagem/): tira de uma imagem de
  referência o contorno de cada parte, em milímetro.
- [`exportador-cad`](modulos/exportador-cad/) e
  [`exportador-obj`](modulos/exportador-obj/): exportam a malha neutra para STEP
  e para OBJ com partes nomeadas.
- [`otimizador-malha`](modulos/otimizador-malha/),
  [`preparo-micropoligono`](modulos/preparo-micropoligono/) e
  [`topologia`](modulos/topologia/): reduzem a malha sem mudar a silhueta,
  preparam malha densa para motores de micropolígono e apontam defeitos de
  traçado.

Os módulos em `modulos/` têm `package.json`, `src/` e `tests/` próprios e não
importam o núcleo procedural, exceto o esboço, que lê o avaliador de expressões.

## Estado

As operações do motor estão em
[`docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md`](docs/mecanifica/gerado/CATALOGO-CAPACIDADES.md),
gerado do registro do motor, e o catálogo é a fonte da convenção de cada uma.
Não existem ainda solver geral de encaixe, verificação de colisão em movimento
nem contrato genérico de materiais, e o vocabulário poligonal (subdivisão,
bisel, corte em anel) está num
[plano congelado](docs/mecanifica/planos/congelados/2026-09-17-vocabulario-poligonal-da-bancada.md).
Intenção que o catálogo não resolve vira registro de lacuna pelo formato de
[`LACUNAS-DE-CAPACIDADE-V1.md`](docs/mecanifica/LACUNAS-DE-CAPACIDADE-V1.md),
e não operação inventada dentro da receita.

Além da peça existem a montagem persistida, o mapa canônico de dependências, a
revalidação em cascata e um perfil MCP de escrita que vem desligado. O acervo tem
o braço robótico, em `procedural/pecas/braco-robotico/`. Os gates rodam de uma
vez por `npm run gates`, e `reguas:check` reprova quando a lista local e a do CI
divergem. Não há plano ativo: [as ferramentas de
modelagem](docs/mecanifica/planos/encerrados/2026-10-07-as-ferramentas-de-modelagem.md) fechou em 2026-10-11.

## Peças são exemplos

**Nenhuma peça deste repositório é homologada, e nenhuma serve de base.** Cada
uma existe para provar uma capacidade do núcleo, com medidas escolhidas para
isso, e pode mudar ou sair sem aviso nem migração. O contrato do repositório é
o núcleo e as capacidades provadas, e uma mudança boa no núcleo que quebre uma
peça de exemplo se resolve refazendo a peça.

Peças exportadas para `pecas-resolvidas/` são lidas pelo repositório do
produto, mas ele não tem veto aqui: quando uma mudança alterar o dado exportado,
registre no PR o que mudou e siga. Hoje nenhuma peça é exportada, e nenhum gate
impõe essa regra.

## Desenvolvimento

```bash
npm ci
npm run dev
npm run build
npm test
npm run criar -- <nome-da-peca>
npm run descrever:montagem:persistida -- --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir>
```

Abra `http://localhost:5173/nos-mecanifica/bancada.html`. A leitura de cada
tarefa está nos [roteiros](docs/mecanifica/roteiros/ROTEIROS.md), a entrada de
quem muda o projeto é [`docs/mecanifica/INDEX.md`](docs/mecanifica/INDEX.md) e o
inventário completo é [`docs/MAPA.md`](docs/MAPA.md). Os documentos de
`docs/nos-herdado/` e de `docs/mecanifica/historico/` descrevem o NÓS e
resultados já medidos e não autorizam trabalho novo.

## Licença e origem

O código está sob a licença [MIT](LICENSE). O histórico Git original foi
preservado para comparação e contribuições futuras.
