# Reorganização da documentação por uso

**Estado:** concluído

**Decisão:** aprovar — F0 a F4 e F6 executadas; F5 recusada com custo medido,
que era uma das duas saídas previstas.

**Responsável:** Claude

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em
`4ba67037c9099a7550cd892cfae776eb6a258df6`

**Rastreio das fases:**
[`../REORGANIZACAO-POR-USO-PROGRESSO.md`](../../historico/REORGANIZACAO-POR-USO-PROGRESSO.md)
(`docs/mecanifica/historico/REORGANIZACAO-POR-USO-PROGRESSO.md`)

## Problema observado

O `CLAUDE.md` manda ler `INDEX.md` e `planos/README.md` antes de planejar: 962
linhas, e o INDEX aponta para 158 documentos. Medições feitas sobre a `main` em
`4ba6703`:

- existem **81 documentos** em `docs/mecanifica/`, e as cinco skills de uso
  citam **8**;
- classificados por nome: **27 são relatórios encerrados**, ~14 servem para
  **usar** o Mecanifica e ~42 servem para **desenvolvê-lo**;
- dos 51 planos, **42 estão concluídos** e dividem pasta com o único ativo;
- `GOTCHAS-AUTORIA-VISUAL.md` é declarado leitura obrigatória e **nenhuma skill
  aponta para ele**;
- `GOTCHAS-MODELAGEM-PROCEDURAL.md` repete 7 dos seus 12 achados com outro nome.

A consequência é que quem só vai criar uma peça atravessa o mesmo acervo de quem
vai mexer no núcleo, e quem escreve regra nova não sabe se ela já existe.

## Resultado

Uma IA que só usa o Mecanifica lê uma porta curta e a skill da tarefa, sem
atravessar o material de desenvolvimento; uma IA que desenvolve entra por
`INDEX.md` com o histórico fora do caminho; e gates impedem que a separação
volte a vazar.

## Estrutura alvo

| pasta | para quem | conteúdo |
| --- | --- | --- |
| `docs/mecanifica/usar/` | quem usa | contratos e regras de autoria de peça |
| `docs/mecanifica/` (raiz) | quem desenvolve | arquitetura, dossiês, capacidades |
| `docs/mecanifica/historico/` | ninguém, por padrão | relatórios encerrados |
| `docs/mecanifica/planos/` | quem desenvolve | somente ativo, pronto e rascunho |
| `docs/mecanifica/planos/encerrados/` | consulta | concluídos e cancelados |
| `docs/mecanifica/planos/congelados/` | consulta | congelados, com gatilho escrito |

**Decisão registrada:** a raiz de `docs/mecanifica/` passa a ser a área de
desenvolvimento em vez de ganhar uma pasta `desenvolver/`. O usuário pediu três
pastas; eu troquei uma delas por "a raiz", e o motivo é risco: 95 arquivos citam
os documentos que vão sair do lugar. Mover 42 documentos de desenvolvimento
somaria a maior parte desse risco sem mudar nada da exposição — quem desenvolve
já entra pelo INDEX. A F5 reavalia essa troca depois que o resto estiver verde,
quando o custo real for conhecido em vez de estimado.

## Incluído

- mover relatórios encerrados e planos encerrados;
- criar `usar/` com porta curta e mover para lá o que serve a quem usa;
- gates que sustentam a separação;
- roteamento por tarefa no `CLAUDE.md`;
- fundir os dois registros de gotchas em um.

## Excluído

- reescrever conteúdo de documento que só muda de pasta;
- criar categoria nova de documento;
- tocar em código de núcleo, receita, bancada ou exportador.

## Gates de saída

Cada gate roda no CI e reprova sozinho.

- **G1 — direção.** Documento em `usar/` não cita a raiz de `docs/mecanifica/`
  nem `planos/`. Se precisar, um dos dois está na pasta errada.
- **G2 — histórico não governa.** Documento vivo não cita `historico/` como
  fonte de regra. Citação como evidência é permitida e declarada.
- **G3 — sem órfão em `usar/`.** Todo documento em `usar/` é citado por ao menos
  uma skill. Este gate é o que teria pego o `GOTCHAS-AUTORIA-VISUAL` órfão.
- **G4 — planos por pasta.** `planos:check` passa a varrer subpastas: valida
  estado e limite de linhas em todas, e aceita `ativo`, `pronto` e `rascunho`
  somente na raiz. Hoje a subpasta é invisível ao gate, então plano guardado
  deixa de ser conferido — defeito que este plano corrige de passagem.
