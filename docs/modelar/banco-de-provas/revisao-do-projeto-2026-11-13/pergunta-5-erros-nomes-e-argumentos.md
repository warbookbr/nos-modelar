# Pergunta 5, segunda metade: mensagens de erro, nomes e argumentos das operações

Medido em 2026-11-13 sobre o repositório como está, sem rodar gates, descrever de peça inteira nem Blender. Os scripts estão em `/tmp/claude-0/-home-user-nos-modelar/a45881b0-884a-5495-8d79-e44b78fae420/scratchpad/inventario-5b/` e nada deles entrou no repositório. O critério é o do plano: a mensagem diz o que estava errado, onde e o que fazer a seguir, sem obrigar a abrir o código. Fato medido e leitura minha vêm separados em cada seção.

## Resumo

O núcleo recusa em voz alta quase tudo o que escreve errado: das 46 operações registradas, as 46 recusam chave desconhecida com sugestão e lista, e 60 de 61 chaves obrigatórias retiradas dos exemplos oficiais foram recusadas no passo certo. Os buracos medidos são três. Dezoito operações não declaram nenhum argumento obrigatório e aceitam calados valores ausentes, zero, negativos e fracionários. Todo argumento numérico passa por um resolvedor que lança sem dizer passo nem argumento. E o nome de operação com erro de digitação é recusado sem a sugestão que a chave com erro de digitação recebe. A coerência de nomes entre operações é fraca em quatro conceitos, mas a recusa de chave errada impede que isso vire erro calado.

## 1. Mensagens de erro

Fato medido. O script `msgs.mjs` lê o código-fonte (sem testes) e extrai o texto de cada `throw new`, de cada `grita(st, passo, op, ref, motivo)` (o erro que o núcleo devolve no passo e que `neutro.orfaos` junta) e de cada `{ erro: ... }` devolvido por validadores. Comando: `SAIDA=nucleo.json node msgs.mjs procedural/nucleo procedural/extensoes` e o mesmo para `tools/modelar`. O script `classe.mjs` classifica por expressões regulares e `manual.mjs` confere à mão uma amostra. As três perguntas: V diz o valor recebido, E diz o esperado ou o limite, O diz o passo, a parte ou o argumento onde ocorreu. Em `grita` o O é verdadeiro por construção, porque o registro carrega passo, operação e argumento.

| Conjunto | Mensagens | V | E | O | V, E e O juntos | Nenhuma |
|---|---|---|---|---|---|---|
| Núcleo e extensões, por regex | 1144 (397 throw, 395 grita, 351 erro devolvido, 1 console.error) | 532 (47%) | 628 (55%) | 938 (82%) | 259 (23%) | 71 (6%) |
| Núcleo, amostra manual de 40 | 40 | 19 | 26 | 38 | 10 | 1 |
| tools/modelar, amostra manual de 59 | 59 de 60 (1 resíduo do extrator) | 31 (53%) | 35 (59%) | 52 (88%) | 16 (27%) | 4 (7%) |

A regex concorda com a leitura manual em V (47% contra 48%) e subestima E e O. Os 1144 do núcleo vêm de 404 `throw new` (397 lidos), 395 chamadas de `grita` e 351 `erro:` devolvidos. A pasta `procedural/extensoes` tem só 10 mensagens, porque a lógica das extensões mora em `procedural/nucleo/casca.js`, `friso.js` e vizinhos. Em `tools/modelar` há 597 throws e 84 `console.error`; os 26 `erro:` dali são quase todos resíduo do extrator e não contam. A amostra de tools é a semente 7 de `amostra.mjs`, 60 itens.

Os dez piores do núcleo (só descrevem o sintoma, sem valor, limite nem lugar):

