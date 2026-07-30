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

- as fases 0, 1 e 2 estão concluídas;
- a ponte para Three.js e a bancada de inspeção estão publicadas;
- a bancada provou seleção semântica, isolamento, contexto fantasma, vistas
  reproduzíveis e explosão automática;
- o drone herdado foi usado para encontrar e corrigir um defeito real de
  identidade e forma no trem de pouso;
- o próximo trabalho é a fase 3: referência multivista e conjunto paramétrico do
  freio a disco.

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
4. [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) —
   autoria visual e experiência do cliente;
5. [`docs/mecanifica/VISAO.md`](VISAO.md) — propósito, experiência e limites do
   produto;
6. [`docs/mecanifica/UPSTREAM-NOS.md`](UPSTREAM-NOS.md) — capacidades
   reaproveitáveis no NÓS;
7. [`docs/mecanifica/RELATORIO-PONTE-THREE.md`](RELATORIO-PONTE-THREE.md) —
   evidência da primeira integração.

`README.md` apresenta o projeto ao público. `AGENTS.md` e `CLAUDE.md` resumem as
regras de trabalho, mas não substituem os documentos acima.

Os conteúdos em `docs/uso/`, `docs/rumo/` e `docs/historico/` pertencem ao NÓS
herdado. Eles são referência técnica ou histórica, não roteiro da Mecanifica.

## Leia conforme a tarefa

| Tarefa | Leitura necessária |
|---|---|
| Entender produto ou decidir escopo | [`docs/mecanifica/VISAO.md`](VISAO.md) e [`docs/mecanifica/PLANO.md`](PLANO.md) |
| Alterar módulos ou dependências | [`docs/mecanifica/ARQUITETURA.md`](ARQUITETURA.md) |
| Criar ou refinar uma peça | [`docs/mecanifica/AUTORIA-IA.md`](AUTORIA-IA.md) e [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Trabalhar na bancada ou apresentação | [`docs/mecanifica/BANCADA-E-APRESENTACAO.md`](BANCADA-E-APRESENTACAO.md) |
| Alterar o núcleo herdado | [`docs/uso/oficina-contrato.md`](../uso/oficina-contrato.md) e [`docs/uso/oficina-referencia.md`](../uso/oficina-referencia.md) |
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
- `bancada.html` — bancada neutra de autoria e inspeção;
- `prototipos/fps/v3/jogo.html` — Atelier herdado;
- `https://warbookbr.github.io/nos-mecanifica/` — publicação da aplicação;
- `https://warbookbr.github.io/nos-mecanifica/bancada.html` — bancada publicada.

Desenvolvimento local:

```bash
npm ci
npm run dev
```

Verificação completa:

```bash
npm test
npm run typecheck
npm run build
npm run gabarito:selecao:check
npm run mapa:check
npm run docs:toc:check
npm run docs:links:check
```

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

## Próxima entrega

Criar a prancha de referência multivista do freio a disco e modelar o primeiro
conjunto paramétrico por partes semânticas: disco, cubo, pinça, suporte, pistão,
pastilhas e flexível. O galpão e a carroceria entram depois que esse sistema
existir e estiver validado na bancada.

## Manutenção desta documentação

- Mude `docs/mecanifica/PLANO.md` quando o estado das fases mudar.
- Mude este índice quando mudar a estrutura principal, a hierarquia documental
  ou a próxima entrega.
- Dê a todo arquivo novo um cabeçalho que descreva sua responsabilidade.
- Rode `npm run mapa` depois de criar, remover, renomear ou mudar o cabeçalho de
  um arquivo.
- Rode `npm run docs:links:check` para garantir que toda documentação continue
  alcançável a partir deste índice.
