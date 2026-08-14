# Registro de campo

## Preparação

- Base: `c6577879e8262eb716c31b84adae979eec7dd6aa`.
- Reserva local: `e6428cda082f`.
- As skills locais `criar-peca` e `auditar-peca` foram lidas integralmente.
- As seis descrições estritas passaram na primeira execução: zero órfãos e
  zero faces sem identidade.

## Atrito 1 — hierarquia interna não atravessa a montagem

Tentativa: a pinça declarou `garraInterna` e `garraExterna` como filhas da parte
`pinca`. `npm run descrever -- _estudo-pinca-dianteira --estrito` passou e
mostrou a árvore corretamente.

Ao resolver a montagem, `exportarPeca` recusou a pinça:

```text
exportar-peca: a peça '_estudo-pinca-dianteira' publica hierarquia de partes,
e o formato mecanifica.peca-resolvida v1 não transporta isso.
```

Adaptação: manter as três partes semanticamente distintas, mas planas, para o
restante do estudo. A geometria não mudou. Classificação preliminar:
`ENVOLVER` ou ampliar de forma versionada o transporte; não contornar no
resolvedor de montagem.

## Atrito 2 — gate visual não critica a forma

As quatro vistas do cubo foram produzidas com sucesso e todos os indicadores da
bancada ficaram verdes, porém a leitura da isométrica e da direita revelou um
halo ondulado no encontro do furo com o piloto. A causa era `liso` aplicado à
origem inteira do `lathe`, incluindo anéis planos.

Correção: suavizar somente as faixas cilíndricas 1, 3, 5 e 7. O descritor não
teria detectado o defeito; a crítica visual detectou. A skill de criação já
explica essa armadilha, mas exige que o agente carregue e aplique manualmente a
regra. Classificação preliminar: `USAR DIRETO` para as vistas e `ENVOLVER` para
uma crítica visual estruturada, pois o gate atual prova enquadramento, não
qualidade da forma.

## Atrito 3 — custo operacional das capturas

Três capturas iniciadas dentro do sandbox falharam com `listen EPERM` e
precisaram de permissão para servidor local e Chromium. Depois disso, executar
três bancadas em paralelo levou aproximadamente um minuto, enquanto duas em
paralelo concluíram em cerca de 30 a 45 segundos. A saída estruturada é boa,
mas o custo de subir Vite e navegador por peça se repete.

## Atrito 4 — a montagem não chega à bancada

A montagem raiz foi resolvida com seis peças, duas montagens filhas e quatro
relações satisfeitas. Porém:

```text
npm run bancada -- estudo-conjunto-dianteiro ...
→ bancada: peça 'estudo-conjunto-dianteiro' não existe em .../pecas/

npm run descrever:montagem -- <caminho-do-json>
→ escolha uma montagem: pino-e-luva, anel-e-faixa, roda-no-freio, aro-no-pneu
```

A bancada só carrega receitas de peça. A CLI de montagem aceita uma lista fixa
de pilotos, não uma montagem persistida arbitrária. Assim, o agente consegue
resolver relações numericamente, mas não consegue pedir uma vista do disco com
a pinça, do aro com o cubo ou do conjunto inteiro. Classificação preliminar:
`ENVOLVER` o resolvedor com descrição e renderização genéricas de montagem;
não transformar a bancada em fonte da composição.

## Atrito 5 — revisão recusa vistas naturalmente finas

O pacote oficial do disco foi preparado por `npm run preparar:modelagem`. A
revisão r001 foi recusada e preservada corretamente porque as vistas frontal e
superior ficaram com largura normalizada `0.019929` e área `0.012356`.

O disco tem apenas 16 mm de espessura e 280 mm de diâmetro; essas vistas são
naturalmente finas e estavam inteiras, não cortadas. A captura direta com
`--estrito` havia passado, mas `--revisar` rejeitou. O fluxo diagnostica e
preserva muito bem a tentativa, porém não oferece uma forma declarativa de
marcar uma vista fina esperada ou trocar a prova por uma vista mais informativa.
Classificação preliminar: `REFATORAR` o contrato de enquadramento da revisão,
sem alterar câmera ou engrossar a peça para satisfazer o gate.

## Atrito 6 — mudança local válida, conjunto fisicamente inválido

Na R001, o disco terminava em `y=0.140` e a ponte da pinça começava em
`y=0.160`: folga radial experimental de `+0.020 m`. Na R002, somente o raio
externo do disco passou a `0.165 m`; a folga virou `-0.005 m`, isto é, invasão
de 5 mm.

Na rodada original, as quatro relações persistidas continuaram satisfeitas. O
resolvedor não podia diagnosticar uma intenção ausente. Na continuidade, uma
relação v3 genérica passou a medir separação direcional entre regiões
semânticas: R001 mede `+0.020 m`; R002 mede `-0.005 m` e reprova somente essa
relação. Um mapa local também classifica, para o disco, duas relações diretas e
três indiretas. A projeção não é apresentada como colisão geral e usos fora da
raiz permanecem explicitamente desconhecidos.

## Atrito 7 — comparação existe, descoberta por CLI diverge

A documentação apresenta `comparar:revisao` com id do pacote e nomes de
revisão. A implementação atual da CLI recebe caminhos diretos para dois
`revisao.json`. Como ambas as tentativas foram corretamente rejeitadas antes
de se tornarem revisões oficiais, só existem `tentativa.json`; o comparador
oficial não as aceita.

O MCP resolve a descoberta de revisões oficiais pelo recurso
`mecanifica://pacotes`, mas não compara tentativas rejeitadas. Classificação:
`USAR DIRETO` para revisões aceitas; `REFATORAR` a documentação/descoberta da
CLI e decidir separadamente se tentativas precisam de comparação própria.

## Atrito 8 — fixtures experimentais contaminam catálogos por localização

Enquanto as seis receitas estavam em `prototipos/fps/v3/pecas/`, o catálogo
MCP passou de 37 para 43 peças e seu gate quebrou. O pacote rejeitado também
apareceu em `mecanifica://pacotes` com zero revisões.

As receitas e o pacote foram isolados dentro deste experimento. A montagem usa
um carregador local sobre o mesmo núcleo, sem publicar os modelos. Depois do
isolamento, `npm run mcp:check` passou com 36 testes e um skip. Classificação:
`USAR DIRETO` para os catálogos como guarda de superfície pública e `ENVOLVER`
as ferramentas de ensaio com entrada explícita confinada, sem inferir
publicação pela pasta.

## Síntese do MCP

O perfil atual já oferece quatro ferramentas somente leitura
(`descrever_peca`, `validar_pacote`, `comparar_revisoes` e
`renderizar_vistas`) e três recursos de descoberta. Isso é útil diretamente
para peças e revisões oficiais.

Não há serviço neutro genérico de descrição/renderização de montagem para o
MCP envolver. Expor operações elementares de `PASSOS` também não resolveria o
problema de contexto. O próximo ganho de empacotamento viria depois de existir
um serviço interno de contexto de montagem, impacto e revalidação. A crítica
visual subjetiva deve continuar com o agente consumindo imagens e métricas;
não deve virar uma falsa regra determinística do servidor.
