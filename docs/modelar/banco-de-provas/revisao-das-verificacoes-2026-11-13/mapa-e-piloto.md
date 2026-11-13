# O mapa dos testes e o piloto da medida por estrago

Medido em 2026-11-13 sobre a main de `539803de` mais os envios do dia. Os scripts são de rascunho, fora do repositório, e o essencial de cada um está dito. Fato medido e leitura minha vêm separados.

## O mapa, por área

Fato medido. `git ls-files` dá 521 arquivos de teste, com 5.908 chamadas de `it` ou `test` e 20.239 de `expect`, em 87.766 linhas; 81 estão em `TESTES_LENTOS` e só rodam inteiros no CI. O script lê cada arquivo sem os comentários e conta por expressão regular; a área vem do caminho.

| Área | Arquivos | Testes | Conferências | Lentos |
|---|---|---|---|---|
| ferramentas de medida e vista (`tools/modelar/`) | 152 | 1.611 | 5.807 | 30 |
| núcleo (`procedural/nucleo/`) | 112 | 1.581 | 5.335 | 12 |
| autoria e montagem (`src/autoria/` e o resto de `src/`) | 59 | 755 | 2.350 | 2 |
| bancada (`src/bancada/`) | 55 | 265 | 919 | 1 |
| núcleo testado em `tools/fixtures/` e `tools/oficina/` | 32 | 700 | 2.072 | 7 |
| organização e documentos (`tools/mapa/`, `arquitetura/`, `gates/`) | 30 | 207 | 456 | 0 |
| outras ferramentas (Blender, catálogo, bancadas) | 24 | 153 | 801 | 9 |
| módulos | 23 | 220 | 792 | 4 |
| guardas e réguas | 13 | 73 | 176 | 3 |
| famílias e extensões | 11 | 260 | 1.194 | 7 |
| servidor de ferramentas | 10 | 83 | 337 | 6 |

## Os sinais de fragilidade

Fato medido, por busca no texto de cada arquivo. Em 115 arquivos há conferência de número exato de dois ou três dígitos ou mais (`toHaveLength`, `.length` com `toBe`, `toBe` de número grande); em 59 há prazo escrito à mão no fim de um `it`; 33 citam uma peça do acervo pelo caminho e 8 varrem o acervo inteiro com `pecasDoAcervo`; 60 rodam outro processo; 25 têm teste pulado (`skip`, `todo` ou `skipIf`); 7 medem tempo com relógio; 1 não tem nenhum `expect` (`tools/bancadas/versao-publicada.test.mjs`).

Fato medido, um caso do dia. `src/autoria/material-da-receita.acervo.test.js` exigia mais de 500 materiais somados no acervo e reprovou no CI com 492 quando as 87 cópias antigas de receita das rodadas saíram: o número contava arquivo repetido. Só roda no CI, e a bateria local não avisou. Virou piso de sanidade, com o motivo no comentário.

Leitura minha. O sinal diz onde olhar e não o que tirar: um número exato pode ser a conferência certa de uma malha determinística. O caso do dia é do outro tipo, um piso que media o tamanho do acervo.

## O piloto da medida por estrago

Método. Para cada arquivo de código, o script roda os testes rápidos ligados a ele (`npx vitest related <arquivo> --run --bail=1`, com `MODELAR_TESTES=rapidos`), depois aplica um estrago por vez, sorteado com semente fixa entre os pontos candidatos, e roda de novo. Os estragos: limite trocado (`<=` por `<` e os outros três), igualdade invertida, `&&` por `||` e o contrário, soma por subtração e o contrário, produto por divisão, `true` por `false` e o contrário, retorno trocado por `undefined`, e condição de saída que nunca vale. Linhas de comentário e ponto dentro de texto ficam de fora. Percebido é a bateria sair com erro.

Fato medido, 30 estragos em 5 arquivos:

| Arquivo | Estragos | Percebidos | Testes ligados | Tempo sem estrago |
|---|---|---|---|---|
| `procedural/nucleo/expressoes.js` | 6 | 6 | 253 arquivos | 186 s |
| `procedural/nucleo/contorno.js` | 6 | 6 | 265 | 141 s |
| `procedural/nucleo/curva2d.js` | 6 | 5 | 255 | 139 s |
| `procedural/nucleo/operacoes/transformacoes.js` | 6 | 1 | 253 | 184 s |
| `tools/modelar/reguas-de-malha/face-degenerada.mjs` | 6 | 4 | 73 | 45 s |
| total | 30 | 22 | | |

