# Comunicação entre IAs

Canal de trabalho entre duas IAs neste repositório.

- **Planejadora** (Claude Code, sessão local): planeja e despacha tarefas.
- **Executora** (outra IA): faz o trabalho braçal e reporta aqui.

## Regras

1. A Planejadora escreve em "Tarefas". A Executora escreve só em "Relatório" da
   própria tarefa e no campo `Status`.
2. Uma tarefa por seção, numerada (`T001`, `T002`...), sem reescrever as antigas.
3. Antes de começar, a Executora lê **todos** os arquivos de "Ler antes" e o
   `CLAUDE.md`. Não lê além disso sem necessidade.
4. Não sair do escopo da tarefa. Se algo fora do escopo parecer necessário,
   parar, registrar em "Relatório" e marcar `Status: bloqueada`.
5. Rodar o que a tarefa pedir em "Verificação" e colar o resultado real,
   inclusive falhas.
6. Não fazer commit nem push, a menos que a tarefa diga.

Este arquivo é volátil: guarda só a tarefa em andamento. O histórico fica nos
commits e no plano; a Planejadora limpa a tarefa depois de revisá-la.

Status possíveis: `aberta` → `em andamento` → `feita` | `bloqueada`.

## Modelo de tarefa

```markdown
### T000 — título curto

- **Status:** aberta
- **Objetivo:** o que deve existir ao final, em uma ou duas frases.
- **Ler antes:**
  - `caminho/do/arquivo` — por que importa
- **Mexer em:** arquivos que podem ser alterados.
- **Não mexer em:** o que fica intocado.
- **Passos:**
  1. ...
- **Verificação:** comandos e o resultado esperado.
- **Relatório:** (Executora preenche: o que fez, o que rodou, o que falhou,
  dúvidas.)
```

## Tarefas

### T009 — Levantamento: IAs que geram 3D e o lugar do Mecanifica (só leitura)

- **Status:** aberta
- **Objetivo:** reunir informação pública concreta para a pessoa decidir se o
  Mecanifica continua promissor. A pergunta é: as IAs que geram 3D (Tripo,
  Meshy, Rodin/Hyper3D, Luma, modelos abertos como TRELLIS e Hunyuan3D, e
  abordagens de CAD por código) já entregam precisão mecânica, edição
  localizada e partes com relações? Ou essa lacuna continua aberta?
- **Ler antes:**
  - `README.md` — o que o Mecanifica faz (raiz do repositório)
  - `docs/mecanifica/AUTORIA-IA.md` — o ciclo de autoria do projeto
- **Mexer em:** nada do repositório. Escreva só em "Relatório".
- **Não mexer em:** qualquer arquivo.
- **Antes de tudo:** se você não tem acesso à web, escreva isso no Relatório,
  marque `Status: bloqueada` e pare. Não responda de memória.
- **Passos:**
  1. Para cada ferramenta ou abordagem, procure: o que ela gera (malha, CAD
     paramétrico, código), o que diz sobre precisão dimensional, se permite
     editar uma parte sem refazer tudo, se separa o objeto em partes, preço e
     limites de uso, e a data da informação.
  2. Procure avaliações independentes: artigos científicos, benchmarks,
     relatos de quem usou para peças mecânicas ou impressão 3D. Separe do que é
     texto de marketing das próprias empresas.
  3. Procure abordagens de "texto para CAD" ou "LLM gera código de CAD"
     (CadQuery, OpenSCAD, scripts de Blender e similares), com resultados
     medidos.
  4. Diga, com base só no que achou, onde cada abordagem supera ou perde para o
     que o Mecanifica se propõe a fazer.
- **Verificação:** cada afirmação tem link e data. Separe no texto o que foi
  medido por terceiros, o que é promessa do fabricante e o que você não
  encontrou ("não encontrei evidência de X"). Não preencha lacuna com palavras
  plausíveis.
- **Relatório:** (Executora preenche. Tabelas e listas, sem resumo longo. No
  fim, 5 linhas: o que está comprovado, o que é promessa, o que falta saber.)
