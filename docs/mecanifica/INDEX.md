# Comece aqui — contexto da Mecanifica

Este é o ponto de entrada para pessoas e agentes. Ele responde o que o produto é,
onde está, qual documento manda em cada assunto e onde procurar código. O
inventário completo do repositório continua sendo gerado em
[`docs/uso/MAPA.md`](../uso/MAPA.md); este arquivo é a camada curta de
orientação e decisão.

## Resumo em um minuto

A Mecanifica será uma oficina 3D interativa para explicar a clientes como os
sistemas de um carro funcionam, o que falhou e o que pode acontecer quando um
reparo é adiado. O projeto reutiliza o núcleo procedural do NÓS, mas constrói uma
aplicação nova em Three.js.

Estado atual:

- as fases 0 a 4 e o primeiro ciclo de implementação estão concluídos (a
  hierarquia navegável de partes ficou adiada, sem bloquear o critério);
- a ponte para Three.js e a bancada de inspeção estão publicadas;
- a bancada provou seleção semântica, isolamento, contexto fantasma, vistas
  reproduzíveis e explosão automática;
- o drone herdado foi usado para encontrar e corrigir um defeito real de
  identidade e forma no trem de pouso;
- o freio a disco dianteiro existe como conjunto paramétrico por partes
  semânticas, com prancha multivista e testes de integridade;
- a fase 4 foi encerrada: o freio dianteiro direito aparece em uma carroceria
  contextual no galpão, com foco, carro fantasma, isolamento e explosão também
  acessíveis em mobile;
- a roda dianteira foi autorada e revisada separadamente na bancada; ela
  substitui a roda decorativa do canto dianteiro direito sem duplicar o cubo;
- um experimento isolado de roda mais realista provou que a Oficina atual passa
  do low-poly, mas ainda entrega realismo técnico/procedural; ele não foi
  integrado, e o fluxo resultante está documentado em perfis de autoria;
- a Fundação de autoria v1 (ciclo 2) está **concluída** desde 31 de julho de
  2026: proteção mínima de salvamento da Oficina, `origem` universal e portas
  semânticas, com as três condições do gate verificadas item por item;
- o contrato de autoria já foi provado FORA do vocabulário automotivo: a fixture
  `prototipos/fps/v3/pecas/_jardineira.js` (jardineira de janela com uma muda)
  usa os cinco geradores novos e **oito** portas semânticas, com 0 face sem
  identidade e 0 órfão, e mediu onde o contrato ainda para (A-18 a A-20);
- o ciclo "Endereços semânticos v1" está **concluído** desde 31 de julho de
  2026: A-18, A-19, A-20 e A-22 resolvidos, cada um com prova em peça real. Os
  geradores com numeração fechada citam o eixo que já tinham, o eixo aceita
  parâmetro e as palavras `'primeira'`/`'ultima'`, o núcleo devolve as portas
  publicadas e a régua as mostra;
- o ciclo "Arranjos semânticos v1" (ciclo 3, O-13) está **concluído**, núcleo e
  peça, desde 31 de julho de 2026: entrou a op `arranja`, nos modos radial e
  linear, sempre estrutural, com cada cópia endereçável por identidade. A dívida
  A-23 (palavra reservada de extremidade engolindo parâmetro homônimo) foi paga
  junto. As três dívidas menores do ciclo foram pagas depois: o painel de portas
  da bancada ganhou prova de navegador (`npm run guarda:portas`, no CI); o teste
  que comparava uma função com ela mesma virou afirmação de identidade; e a roda
  experimental **foi reescrita** — 141 parâmetros → 43, os cem de coordenada →
  zero, 66 passos → 47, com cada um dos dez braços virando uma parte nomeada e
  isolável. A peça de exercício `prototipos/fps/v3/pecas/_cerca-e-flor.js` prova
  os dois modos do arranjo fora do vocabulário automotivo. A reescrita achou
  A-24: `arranja` copia UMA origem, e o `cilindro` não sabe dizer "a primitiva
  inteira";
