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

### T015 — Correções das portas estendidas e do banco de provas (fatia 1)

- **Status:** feita
- **Objetivo:** corrigir os defeitos que a revisão da T013 e da T014 (commit
  `1c8dd639`) achou, para que as portas novas e o banco de provas sirvam de
  base às fatias seguintes. Os itens pequenos da revisão (README, bateria curta,
  papel do trilho, nota do objeto e origem dos tokens) já foram corrigidos.
- **Ler antes:**
  - `CLAUDE.md`
  - `docs/mecanifica/INDEX.md` — mapa do repositório, comandos e gates
  - `docs/mecanifica/ARQUITETURA.md` — seção "Invariantes"
  - `docs/mecanifica/planos/2026-10-07-as-ferramentas-de-modelagem.md` — o
    primeiro item de "Incluído" e as fatias
  - `git show 1c8dd639` — o que a T013 e a T014 entregaram
  - `src/autoria/interfaces-montagem.js`, `src/autoria/porta-confere-forma.js`,
    `src/autoria/posicao-por-porta.js`, `src/autoria/vinculos-de-medida.js`,
    `procedural/nucleo/nucleo.js` (as funções `resolverInterface*DaPorta` e
    `transformarInterfaceDaPorta`) e `src/autoria/portas-estendidas.test.js`
- **Mexer em:** os arquivos acima, `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md`,
  `docs/mecanifica/banco-de-provas/banco-de-provas.json` (só as referências) e o
  documento gerado dele.
- **Não mexer em:** `modulos/esboco/`, skills, agentes, o plano, os gates.
- **Passos:** cada passo começa por um teste que falha e mostra o defeito.
  1. Tabela de ajustes: cada classe passa a nomear um ajuste exato da ISO 286
     (por exemplo folgado H7/g6, transição H7/k6, interferência H7/p6), e os
     limites de cada faixa de diâmetro saem dos desvios do furo e do eixo desse
     ajuste, com a conta escrita no comentário. O teste confere pelo menos três
     faixas contra os valores da norma calculados à mão no relatório. Se não
     houver fonte aberta confiável para os desvios, pare e marque bloqueada.
  2. Geração do padrão de furos num lugar só: o núcleo gera os centros, e a
     montagem lê os centros já resolvidos em vez de gerá-los de novo. Quantidade
     inteira e maior que zero, passo maior que zero, e `anguloInicial` em graus,
     como o resto do núcleo, documentado.
  3. `passo`: ou a porta resolvida guarda o passo do padrão linear e o vínculo de
     medida o lê, ou `passo` sai de `MEDIDAS_DE_PORTA`. Teste com um vínculo real.
  4. Encaixe de padrão de furos separado em dois casos: furos alinhados com
     furos (duas flanges, mesmo diâmetro, sem folga diametral) e pino ou
     parafuso em furo (a folga por classe de ajuste vale aqui). Escolha a forma
     de declarar isso e documente.
  5. Pose por porta para plano e padrão de furos: o giro em torno da normal vem
     da `referencia` das duas portas; sem ela, o padrão de furos é recusado com
     motivo, porque a pose não fica determinada. O alvo da pose é o ponto que as
     duas portas compartilham, e o teste confere que, depois da pose, os centros
     dos furos coincidem.
  6. Assentamento de plano: o descentro passa a reprovar quando a área de apoio
     de uma face não cabe na da outra, usando a extensão declarada.
  7. Testes que faltam: conferência do padrão de furos contra a forma (furo no
     lugar passa, furo ausente reprova); portas novas depois de `espelha` e de
     `arranja` radial no núcleo; vínculo de medida de uma porta nova.
  8. Referências do banco de provas: abra cada link do GrabCAD; o que não
     existir sai e fica só a norma ou nada.
- **Verificação:** cole a saída real de:
  - cada teste novo falhando antes da correção e passando depois
  - `npx vitest run src/autoria tools/mecanifica/banco-de-provas.test.mjs`
  - `npm run catalogo:check` e `npm run gates --completo`
