# Contrato da família

`mecanifica.familia@1` é o formato do `familia.json` que cada pasta `procedural/familias/<id>/` traz. Uma família é uma peça paramétrica que a IA chama por parâmetros em milímetro, graus ou contagem, e o contrato diz o que ela aceita, o que recusa e o que publica. O desenho está na seção "Desenho da fatia 9" do [contexto das ferramentas de modelagem](CONTEXTO-FERRAMENTAS-DE-MODELAGEM.md#desenho-da-fatia-9). Este documento descreve só o contrato e o validador; `chamar`, `derivar`, a varredura e a aprovação são tarefas seguintes da mesma fatia.

O validador é `lerFamilia` em `src/autoria/familia.js`, puro e sem nenhum import. Ele recusa com `ErroFamilia`, cuja mensagem traz o campo, o valor recebido e o que é aceito, e devolve a leitura normalizada e congelada: parâmetros, restrições, portas, ferramentas e perguntas saem em ordem alfabética, de modo que a mesma família escrita em outra ordem dá o mesmo texto. O schema JSON da estrutura é gerado do mesmo arquivo (`SCHEMA_FAMILIA`) e entra no índice de `docs/mecanifica/gerado/schemas-autoria-3d.json`, conferido por `autoria:schemas:check`. O schema confere forma e vocabulário; faixa, padrão dentro da faixa e restrição ficam no validador, como nos outros contratos. Uma família de prova está em `tools/fixtures/familia-de-prova/familia.json`.

## Campos

Todos são obrigatórios, salvo `esboco`, e campo fora desta lista é recusado.

- `formato`: `mecanifica.familia@1`.
- `id`: minúsculas com hífen entre as palavras, igual ao nome da pasta.
- `versao`: versão semântica `x.y.z`.
- `nivel`: `componente` ou `objeto`. O objeto é uma montagem v5 gerada pela família; o componente é uma peça.
- `parametros`: objeto indexado pelo nome do parâmetro (minúscula inicial, só letras e dígitos, e fora dos nomes das funções da restrição). Cada parâmetro declara `tipo` (`numero` ou `inteiro`), `unidade` (`mm`, `graus` ou `contagem`), `padrao`, `minimo`, `maximo` e `medio`. A unidade `contagem` exige o tipo `inteiro`, e só ela o usa, então os quatro valores de uma contagem são inteiros. O mínimo é estritamente menor que o máximo, e o padrão e o ponto médio ficam dentro da faixa, extremos incluídos.
- `restricoes`: lista, possivelmente vazia, de `{ id, expressao, motivo }`. A expressão compara duas somas por `<`, `<=`, `>` ou `>=`, com números, nomes de parâmetro, `+ - * /`, parênteses, menos unário e as funções `abs`, `min`, `max`, `sqrt`, `sin`, `cos`, `tan` e `atan2` (ângulos em graus). Cada restrição tem um só comparador; uma condição composta vira restrições separadas, cada uma com o seu motivo, que é o texto da recusa. A restrição só cita parâmetros da família, e o padrão e o ponto médio (todos os parâmetros no valor médio) a satisfazem, porque senão a própria família não chamaria o seu ponto aprovado. Divisão por zero e raiz de negativo contam como restrição violada. `avaliarRestricao(restricao, valores)` calcula uma restrição e é o que o `chamar` usará.
- `portas`: lista, possivelmente vazia, de `{ id, tipo, papel }`, no vocabulário do núcleo. O `tipo` é a forma da interface (`anel`, `cilindro`, `padraoFuros`, `plano` ou `trilho`) e o `papel` é o dela (`anel` e `padraoFuros`: `recebe` ou `ocupa`; `cilindro`: `externa` ou `interna`; `plano`: `recebe` ou `apoia`; `trilho`: `guia` ou `deslizador`). O `id` é o mesmo que a receita publica no passo `publicarPorta`. A geometria da porta vem da composição na chamada; o contrato só declara que ela existe.
- `ferramentas`: ao menos uma, do vocabulário de [`ferramentas-por-objeto.json`](ferramentas-por-objeto.json), sem repetir.
- `perguntas`: objeto de componente para a lista de perguntas do crítico sobre ele, ao menos um componente e uma pergunta, sem repetir pergunta num componente.
- `esboco`: `{ componente, mapa }`, opcional. O componente é o nome do componente do esboço de mesmo nome, e o mapa leva o nome do parâmetro do componente ao nome do parâmetro da família que o comanda. Com `opcoes.componentes` (`{ nome: [parâmetros] }`), o validador confere também que o componente e os parâmetros do mapa existem; a conferência do componente expandido contra o envelope e as portas da família é a tarefa 5.

## Vocabulário conferido

O arquivo do validador não importa nada, então repete a lista de ferramentas e a tabela de papéis por tipo de porta. O teste `src/autoria/familia.test.js` confere a lista contra `ferramentas-por-objeto.json`, os tipos contra `FORMAS_DE_PORTA_DO_ANDAIME` e cada par tipo e papel contra `resolverPortasDeMontagem`, que aceita o par e recusa o papel de outro tipo; assim o vocabulário não se afasta do núcleo sem o teste falhar.
