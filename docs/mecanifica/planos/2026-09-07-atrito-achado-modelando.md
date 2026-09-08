# Atrito achado modelando

**Estado:** ativo

**Responsável:** execução por agente

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `6ef6188`

## Problema observado

Modelar uma bicicleta de ponta a ponta — entrando pela porta documentada, usando
a skill, medindo e olhando — produziu oito atritos. Nenhum apareceu em gate:
todos os dezenove estavam verdes antes, durante e depois. Eles aparecem só
quando alguém usa o sistema para fazer uma peça nova.

Três são graves porque **falham em silêncio ou enganam quem confia**:

1. **`transladar` aceita chave errada calado.** Escrever `por:` em vez de `d:`
   translada por zero — sem erro, sem órfão, sem uma linha. A peça sai no lugar
   errado e nada acusa. As CLIs proíbem exatamente isso em `argumentos.mjs`
   ("nunca vira no-op silencioso"); a regra não alcança argumento de passo.
2. **A paleta de `--cores` não separa 24 partes.** O crítico visual cego —
   instrumento em que o laço confia para julgar forma — devolveu **duas
   críticas falsas de cinco**: disse que faltava o tubo inferior, que existe e
   está medido, e leu garfo e tirante como uma peça só. As cores eram `#eb8ec5`
   e `#dd8eeb`. O julgamento visual depende de uma separabilidade que a
   ferramenta não garante e não confere.
3. **Nenhuma medida vê oclusão.** As rodas foram feitas com dois cilindros
   concêntricos, e a leitura de anel foi *prometida* "pela diferença de raio".
   O cilindro externo é maciço e engoliu aro, cubo e raios. `descrever
   --estrito` limpo, malha aprovada, identidade perfeita — e as rodas eram dois
   discos chapados. Só a imagem pegou.

Os outros cinco custam rodada sem enganar: `npm run malha:conferir -- <peça>`,
como a skill manda escrever, responde "receita não encontrada" porque não usa o
resolvedor de nome curto; `npm run parametros -- --acervo` diz "acervo inteiro"
varrendo só `pecas/` e `maquinas/`, e ignora `armas/` e `extensoes/`;
`resolverCaminhoReceita` tem a mesma lacuna; `buscar_capacidades` devolve zero
para "tubo cilindro caminho" e um para "cilindro", sem dizer que o termo a mais
zerou a busca; e a referência de operações mostra `de: TABUA` logo abaixo de
`derivaDe: TABUA`, sugerindo que os dois recebem `origemId` quando ambos querem
`{op,id}` — três rodadas até acertar.

## Resultado

Erro de escrita em passo passa a doer na hora, a imagem de auditoria passa a
denunciar quando não consegue separar as partes, e os comandos que a skill manda
escrever funcionam como escritos.

## Filtro Agent-First

- **Validação de chave em passo — REFATORAR.** Um contrato que aceita chave que
  não existe e devolve silêncio é pior que um que recusa: gasta a rodada de quem
  confiou. `schemas-operacoes.json` já declara os argumentos de cada operação.
- **Paleta de auditoria — ENVOLVER.** A razão áurea espalha matiz e é boa; o que
  falta é a segunda dimensão e um aviso quando duas partes ficarem perto demais.
- **Resolução de alvo — USAR DIRETO.** `resolverCaminhoReceita` está certo; a
  lista de pastas é que está incompleta, em dois lugares.
- **Operação "tubo entre dois pontos" — ADIAR.** É a maior lacuna que a
  bicicleta expôs e a que exige decisão própria: operação nova entra no
  vocabulário, no catálogo, nos schemas e no MCP. A evidência fica registrada.

## Incluído

- chave desconhecida em passo vira grito, com o nome aceito na mensagem;
- paleta de auditoria separável, que confere e relata a própria separação;
- `malha:conferir` e o retrato do acervo cobrindo o repositório inteiro;
- `buscar_capacidades` explicando busca que zerou;
- correção da referência sobre `de` e `derivaDe`.