| Arquivo e linha | Mensagem |
|---|---|
| procedural/nucleo/expressoes.js:38 | `oficina: parâmetro 'x' não existe em PARAMS/TOPO` (sem passo, sem argumento, sem lista dos nomes existentes) |
| procedural/nucleo/expressoes.js:115 | `oficina: valor numérico inválido: undefined` (não diz qual argumento ficou sem valor) |
| procedural/nucleo/composicoes.js:220 | `chamada de composição inválida ou duplicada` (quatro condições numa frase, sem dizer qual chamada) |
| procedural/nucleo/extensoes.js:28 | `extensão inválida` |
| procedural/nucleo/nucleo.js:2865 | `bissetriz degenerada` |
| procedural/nucleo/nucleo.js:2648 | `a partição criou um triângulo de área nula ou invertida` |
| procedural/nucleo/friso.js:319 | `a normal no ponto é nula` (qual ponto?) |
| procedural/nucleo/espessura.js:106 | `face de área nula` (a face vem em campo à parte, fora do texto) |
| procedural/nucleo/subdivisao.js:326 | `a matriz de refino do dardo não tem autovetor único para o autovalor 1` |
| procedural/nucleo/operacoes/cantos-arredondados.js:95 | `o anel da faixa vizinha margeia mais de uma face` |

Leitura minha. As linhas 2865, 2648, 319, 106 e 95 são internas: o chamador as embrulha com passo e operação, então a pessoa recupera o lugar, mas fica sem causa em termos da receita. As quatro que não são recuperadas são expressoes.js:38 e :115 (lançam fora do mecanismo de órfãos, ver seção 2), composicoes.js:220 e extensoes.js:28.

Os cinco melhores, todos com valor, limite, lugar e ação:

| Arquivo e linha | O que faz |
|---|---|
| procedural/nucleo/nucleo.js:525 | chave desconhecida: nomeia a chave, sugere a mais próxima por distância de edição e lista as aceitas |
| procedural/nucleo/casca.js:333 | diz qual seleção não fecha, quantas arestas ficaram sem par, a causa provável e `reduza a espessura` |
| procedural/nucleo/operacoes/booleanas.js:973 | diz quantas faces degeneram, a primeira, por que o raio não combina e `tente um raio menor` |
| procedural/nucleo/operacoes/geradores-avancados.js:522 | diz o giro residual em graus, a consequência e as duas saídas (ajustar o caminho ou declarar `orientacao`) |
| procedural/nucleo/operacoes/booleanas.js:1804 | diz o raio pedido, o ângulo da cunha, o recuo exigido e `diminua o raio` |

Em `tools/modelar` o padrão bom existe e é repetível: os erros com três argumentos (código, mensagem, ação), como `repositorio-autoria.mjs:209`, e as recusas de bandeira de `argumentos.mjs`, como `varrer-peca.mjs:146` (`--delta precisa ser fração entre 0 e 1, recebi '...'`). Os piores da amostra são códigos soltos sem lugar (`vao-entre-partes`, `repositorio-revalidacao`), `e.message` repassado sem contexto (`folha-comparativa.mjs:211`, `medidas-da-fonte.mjs:118`, `origens-check.mjs:55`) e `nenhuma estação com as duas bordas presentes` (`conferir-contra-referencia.mjs:182`). Uma amostra de 59 dá intervalo largo; os números valem como ordem de grandeza.

## 2. Receitas mínimas erradas, executadas

Fato medido. O caminho é o que a receita usa: `nucleo(PASSOS, PARAMS, ...)` com o registro de operações com as quatro extensões (`casos.mjs`, `silenciosos.mjs`, `semobrig.mjs`, `teto.mjs`). Cada caso levou menos de 5 ms. Rodar `descrever-peca.mjs` sobre uma receita escrita fora do repositório foi recusado pelo confinamento de caminho, então não executei o descrever nas receitas de teste e o que o `ativar-bancada.mjs` imprime foi lido no código: `passo N (op) ref: motivo`, reunido sob `o motor recusou N referência(s)`.