Os oito não percebidos. Em `curva2d.js`, linha 284, o estrago caiu no texto de uma mensagem de erro, e não muda a geometria. Em `transformacoes.js`, cinco de seis: quatro estão nas recusas do `espelha` (linhas 234, 240 e 248) e na leitura dos vértices (linha 279), e um numa saída marcada no código como defensiva (linha 173). Em `face-degenerada.mjs`, o limite da normal (linha 30, `>` por `>=`) e a guarda de face com menos de três cantos (linha 28).

Leitura minha. Três arquivos de matemática do núcleo têm a bateria rápida percebendo quase tudo, e quem percebe é o teste do próprio arquivo, em segundos. As recusas do `espelha` não têm teste que as exercite: quatro condições de erro trocadas e nenhum teste rápido notou. E a régua da face degenerada não tem teste na fronteira do limite, que é justamente o número em disputa no plano das costuras. O custo também é dado: um arquivo do núcleo liga-se a mais de 250 arquivos de teste, de modo que um estrago que ninguém percebe custa de dois a três minutos de máquina, e é por isso que a medida é por amostra.

## A amostra maior

Fato medido, 64 estragos em 8 arquivos, pelo mesmo método, com a máquina dividida com outras cargas:

| Arquivo | Estragos | Percebidos | Testes ligados |
|---|---|---|---|
| `tools/modelar/reguas-de-malha/triangulo-fino.mjs` | 8 | 7 | 71 arquivos |
| `tools/modelar/reguas-de-malha/face-torcida.mjs` | 8 | 3 | 71 |
| `src/autoria/auditar-intersecoes-montagem.js` | 8 | 5 | 30 |
| `src/autoria/contatos-da-peca.js` | 8 | 2 | 68 |
| `procedural/nucleo/operacoes/limpar-lascas.js` | 8 | 3 | 254 |
| `procedural/nucleo/operacoes/edicao-direta.js` | 8 | 6 | 253 |
| `procedural/nucleo/operacoes/subdivisao.js` | 8 | 4 | 256 |
| `procedural/nucleo/operacoes/friso.js` | 8 | 5 | 253 |
| total | 64 | 35 | |

Somado ao piloto: 94 estragos em 13 arquivos, 57 percebidos (61%).

Os 29 não percebidos da amostra, lidos um a um pela linha estragada. Dezesseis são recusa ou guarda de entrada que nunca é exercitada: a condição de erro foi trocada por falso, ou o limite dela mudou, e nenhum teste rápido passou uma entrada ruim (`subdivisao.js` linhas 344, 372 e 396; `friso.js` 435 e 521; `edicao-direta.js` 174 e 183; `contatos-da-peca.js` 123, 149 e 158; `limpar-lascas.js` 72 e 128; `face-torcida.mjs` 55 e 58; `auditar-intersecoes-montagem.js` 113; `triangulo-fino.mjs` 53). Quatro estão em comparador de ordenação e provavelmente não mudam o resultado, de modo que não contam contra os testes (`auditar-intersecoes-montagem.js` 45; `contatos-da-peca.js` 59 e 238; `limpar-lascas.js` 79). Nove são conta ou laço que mudou e ninguém notou (`face-torcida.mjs` 40, 42 e 47; `auditar-intersecoes-montagem.js` 77; `contatos-da-peca.js` 151; `limpar-lascas.js` 61 e 104; `subdivisao.js` 153; `friso.js` 144).

Leitura minha. O padrão do piloto se repete com amostra três vezes maior. A bateria rápida percebe a conta principal de cada operação e não percebe as recusas: mais da metade do que passou sem ninguém notar é validação de entrada sem teste de entrada ruim. É o mesmo lugar que o inventário de erros da revisão do projeto apontou pelo outro lado, com valores degenerados aceitos em silêncio. Duas réguas de malha saem mal: a da face torcida, com 3 de 8, e os contatos da peça, com 2 de 8, e as duas são conferências em que a guarda do acervo confia.

## O que falta

Os 37 não percebidos ainda não foram conferidos contra os testes lentos, que só rodam no CI, nem contra a guarda do acervo. Os nove de conta ou laço pedem leitura do código para separar o estrago que não muda nada do que muda e ninguém vê. A medida diz onde falta proteção; qual teste não percebe nada, que é a outra metade da pergunta, pede cruzar cada teste com os estragos do arquivo que ele testa, e ainda não foi feito. Nenhum teste recebeu veredito ainda.