## Excluído

- **operação de tubo entre dois pontos** — a lacuna maior; decisão separada;
- detector de oclusão entre partes: medir o que uma parte esconde da outra é
  problema de visibilidade, não de contato, e não cabe neste recorte;
- corrente, coroa detalhada e guidão de verdade na bicicleta — são forma, e
  forma quem aprova é o usuário.

## Invariantes

1. Nenhuma receita existente muda de geometria. A assinatura das onze peças do
   acervo antes e depois é a prova.
2. Chave desconhecida GRITA; chave conhecida e ausente continua com o padrão de
   hoje. Recusar o que hoje é válido quebraria o acervo, não o defeito.
3. A paleta não muda a decisão de ninguém: ela pinta e relata, nunca aprova.
4. A leitura obrigatória continua ≤ 70 KB.

## Rodadas

### R00 — o repositório inteiro é o acervo — **concluída**

`PASTAS_BUSCA` passou a cobrir `armas/` e `extensoes/`, e o retrato do acervo
deriva dela em vez de repetir a lista à mão — as duas não podem mais divergir.
`malha:conferir` passou a resolver nome curto, como a skill manda escrever.

**Resultado:** o acervo saiu de 139 para **189 parâmetros declarados** ao ganhar
as três receitas de `armas/`, todas com `PARAMS` decorativo. O comando dizia
"acervo inteiro" varrendo duas das quatro pastas de receita.

### R01 — chave desconhecida em passo GRITA — **concluída**

A tabela de campos aceitos já existia em `uso-operacoes.js` e já era importada
pelo núcleo; faltava conferi-la. Agora argumento fora do contrato vira órfão com
a lista do que a operação aceita, e sugestão quando o nome está a até duas
edições de um válido. `em` e `eixo` ficam de fora: são lidos pelo despacho e já
têm recusa própria, com mensagem que ensina em vez de listar chaves.

**Resultado:** `['transladar', { por: [...] }]` passou de translação silenciosa
por zero para órfão que nomeia `d`. O levantamento antes de ligar — 593 passos
em 15 receitas — achou **zero** chaves fora do contrato no acervo, então nenhuma
peça mudou de geometria.

E a porta pegou três silêncios que estavam **nos próprios testes do
repositório**, todos invisíveis até aqui: `esfera` recebia `seg`, que o motor
não lê em lugar nenhum; `plano` recebia `larg`/`prof` quando lê
`largura`/`profundidade`, e comparava dois planos padrão de 1×1 achando que
comparava dois de 0,1; e `cubo` recebia `tam`, caindo no cubo padrão. Três
testes verdes medindo geometria diferente da que declaravam.

### R02 — a paleta denuncia o que não consegue separar

Segunda dimensão na cor (a matiz sozinha não basta em 24 partes) e conferência
da distância entre as cores atribuídas. Quando duas partes ficarem perto demais,
a legenda diz quais, em vez de deixar o crítico descobrir errando.

**Gate:** na bicicleta, nenhum par de partes abaixo do limiar declarado; o par
`garfo`/`tirante`, que enganou o crítico, fica acima dele.

### R03 — busca que zera diz por quê

`buscar_capacidades` com vários termos passa a relatar qual termo não existe no
índice, e sugerir o subconjunto que teria resultado.

**Gate:** "tubo cilindro caminho" devolve zero **e** diz que 'tubo' e 'caminho'
não estão no índice e que 'cilindro' sozinho acha um.

## Riscos e parada

- **R01 é o risco real.** Se alguma receita do acervo passar hoje uma chave a
  mais, ela vira órfã e a peça quebra. Mitigação: a assinatura das onze receitas
  é o gate, e o levantamento das chaves em uso vem antes da validação.
- **Parar se** o levantamento mostrar que o acervo depende de chaves fora do
  contrato: aí o defeito é o contrato, não o silêncio, e o recorte muda.

## Fechamento

Preencher ao concluir: estado final, commit, gates, resultado observado e
candidatos devolvidos ao backlog.
