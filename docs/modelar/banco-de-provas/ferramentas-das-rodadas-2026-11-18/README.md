# Ferramentas das rodadas: fatia 2, o cache por passo e `--params` nas medidas

Registro da fatia 2 do plano [ferramentas das rodadas](../../planos/2026-11-18-ferramentas-das-rodadas.md), medida em 2026-11-18 sobre a lataria do carro (`carro-fastback/lataria`, receita de sha256 `bda6950a`, 10 passos, o primeiro deles a `subdivisao` da chapa), numa máquina de 4 núcleos, com Node 22.23.4 e uma medida por vez.

## O que entrou

`tools/modelar/entrada-de-medida.mjs` ganhou `executarComCachePorPasso`, que executa a receita com a memória por prefixo de `tmp/cache-por-prefixo/`, a mesma do `descrever` e da bancada. O que o cache guarda e a chave dele não mudaram. A zebra numérica, o `conferir-pontos` e a medição de `rodada-de-modelagem --acao` passaram a executar por ela. No `--acao` a receita atual executa uma vez para o referencial, os pontos e as faces finas, e as duas guardas (`guarda:acervo` e `guarda:referencial`) recebem o cache ou a execução pronta por opção, desligada no gate. A cópia da receita que a rodada guardou, lida para comparar a forma, guarda só o estado final, porque ninguém a edita.

`--params=<json ou caminho de .json>` entrou na zebra numérica e no `conferir-pontos`. Os parâmetros entram na chave pelo que ela já encadeia (o dicionário da receita, os aliases e o conteúdo de cada passo), e a variante tem índice próprio, para não tirar do índice os pontos da receita do arquivo. A opção é recusada quando o arquivo da receita lê a tabela dos parâmetros direto, fora de `this.PARAMS`, porque a variante teria os passos novos e esses dados velhos.

## Os tempos

Cada linha é um processo novo, cronometrado por fora, do comando à saída. "Antes" é o código do envio 749e7647, sem cache; "primeira" é a medida nova com `tmp/cache-por-prefixo/` vazia; "segunda" é a mesma medida repetida em seguida.

| medida | antes | primeira, cache vazio | segunda, pelo cache | resultado |
| --- | --- | --- | --- | --- |
| `node tools/modelar/zebra-numerica.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js` | 79,9 s | 84,3 s | 2,8 s | o JSON das três é o mesmo arquivo, byte a byte (sha256 `55b17faa`) |
| `node tools/modelar/rodada-de-modelagem.mjs carro-fastback/lataria --acao` | 514,0 s | 288,9 s | 105,2 s | a saída das três é a mesma, byte a byte (sha256 `d0f50df0`) |
| `node tools/modelar/conferir-pontos.mjs carro-fastback/lataria` | 120,7 s (`--sem-cache`) | não medida | 2,3 s | os mesmos desvios, 4,56 mm e 2,84 mm |

A zebra da lataria inteira, nas três execuções: 17825 pontos, passo efetivo 26,558 mm, 115 extremos, 121 laços, 123,991 laços esperados; por faixa de onda, 21 extremos e 6 laços abaixo de 100 mm, 17 e 8 de 100 a 200, 36 e 19 de 200 a 500, 41 e 88 de 500 em diante. Na segunda a execução da `subdivisao` foi de 81,6 s para 1,0 s de leitura do estado guardado.

O `conferir-pontos` da segunda coluna não tem primeira medida própria: ele recomeçou do estado que o `--acao` tinha guardado para a mesma receita (10 de 10 passos servidos), que é o caso de uso do laço.

## O que sobra no `--acao`

Dos 105 s da segunda medida, 76 s são das réguas de dobra e vinco dentro do `descrever`, que executam a `subdivisao` de novo para capturar a gaiola e não passam pela memória por prefixo; o resto é a medida das partes, dos contatos e da referência. A primeira medida com cache vazio levou 288,9 s, e a divisão desse tempo entre a execução do `descrever`, a execução só dos passos que a guarda do acervo faz sem o TOPO e os aliases e a execução da cópia da rodada anterior não foi medida.

## O custo em disco

Depois das duas medidas do `--acao` a pasta `tmp/cache-por-prefixo/` tinha 456 MB em 12 pontos, cada ponto da chapa com 39 a 52 MB. Guardando todos os passos caros da cópia da rodada, eram 857 MB em 21 pontos, e por isso a cópia guarda só o estado final.

## A recusa de `--params` na lataria

A receita da lataria é recusada, e a mensagem lista as cinco linhas: `AJUSTES_DE_CURVA` (281), `ALIASES` (609), os dois `PONTOS` (634 e 635) e a saliência do rebaixo no `PLANO` (676), todos lidos de `TABELA` direto. Enquanto a receita não ler esses dados por `this.PARAMS`, a variante dela se mede editando a tabela no arquivo, e o cache por passo refaz só do passo que mudar.

## Limites conhecidos

A leitura que decide a recusa é por texto e só do arquivo da receita: o arquivo importado que leia a tabela não é visto, e o parâmetro de função com o mesmo nome da tabela é acusado sem ser leitura dela. O `descrever` e a vista rápida não receberam `--params` nesta fatia, e a vista rápida segue sem o cache, porque os arquivos deles estão fora do território do plano.