| Receita errada | Mensagem que sai | Bastaria para corrigir? |
|---|---|---|
| `cilindro` sem `raio` (ou `['cilindro']` sem argumentos) | nenhuma; cria cilindro de raio 0,5, altura 1, 8 lados | Não: a IA não sabe que errou |
| `transladr` no lugar de `transladar` | `operação desconhecida 'transladr'` | Em parte: nem sugestão nem lista, ao contrário do que a chave recebe |
| `raoi` no lugar de `raio` | `argumento desconhecido 'raoi'. Você quis dizer 'raio'? 'cilindro' aceita: id, origemId, raio, ...` | Sim |
| `raio: 'grande'` (nome de parâmetro que não existe) | exceção `oficina: parâmetro 'grande' não existe em PARAMS/TOPO`, sem passo | Em parte: com vários passos a IA procura o texto pela receita |
| `lados: 2`, `lados: 2.5`, `raio: -1`, `altura: 0`, `cubo lado: -1` | nenhuma; `lados` sobe para 3 e as outras geram malha degenerada ou invertida | Não |
| `subtrair` citando `{op:'cilindro', id:7}` que não existe | `origem cilindro:7 inexistente ou ainda não criada` mais um eco, `seleção vazia: nenhum alvo válido` | Sim; o eco duplica, e o `descrever` já filtra esse eco |
| `face:'topp'` na origem de um cubo | `origem inválida: cubo usa op, id e face opcional (fundo, topo, tras, direita, frente ou esquerda)` | Sim |
| `eixo:'w'` | `eixo aceita 'x', 'y' ou 'z' ...; recebido "w"` | Sim |
| `casca` com `espessura: 9` | `espessura 9 não cabe no sólido: ...; aceito: maior que 0 e menor que 0.5` | Sim |
| `PASSOS` que não é lista | `PASSOS.forEach is not a function` | Não: erro cru do JavaScript |

Duas varreduras mecânicas completam isto. Tirei, uma a uma, as 61 chaves obrigatórias dos exemplos oficiais (`obrig.mjs`): 60 foram recusadas no passo certo, a maioria citando a chave, e 1 lançou sem passo (`aparar` sem `folga`, `valor numérico inválido: undefined`). Cinco recusas dizem `'undefined'` em vez de dizer que a chave faltou (`arranja.modo`, `espelha.eixo`, `rotaciona.eixo`, `material.usa`, `pesar.osso`). E dentre as 18 operações sem obrigatório declarado (`semobrig.mjs`), `transladar` sem `d`, `moveF` sem `d`, `extruda` sem `dist`, `displace` sem argumentos, `cone`, `esfera` e `plano` vazios passaram sem uma linha.

Leitura minha. Quem escreve receita erra de preferência pelo que o núcleo cala: um argumento esquecido numa primitiva dá uma peça de tamanho padrão que parece certa até a medida. A recusa de chave com erro de digitação, que existe, não cobre isso.

## 3. Nomes e argumentos das operações

Fato medido. `ops.mjs` lê o registro (42 operações do núcleo e `casca`, `chapaDobrada`, `estruturaDeBarras`, `articulacao`) e grava o nome e as chaves de cada uma em `ops.json`; `chaves.mjs` agrupa. São 46 operações, 132 chaves distintas e 278 pares operação e chave. As 46 têm `additionalProperties: false` e `argumentoDesconhecido` (`nucleo.js:503`) as aplica na execução. Provei isso inserindo `zzchave` no exemplo de cada uma (`aninh.mjs`): 46 de 46 recusaram, 0 aceitaram calado. As exceções são `em` e `eixo`, lidos pelo despacho, que têm recusa própria boa (`eixo` em cubo, `em` em transladar). O aninhado também é recusado, com lista: `sel.zz`, `perfil.retangulo.zz`, `origem` com `op` desconhecida. Um ponto fraco: `origem: {op, idd}` diz só `origem precisa ser um objeto com op e id`, sem apontar `idd`.

Incoerências medidas, por conceito:

| Conceito | Variações medidas |
|---|---|
| Identidade do resultado | `origemId` em 25 operações, `id` (legado) em 12, `idLegado` nos schemas; 12 operações aceitam os dois |
| Referência a outra coisa | `de` com cinco sentidos: face de entrada (`furo`), face com a aresta (`arredondarAresta`, `filete`), vértices removidos (`mescla`), origem geométrica (`publicarPorta`), origem de booleana (`arredondarCostura`); `solido`, `chapa`, `solidos`, `referencia`, `usa`, `pai`, `derivaDe` nos demais |
| Seleção | `sel` em 22, `faces` em 11 (legado), `face` em 4, `v`, `vs`, `a`, `b`, `regiao`, `aresta`, `arestas` |
| Raio | `raio` em 8 operações; `raioInterno` e `raioMinimo` em outras; sem `raioMm` em lugar nenhum |
| Eixo e direção | `eixo` com quatro sentidos (criação, rotação, normal do espelho, radial do `arranja`), `direcao` (`encostar`), `orientacao` com dois sentidos (`furo` e `loft`), `normal`, `lado` |
| Distância | `d` (5 operações, `Deslocamento`), `dist` (`extruda`), `altura`, `profundidade` (eixo z em `plano`, fundo do furo cego em `furo`), `deslocar`, `folga`, `largura` e `larg`, `prof`, `lado` (aresta do cubo em `cubo`, face material em `subdivisao`) |
| Ângulo | `graus` (`rotaciona`, `arranja`), `angulo` (`liso`, abas), `tolerancia`; a articulação escolhe `graus` ou `rad` em `unidade` |

Unidades e convenções. O núcleo trabalha na unidade da peça (metro por convenção, escrito em `limparLascas` e `aberturaPorContorno`), a `estruturaDeBarras` tem `unidade` com padrão mm e a articulação tem `unidade` própria; ângulos são graus em todo o núcleo, e a única escolha de radiano é a da articulação. A ordem de eixos de `[u, v]` muda com a operação: o contorno de `aberturaPorContorno` projeta por `vista`, o `perfil` do `friso` põe `v` pela normal, o `perfil` do `lathe` e da `extrusao` tem plano próprio. Ficou como leitura, porque a conferência dos planos exigiria ler cada operação.

Nomes de operação (leitura minha, contagem por inspeção dos 46 nomes): 21 são verbo (7 no imperativo como `extruda` e `vira`, 11 no infinitivo como `unir` e `arredondarAresta`, 3 `move*`), 23 são substantivo (`cubo`, `furo`, `casca`, `friso`) e 2 são verbo em inglês (`inflate`, `displace`). Mistura ainda `chamferBox`, `lathe`, `loft`, `moveV` com português. Posicional contra nomeado: todas recebem objeto nomeado dentro de `[op, args]`, então não há argumento posicional; os vetores `[x,y,z]` e `[u,v]` são posicionais por natureza.

Padrões que a descrição não diz. Em 278 chaves, 38 trazem "padrão" na descrição. Nas onze operações com primitivas e deslocamentos (`cubo`, `cilindro`, `esfera`, `cone`, `plano`, `chamferBox`, `displace`, `rotaciona`, `moveF`, `extruda`, `transladar`) são 29 chaves e só uma (`pivo`) declara o padrão, embora o código tenha `a.raio ?? 0.5`, `a.altura ?? 1`, `a.lados ?? 8` e outros 26 padrões numéricos (`grep -rhoE "\ba\.[A-Za-z]+ \?\? [-0-9.]+"`). A descrição de `lados` diz "mínimo 3", mas o código faz `Math.max(3, Math.trunc(...))`, o que explica o `lados: 2` calado.

## 4. Avisos que não bloqueiam

Fato medido. O núcleo tem 45 pontos que empurram em `avisos` (`avisos.mjs`), com forma que varia: 19 usam o campo `texto`, 17 usam `motivo`, 3 usam os dois, 6 não têm nenhum dos dois; 12 trazem `passo` e 28 trazem `ref`. O `descrever-peca.mjs` imprime seis blocos que dizem expressamente que não reprovam (dobras e vincos não declarados, abertura na booleana da chapa inteira, réguas de malha, lataria dispensada, partes soltas quando a guarda do acervo cobre, os avisos do núcleo que não são o degrau). As guardas em `tools/modelar/guardas/` não emitem aviso: reprovam ou passam.