- **G5 — teto das portas.** `usar/README.md` até 60 linhas; `INDEX.md` até 200.
- **G6 — o de sempre.** `docs:links:check`, `mapa:check`, `docs:toc:check` e a
  suíte continuam verdes em cada fatia.
- **G7 — link relativo também conta.** Achado na F1: `docs:links:check` só
  confere caminhos `docs/<...>.md` e é cego a link relativo de markdown, que é a
  forma mais usada. A `main` já carregava 26 links relativos quebrados com todos
  os gates verdes. O gate passa a resolver link relativo também.

## Fatias

Cada fatia entra sozinha, verde, e pode ser a última se a seguinte se mostrar
cara demais.

### F0 — medir antes de mexer

Registrar no documento de progresso o inventário atual: quantos documentos por
categoria, quantas referências apontam para cada um que vai se mover, e o
resultado dos gates antes de qualquer mudança. Sem esse retrato não há como
provar depois que nada se perdeu.

### F1 — histórico para fora do caminho

Mover os 27 relatórios encerrados para `historico/`, que já existe e já tem
índice, e os 42 planos concluídos ou cancelados para `planos/encerrados/`.
Corrigir as referências. G2 entra aqui.

Boa parte das citações a esses arquivos vem de planos que se movem junto, então
a correção é menor que os 147 apontamentos brutos sugerem — a F0 mede quanto.

### F2 — a pasta de uso

Criar `usar/` e mover para lá o que serve a quem usa, começando pelos 8
documentos que as skills já citam. Escrever `usar/README.md` como porta curta:
o que é, o que a IA pode fazer, para onde ir por tarefa. Atualizar as cinco
skills para apontarem para os caminhos novos.

Os documentos de fronteira discutível **não** entram por decisão minha: viram
lista no documento de progresso, com minha recomendação para cada um, e o
usuário decide. Já identificados: `AUTORIA-IA.md` (667 linhas, provavelmente as
duas coisas) e os `PRANCHA-*.md`, que parecem exemplo e não regra.

### F3 — os gates que seguram

Implementar G1, G3, G4, G5 e G7. Cada gate entra com o teste que o vê reprovar
antes de vê-lo passar: gate que nunca foi visto vermelho é decoração, e este
repositório já registrou essa falha.

### F4 — roteamento e fusão dos gotchas

`CLAUDE.md` passa a rotear por tarefa em vez de mandar todo mundo ao INDEX.
Fundir `GOTCHAS-MODELAGEM-PROCEDURAL.md` em `GOTCHAS-AUTORIA-VISUAL.md`,
preservando os 5 achados que só existem no primeiro e sem perder nenhum registro
de falha. O resultado vai para `usar/`, e G3 obriga a skill a citá-lo.

### F6 — encurtar o INDEX

Criada na F3, quando o G5 nasceu reprovando o próprio INDEX: 665 linhas contra
o teto de 200. Quase tudo é narrativa de plano já encerrado, que pertence a
`planos/encerrados/` e a `historico/`, não à porta. Ao fechar, o teto do G5 cai
de catraca para os 200 de meta.

### F5 — decidir sobre a pasta `desenvolver/`

Com F1–F4 verdes, medir quanto custaria mover os 42 documentos de
desenvolvimento para `desenvolver/`. Se o custo for mecânico, executar; se
espalhar por código e teste, registrar a recusa com o número medido e encerrar
o plano assim. As duas saídas são conclusões válidas.

## Condição de parada

Se a F1 quebrar referência que não se corrija mecanicamente — citação em código,
teste ou evidência congelada — a execução para, o achado vai para o documento de
progresso, e a decisão de continuar volta ao usuário. Reorganização que exige
reescrever evidência encerrada deixou de ser reorganização.

## Passivo declarado

A branch `claude/revisar-plano-ativo-cyj8c3` tem o seu próprio plano ativo, a
modelagem dirigida, e uma pasta `congelados/` já criada. Quando ela voltar para
a `main`, dois planos disputariam o estado `ativo`. Este plano se encerra antes
disso: ele é curto e não depende da modelagem. Se as duas coisas se cruzarem, o
plano ativo é o da modelagem e este passa a `concluído` no estado em que estiver,
com as fatias abertas registradas no documento de progresso.

O Actions não está alocando runner desde 31/08 — todo run morre em segundos sem
executar passo. Enquanto isso durar, cada fatia é provada localmente com a suíte
e os gates completos, e isso fica dito no commit em vez de sugerir que o CI
aprovou.