- **o ciclo 4, "Corte e orientação de seção v1", está EM EXECUÇÃO.** Ele é o
  antigo candidato "Realismo geométrico v1", com escopo fechado em duas
  capacidades gerais, e as DUAS já estão de pé no núcleo:
  `orientacao` no `loft` — o autor declara a direção da seção em vez de herdar o
  frame implícito do gerador (A-25, UP-020) —, e a op `furo` (A-27, UP-021), a
  primeira SUBTRAÇÃO do núcleo: um furo cilíndrico numa face plana e convexa,
  passante ou cego. `furo` não é uma booleana genérica, e isso é decisão: toda
  face que ele cria é endereçável pela origem `furo` e toda face que ele destrói
  entra num registro de consumo que faz a citação seguinte gritar. A peça de
  exercício `prototipos/fps/v3/pecas/_prateleira-furada.js` prova a op fora do
  vocabulário automotivo (prateleira com parafuso passante, cavilha cega e
  puxador vazado), com 0 face sem identidade e 0 órfão. Nenhuma peça de PRODUTO
  usa nenhuma das duas capacidades, e um segundo furo na mesma face ainda não
  existe (A-26);
- A-15 **não** foi resolvido: a guarda impede a entrega silenciosa, mas a
  Oficina continua sem saber emitir referência semântica;
- caminhada, novos sistemas, narrativa e realismo F3 seguem em backlog, sem
  reabrir ciclos anteriores.

O estado detalhado e os critérios de saída ficam em
[`docs/mecanifica/PLANO.md`](PLANO.md). Se este resumo divergir do plano, o
plano prevalece.

## Hierarquia das fontes

Use esta ordem para resolver dúvidas:

1. [`docs/mecanifica/PLANO.md`](PLANO.md) — o que fazer agora e o que já foi
   concluído;
2. [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) — fronteiras, dependências
   e direção técnica;
3. [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md) — contrato para criação e
   refinamento por IA;
4. [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md) — escolha do
   fluxo visual, fidelidade, precisão, interação e orçamento;
5. [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md)
   — briefing por peça, revisão intermediária e critério para extrair uma skill;
6. [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) —
   autoria visual e experiência do cliente;
7. [`docs/mecanifica/VISAO.md`](VISAO.md) — propósito, experiência e limites do
   produto;
8. [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) — vistas
   ortogonais, partes e medidas nomeadas do primeiro sistema mecânico;
9. [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) — dificuldades
   observadas ao modelar de verdade, e as capacidades que elas justificam;
10. [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) — plano
   ordenado de mudanças na linguagem de autoria, com trade-off e custo;
11. [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) — capacidades
   reaproveitáveis no NÓS;
12. [`docs/mecanifica/RELATORIO-PONTE-THREE.md`](RELATORIO-PONTE-THREE.md) —
    evidência da primeira integração.

`README.md` apresenta o projeto ao público. `AGENTS.md` e `CLAUDE.md` resumem as
regras de trabalho, mas não substituem os documentos acima.

A prova isolada do novo fluxo está em
[`EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md), com execução e
limitações em [`RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md). Ela é
evidência, não uma peça integrada nem um roteiro concorrente.

Os conteúdos em `docs/uso/`, `docs/rumo/` e `docs/historico/` pertencem ao NÓS
herdado. Eles são referência técnica ou histórica, não roteiro da Mecanifica.

## Leia conforme a tarefa