Candidato a ruído: `LATARIA DISPENSADA` repete o mesmo texto em toda execução de uma peça com `PLANO.lataria.dispensa`. Medi quantas peças pagam esse custo: 2 receitas em 103 (`rodas` do sedan e `chassi` do carrinho). Não é ruído geral.

Não consegui medir a frequência dos avisos por peça. Os arquivos de rodada (`procedural/pecas/**/rodadas/*.json`, 131 lidos) guardam medidas e veredito, não a lista de avisos, e rodar o `descrever` está fora do que foi permitido. O que o banco de provas registra são relatos de agentes: no sedan, a gaiola devolveu 13 avisos de uma vez numa peça (`ATRITOS.md`, item sobre a chapa lisa), e vários atritos dizem que o aviso não trouxe a camada ou a linha que o causou (`camadasInclinadas`, itens 17 e 20 da mesma lista).

## Achados

1. Primitivas e transformações aceitam argumento ausente ou degenerado em silêncio (18 operações sem obrigatório; `lados: 2`, `raio: -1`, `lado: -1`, `d` ausente passam). Atrapalha muito: o erro só aparece na medida, depois de uma rodada inteira. O remédio é declarar `required` nas primitivas ou recusar valor não positivo, com o limite na mensagem.
2. O resolvedor numérico (`expressoes.js:38` e `:115`) lança sem passo nem argumento e fora do mecanismo de órfãos. Atrapalha muito, porque aborta a peça inteira e é o erro mais provável ao digitar um nome de parâmetro. O remédio é pegar o lançamento no despacho e devolvê-lo como `grita` com passo, operação, chave e parâmetros existentes mais próximos.
3. A operação com erro de digitação é recusada sem sugestão nem lista, enquanto a chave recebe as duas (`nucleo.js:521` e `:526` contra o `operação desconhecida`). Atrapalha pouco, é correção de uma linha e fecha uma assimetria.
4. Cinco recusas dizem `'undefined'` (`arranja.modo`, `espelha.eixo`, `rotaciona.eixo`, `material.usa`, `pesar.osso`) e `PASSOS` fora de lista vaza `forEach is not a function`. Atrapalha pouco, mas é onde a IA mais confunde causa e efeito.
5. Quase um quarto das mensagens do núcleo (23%) traz valor, limite e lugar, e 6% não traz nenhum dos três. As piores são internas e cobertas pelo embrulho do chamador; só `composicoes.js:220` e `extensoes.js:28` ficam sem lugar. Atrapalha pouco.
6. Nomes: `de` com cinco sentidos, `eixo` com quatro, `lado` e `profundidade` com dois, `id` ao lado de `origemId` em 12 operações. Atrapalha pouco por ora, porque a recusa de chave errada cobre a troca, mas aumenta o custo de ler a lista de chaves de cada operação. Trocar nome seria quebra de receita e fica para plano próprio.
7. Padrões numéricos fora da descrição (27 de 29 chaves nas onze operações de base). Atrapalha muito junto com o achado 1, porque a IA não sabe qual valor ficou valendo. O remédio é gerar "padrão X" na descrição a partir do próprio código.
8. `descrever-peca.mjs` imprime `disponíveis em pecas/:` sempre vazio (a pasta agora só tem diretórios e o filtro pega `.js`, linha 47). Atrapalha pouco, mas é a mensagem que deveria orientar quem erra o nome da peça.
9. O formato do aviso varia (`texto`, `motivo`, `ref`, `nome`). Atrapalha pouco; quem consome precisa ramificar. Não achei aviso que repita sem ação possível em toda peça.

Perguntas do plano: o processo teria pego sozinho? O gate já cobre os exemplos das operações (R00), mas nenhum gate confere que toda operação com argumento essencial declara `required`, que a descrição cita o padrão do código, nem que toda mensagem lançada saia com passo. Isso é o que falta virar gate antes de dar o achado 1 por pronto.

## O que não consegui medir

A frequência dos avisos por peça, o tempo de leitura das mensagens pela IA, a ordem de eixos de `[u,v]` operação por operação e o que o `descrever` imprime diante de cada receita errada, porque o confinamento de caminho recusa receita fora do repositório e escrever dentro dele não era permitido.