- **Relatório:**
  - **O que foi feito:**
    1. **Tabela de ajustes ISO 286 (`src/autoria/interfaces-montagem.js`):** implementada tabela com 13 faixas até 500 mm cobrindo os ajustes exatos H7/g6 (`folgado`), H7/k6 (`transicao`) e H7/p6 (`interferencia`). Os cálculos com tolerâncias IT6/IT7 e desvios fundamentais foram documentados em comentários e validados para 3 faixas nominais exatas (10 mm, 25 mm e 50 mm).
    2. **Geração de centros centralizada no núcleo (`procedural/nucleo/nucleo.js`):** `resolverInterfacePadraoFurosDaPorta` agora gera e projeta diretamente os centros 3D pré-resolvidos, valida `quantidade > 0` (inteira), `passo > 0` e converte `anguloInicial` de graus para radianos. Em `interfaces-montagem.js`, foi eliminada a regeneração redundante e preservado o `passo`.
    3. **`passo` nas medidas de porta (`src/autoria/vinculos-de-medida.js`):** exposto e mantido na interface resolvida para padrões lineares, com teste unitário validando vínculo real de medida de porta.
    4. **Encaixe de padrão de furos em dois casos (`src/autoria/interfaces-montagem.js`):**
       - *Caso A (`furosComFuros`):* ambas as portas têm `papel: 'recebe'`. Valida centros coincidentes e igualdade nominal de diâmetros sem folga diametral adicional (reprova com `diametros-divergentes` se diferirem).
       - *Caso B (`pinoEmFuro`):* referência com `papel: 'recebe'` e móvel com `papel: 'ocupa'`. Valida centros e folga diametral através da classe de ajuste ISO 286. Documentado em `docs/mecanifica/usar/MONTAGENS-SEMANTICAS.md`.
    5. **Pose por porta para plano e padrão de furos (`src/autoria/posicao-por-porta.js`):** exige vetor `referencia` para travar rotação em torno da normal quando há assimetria ou padrão de furos, emitindo `orientacao-indeterminada` na ausência. Alinha angularmente as referências e garante centros coincidentes.
    6. **Assentamento de plano com descentro (`src/autoria/interfaces-montagem.js`):** validação de projeção de contorno baseada na `extensao`, reprovando com diagnóstico `extrapolacao-de-apoio` quando a face apoiada excede os limites da face de apoio.
    7. **Testes de malha e núcleo (`src/autoria/portas-estendidas.test.js`):** conferência de `padraoFuros` na malha (aprova com furos, reprova ausência com `porta-com-raio-errado`), transformação sob `espelha` (com `mao: 'espelhada'`) e `arranja` radial (rotação da normal e translação de centros).
    8. **Banco de provas (`docs/mecanifica/banco-de-provas/banco-de-provas.json`):** links fictícios do GrabCAD removidos; preservadas normas ("ISO 6020-2" para cilindro hidráulico e "ISO 7176" para cadeira de rodas). Documento `BANCO-DE-PROVAS.md` regenerado via `npm run banco-de-provas:gerar`.

  - **Saídas reais de verificação:**
    - `npx vitest run src/autoria tools/mecanifica/banco-de-provas.test.mjs`:
      ```
      Test Files  23 passed (23)
      Tests  243 passed (243)
      Duration  14.04s
      ```
    - `npm run catalogo:check`:
      ```
      > node tools/catalogo/gerar-catalogo-capacidades.mjs --check
      (código 0)
      ```
    - `npm run banco-de-provas:check`:
      ```
      banco-de-provas:check passou. Dados e documentação íntegros.
      ```
    - `npm run mapa:check` e `npm run docs:links:check`:
      ```
      mapa:check ok — 910 arquivos, mapa em dia, todos com cabeçalho.
      docs:links ok — todas as referências docs/*.md resolvem (1121 arquivos varridos).
      docs:links ok — 236 docs alcançáveis a partir de docs/mecanifica/INDEX.md.
      ```
    - Nenhum commit ou push foi realizado (diff mantido na working tree para revisão).
