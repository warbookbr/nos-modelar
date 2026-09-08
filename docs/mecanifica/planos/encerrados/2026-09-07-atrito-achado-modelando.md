# Atrito achado modelando

**Estado:** concluído

**Responsável:** execução por agente

**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `6ef6188`

## Problema observado

Modelar uma bicicleta de ponta a ponta — entrando pela porta documentada, usando
a skill, medindo e olhando — produziu oito atritos. Nenhum apareceu em gate:
todos os dezenove estavam verdes antes, durante e depois. Eles aparecem só
quando alguém usa o sistema para fazer uma peça nova.

Três são graves porque **falham em silêncio ou enganam quem confia**:

1. **`transladar` aceita chave errada calado.** `por:` em vez de `d:` translada
   por zero — sem erro, sem órfão, sem uma linha. As CLIs proíbem exatamente
   isso em `argumentos.mjs`; a regra não alcançava argumento de passo.
2. **A paleta de `--cores` não separa 24 partes.** O crítico visual cego devolveu
   duas críticas falsas de cinco, e as duas vinham da cor: `#eb8ec5` e `#dd8eeb`.
3. **Nenhuma medida vê oclusão.** Rodas feitas de cilindros concêntricos saíram
   discos maciços que engoliram aro, cubo e raios, com `--estrito` limpo, malha
   aprovada e identidade perfeita. Só a imagem pegou.

Os outros cinco custam rodada sem enganar: comandos que a skill manda escrever e
não funcionam como escritos (`malha:conferir` com nome curto), o retrato do
acervo varrendo duas das quatro pastas de receita, busca que zera calada, e a
referência sobre `de`/`derivaDe` lida como identificador. Cada um está detalhado
na rodada que o corrigiu.

## Resultado

Erro de escrita em passo dói na hora, a imagem de auditoria denuncia o que não
consegue separar, e os comandos que a skill manda escrever funcionam.

## Filtro Agent-First

- **Validação de chave em passo — REFATORAR.** Contrato que aceita chave
  inexistente e devolve silêncio é pior que um que recusa: gasta a rodada de
  quem confiou. A tabela de campos já existia em `uso-operacoes.js`.
- **Paleta de auditoria — ENVOLVER.** A razão áurea espalha matiz e é boa; falta
  a segunda dimensão e o aviso quando duas partes ficam perto demais.
- **Resolução de alvo — USAR DIRETO.** O resolvedor está certo; a lista de
  pastas é que estava incompleta, em dois lugares.
- **Operação "tubo entre dois pontos" — ADIAR.** Maior lacuna que a bicicleta
  expôs, e a que exige decisão própria: operação nova entra no vocabulário, no
  catálogo, nos schemas e no MCP.

## Excluído

- **operação de tubo entre dois pontos** — a lacuna maior; decisão separada;
- detector de oclusão entre partes: medir o que uma parte esconde da outra é
  problema de visibilidade, não de contato, e não cabe neste recorte;
- corrente, coroa detalhada e guidão de verdade na bicicleta — são forma, e
  forma quem aprova é o usuário.

## Invariantes — todos cumpridos

1. Nenhuma receita existente muda de geometria: o levantamento achou zero chaves
   fora do contrato antes de a validação ser ligada.
2. Chave desconhecida GRITA; chave conhecida e ausente mantém o padrão de hoje.
3. A paleta pinta e relata, nunca aprova.
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

### R02 — a paleta denuncia o que não consegue separar — **concluída**

A cor ganhou duas dimensões além da matiz, escolhidas por BUSCA e não por gosto:
oito combinações de saturação e luminosidade foram avaliadas contra as 276
distâncias de uma peça de 24 partes, maximizando a menor delas. E a captura
passou a conferir a própria legenda.

**Resultado:** os pares confundíveis caíram de **43 para 4**, e a distância
mínima subiu de 0,039 para 0,089 — acima dos 0,079 do par que enganou o crítico.
Índices vizinhos passaram de 0,079 para mais de 0,12 de separação.

**O gate como escrito NÃO foi cumprido, e não vai ser.** Ele pedia zero pares
abaixo do limiar; sobraram quatro, e são estruturais: cor estável por índice — a
promessa de que a mesma parte tem a mesma cor entre execuções, independente de
quantas partes existem — é incompatível com separação garantida quando o total
cresce. Escolher as cores em função do total separaria melhor e trocaria a cor
da peça inteira a cada parte nova, quebrando a comparação entre duas imagens da
mesma peça. A troca foi feita de olho aberto, e por isso o contrato da
ferramenta passou a ser "digo o que não separei" em vez de "separo sempre":