| Tarefa | Leitura necessária |
|---|---|
| Entender produto ou decidir escopo | [`docs/mecanifica/VISAO.md`](VISAO.md) e [`docs/mecanifica/PLANO.md`](PLANO.md) |
| Alterar módulos ou dependências | [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) |
| Criar ou refinar uma peça | [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md), [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md), [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) e [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Escolher realismo ou direção visual | [`docs/mecanifica/PERFIS-DE-AUTORIA.md`](PERFIS-DE-AUTORIA.md) e [`docs/mecanifica/REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) |
| Mexer no freio a disco | [`docs/mecanifica/PRANCHA-FREIO-DISCO.md`](PRANCHA-FREIO-DISCO.md) |
| Mexer na roda dianteira | [`docs/mecanifica/PRANCHA-RODA-DIANTEIRA.md`](PRANCHA-RODA-DIANTEIRA.md); para a prova isolada, [`docs/mecanifica/EXPERIMENTO-RODA-REALISTA.md`](EXPERIMENTO-RODA-REALISTA.md) e [`docs/mecanifica/RELATO-RODA-REALISTA.md`](RELATO-RODA-REALISTA.md) |
| Trabalhar na bancada ou apresentação | [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Alterar o núcleo herdado | [`docs/uso/oficina-contrato.md`](../uso/oficina-contrato.md) e [`docs/uso/oficina-referencia.md`](../uso/oficina-referencia.md) |
| Melhorar a linguagem de autoria | [`docs/mecanifica/OFICINA-OTIMIZACOES.md`](OFICINA-OTIMIZACOES.md) e [`docs/mecanifica/ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md) |
| Preparar contribuição ao NÓS | [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) |
| Investigar decisões antigas | [`docs/uso/RECURSOS.md`](../uso/RECURSOS.md) e [`docs/uso/MAPA.md`](../uso/MAPA.md) |

Não é necessário ler todos os documentos antes de uma tarefa. Leia este índice,
o plano e somente as referências da linha aplicável.

## Estrutura principal

| Caminho | Responsabilidade |
|---|---|
| `src/` | aplicação nova da Mecanifica em Three.js |
| `src/autoria/` | adaptação neutra do núcleo procedural para renderização |
| `src/bancada/` | estúdio, câmeras, seleção, isolamento, explosão e estado por URL |
| `src/cena/` | composição visual da experiência principal |
| `src/dominio/mecanica/` | registros estáveis de sistemas automotivos, independentes do runtime Three.js |
| `src/interacao/` | interações semânticas da aplicação |
| `prototipos/fps/v3/` | Atelier herdado do NÓS, preservado durante a migração |
| `tools/mecanifica/` | testes headless dos contratos novos |
| `tools/bancadas/` | ferramentas visuais e gates herdados ou compartilhados |
| `tools/mapa/` | geração do inventário e validação da documentação |
| `docs/mecanifica/` | fontes de verdade do produto atual |
| `docs/uso/`, `docs/rumo/`, `docs/historico/` | documentação do NÓS herdado |
| `.github/workflows/` | CI e publicação no GitHub Pages |

Para localizar um arquivo específico, consulte
[`docs/uso/MAPA.md`](../uso/MAPA.md). Ele é gerado a partir do cabeçalho de cada
arquivo e cobre código e documentação sem manter uma segunda descrição manual.

## Entradas executáveis

- `index.html` — aplicação principal;
- `bancada.html` — bancada neutra de autoria e inspeção; aceita `?peca=<nome>`
  para abrir qualquer peça de `prototipos/fps/v3/pecas/`;
- `prototipos/fps/v3/jogo.html` — Atelier herdado;
- `https://warbookbr.github.io/nos-mecanifica/` — publicação da aplicação;
- `https://warbookbr.github.io/nos-mecanifica/bancada.html` — bancada publicada.

Desenvolvimento local:

```bash
npm ci
npm run dev
```

Inspeção sem navegador — dirige a bancada pela URL e salva PNG por vista, para
que uma sessão headless possa ver o que está modelando:

```bash
npm run bancada -- --listar
npm run bancada -- drone-inspecao --vistas=direita,frontal
npm run bancada -- drone-inspecao --selecionadas=lente --modo=isolar --focar
```

Conferência em número, sem foto — imprime caixa, centro, dimensões e faces por
parte semântica, e a folga ou interpenetração entre pares de partes. Foto não
tem escala nem eixo; esta é a régua:

```bash
npm run descrever -- freio-disco
npm run descrever -- freio-disco --partes=disco,pastilhaInterna,pistao
npm run descrever -- roda-dianteira
npm run descrever -- _jardineira --estrito
npm run descrever -- _cerca-e-flor --estrito
npm run descrever -- _prateleira-furada --estrito
```

Prova de comportamento no navegador — dirige a Oficina headless e clica nos
botões de verdade. Guarda escrita no código não é guarda provada: ela pode estar
num caminho que o botão não percorre (foi o que aconteceu com o A-15):

```bash
npm run guarda:salvar
npm run guarda:portas
```

`npm run guarda:portas` é a mesma ideia do outro lado da ferramenta: dirige a
bancada pela URL e afirma sobre o DOM renderizado que a peça com portas mostra as
oito portas e que a peça sem portas não mostra a seção. O painel do A-20 vive em
`src/bancada/main.js`, que nenhum arquivo de teste importa; sem esta prova ele
podia ser apagado inteiro com os outros gates verdes.

Verificação completa:

```bash
npm test
npm run typecheck
npm run build
npm run gabarito:selecao:check
npm run id-cru:check
npm run guarda:salvar
npm run guarda:portas
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
```

`npm run id-cru:check` é o gate do O-4: peça **nova** que enderece geometria por
id posicional reprova. Cobre as **seis** formas de coleção que o núcleo lê —
`faces:[ids]`, `sel:{v}`, `sel:{f}`, `vs:[ids]` (`pesar`), `pontos:[{f}]`
(pincel livre) e `de:[ids]` (`mescla`) —, contando **id**, não passo. As formas
singulares (`face`, `v`, `a`/`b`, `para`) ficam fora, declarado no cabeçalho da
ferramenta. A chave `de` tem dois contratos desde o O-12 e só um é id cru: o
`de:{op,id,...}` do `publicarPorta` é origem estrutural, irmã de `sel:{origem}`,
e o gate distingue pela FORMA — objeto plano com `op` e `id` não conta. As peças herdadas ficam numa lista explícita e versionada em
`tools/bancadas/id-cru-herdado.json`, com a contagem exata congelada — a dívida
não cresce e, quando é paga, `npm run id-cru` encolhe a lista. A Oficina ainda
produz referências posicionais em ferramentas exploratórias, mas agora recusa
salvá-las no funil `salvarPeca`, antes do POST e antes do fallback de download —
provado pelo **botão real** com `npm run guarda:salvar`, que também fecha a porta
dos fundos do gancho `window.__oficina.salvar()`. A regra de "o que é
referência posicional" mora num módulo só,
`prototipos/fps/v3/motor/referencia-posicional.js`, importado pela Oficina, pelo
gate e pelo harness: ela viveu copiada em três lugares e divergiu duas vezes na
chave `de`, e a última divergência fazia a Oficina recusar peça que o CI aprova
(A-22, resolvido). Ver [`ATRITOS-AUTORIA.md`](ATRITOS-AUTORIA.md).

Algumas ferramentas específicas do Atelier estão catalogadas em
[`docs/uso/RECURSOS.md`](../uso/RECURSOS.md).

## Fluxo para uma sessão nova

1. Leia este arquivo e `docs/mecanifica/PLANO.md`.
2. Confirme a árvore de trabalho antes de editar.
3. Leia somente os documentos indicados para a tarefa.
4. Preserve as fronteiras entre núcleo, Three.js, domínio automotivo e interface.
5. Faça uma prova visível ou mensurável.
6. Rode os gates proporcionais ao risco.
7. Atualize plano, índice e registro upstream quando o estado real mudar.

## Estado e próximo ciclo

O ciclo 1 terminou na Fase 4. `index.html` contém a prova encerrada: carroceria
simplificada, galpão mínimo, registro semântico, modos
carro/contexto/isolar, seleção por parte e explosão autoral do freio. A roda
experimental permanece somente como evidência de autoria.

O ciclo 2, “Fundação de autoria v1”, fechou em 31 de julho de 2026. O ciclo 2b,
“Endereços semânticos v1”, fechou no mesmo dia e pagou a dívida que a
verificação daquele fechamento tinha medido (A-18, A-19, A-20 e A-22). A
conferência dos dois gates, condição por condição, e a lista de comandos da
verificação completa estão em [`PLANO.md`](PLANO.md).

O ciclo 3, “Arranjos semânticos v1”, fechou em 31 de julho de 2026, no núcleo e
na peça: `arranja` radial e linear, cada cópia endereçável por identidade, a
dívida A-23 paga junto e, no fechamento, a roda experimental reescrita e a peça
de exercício `_cerca-e-flor` provando os dois modos fora do vocabulário
automotivo. Ele **não** levou a op a nenhuma peça de produto: `freio-disco.js`
não foi tocada, e o prisioneiro de roda e a aleta de ventilação continuam não
modelados.

**Próxima entrega: o ciclo 4, “Corte e orientação de seção v1”, aberto no
[`PLANO.md`](PLANO.md).** Ele substitui o candidato “Realismo geométrico v1” e
carrega duas capacidades gerais escolhidas pela crítica da roda. As duas estão
entregues no núcleo, com teste, mutação e conferência no navegador: a orientação
declarada da seção do `loft` (`orientacao`) e a op `furo`, passante e cega. A
segunda tem peça de exercício; nenhuma das duas foi levada a peça de PRODUTO.

## Manutenção desta documentação

- Mude `docs/mecanifica/PLANO.md` quando o estado das fases mudar.
- Mude este índice quando mudar a estrutura principal, a hierarquia documental
  ou a próxima entrega.
- Dê a todo arquivo novo um cabeçalho que descreva sua responsabilidade.
- Rode `npm run mapa` depois de criar, remover, renomear ou mudar o cabeçalho de
  um arquivo.
- Rode `npm run docs:links:check` para garantir que toda documentação continue
  alcançável a partir deste índice.