```text
⚠ cores próximas demais para distinguir na imagem: mesa~tuboSuperior (0.089),
  coroa~tuboSuperior (0.097), rodaTraseiraAro~tirante (0.104),
  garfo~tuboInferior (0.107). Isole essas partes por vez.
```

Dois achados de caminho. O primeiro: Three trata o resultado de `setHSL` como
linear e emite sRGB, então a cor que a bancada pinta é bem mais clara que a
conta de HSL — calibrar fora do navegador sem essa transferência calibraria uma
cor que ninguém vê. O segundo: o teste que existia cobrava luminosidade FIXA em
0,55, travando a implementação em vez do requisito — e a implementação travada
era justamente a que confundia as partes. Ele passou a cobrar o que o nome dele
sempre disse, contraste contra o fundo, com o mesmo instrumento.

### R03 — busca que zera diz por quê — **concluída**

A causa era mais simples e pior do que o plano supunha: `texto` é casado como
UMA substring do corpus, então frase com mais de uma palavra praticamente nunca
casa. Zero é resposta legítima; zero sem motivo, quando a ferramenta sabe o
motivo, é a mesma família do no-op silencioso.

**Resultado:** a busca vazia passa a devolver `diagnostico`, e a suposição do
próprio plano estava errada — `caminho` acha uma operação sozinho; só `tubo` não
está no índice:

```text
'tubo cilindro caminho' é procurado como frase única, não como conjunto de
palavras. Sozinho(s), 'cilindro' acha 1, 'caminho' acha 1; 'tubo' não está no
índice.
```

O casamento NÃO mudou. Trocar substring por conjunção mudaria o que toda
consulta existente devolve, e é decisão separada — fica no backlog, agora com o
diagnóstico para informá-la. Um termo único inexistente não recebe lição sobre
frases, e sugestão só aparece quando ela de fato acha algo: sugestão que não
funciona é pior que silêncio, porque manda a próxima rodada ao mesmo lugar com
confiança.

### R04 — a referência sobre `de` e `derivaDe` — **concluída**

O exemplo do `arranja` escrevia `derivaDe: TABUA` e `de: TABUA` sem dizer que
`TABUA` é a origem `{op,id}` e não o `origemId` cru. Lido como identificador dá
`derivaDe inválida`, e custou três rodadas. O exemplo passou a declarar a
constante, e a regra ficou escrita também para o `espelha`.

## Riscos e parada

O risco nomeado era R01 quebrar receita do acervo. Não se materializou: o
levantamento anterior à mudança achou zero chaves fora do contrato em 593
passos. Quem quebrou foram três testes, e por estarem errados.

## Fechamento

**Estado final:** concluído, decisão `aprovar`. R00–R04 entregues, 19/19 gates
verdes em cada uma.

O achado que mais rendeu não estava na lista: ligar a validação de argumento
expôs **três silêncios nos próprios testes do repositório** — `esfera` com
`seg`, `plano` com `larg`/`prof`, `cubo` com `tam`. Três testes verdes medindo
geometria diferente da que declaravam, invisíveis desde que foram escritos.

Duas suposições do plano estavam erradas e a execução corrigiu: `caminho` acha
uma operação sozinho (só `tubo` falta no índice), e o gate da paleta pedia zero
pares confundíveis, que é inalcançável com cor estável por índice.

E um defeito da bicicleta não foi achado por mim: o usuário viu tubo de direção
e tubo inferior atravessando a roda dianteira. O `descrever` havia reportado
`rodaDianteiraAro ↔ tuboDirecao interpenetra` desde a primeira medição — eu
filtrei a saída e parei de ler a tabela de relações. A ferramenta acertou;
quem parou de ler fui eu.

**Devolvido ao backlog, sem autorização automática:** a operação de tubo entre
dois pontos, que é a maior lacuna que a bicicleta expôs; trocar o casamento de
`texto` de substring para conjunção, agora com diagnóstico para informar a
decisão; e medir oclusão entre partes — nenhuma medida atual vê o que uma parte
esconde da outra, e foi por isso que duas rodas maciças passaram por
`--estrito` limpo.
