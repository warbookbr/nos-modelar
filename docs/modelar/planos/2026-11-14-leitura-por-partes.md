# Leitura por partes: a prancha e o esboço conferidos contra a referência, parte por parte

**Estado:** ativo

**Território:** `tools/modelar/leitura-por-regioes.mjs`, `tools/modelar/leitura-por-regioes.test.mjs`, `tools/fixtures/leitura-por-partes/`, `.claude/skills/desenhar-prancha/SKILL.md`, `.claude/skills/prancha-dos-contornos/SKILL.md`, `.claude/skills/esbocar-opcoes/SKILL.md`, `docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md`.

**Responsável:** a IA da sessão do carro conduz e mede, e a pessoa julga se a leitura acha o que ela acharia.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14 com o ramo do carro.

Ativado pela pessoa em 2026-11-14, como quarto na ordem de prioridade, depois do carro.

## Problema observado

Na prancha lateral do carro fastback (`procedural/pecas/carro-fastback/referencias/lateral.prancha.mjs`, ramo `claude/baixa-att-repo-web-750f57`), a pessoa achou olhando a prancha ao lado da imagem o ombro traseiro reto onde a referência tem curva, a frente sem bico, as colunas e o teto fora do lugar, a lanterna longe da quina e os recortes de baixo ausentes. Cada vez que ela apontou um trecho e pediu que o agente olhasse, o agente viu a diferença e acertou a correção. O agente sabia ler o trecho; o que faltou foi olhar cada trecho sem que alguém apontasse. O próprio arquivo da prancha registra que as linhas foram lidas a olho, com erro da ordem de 25 mm.

A ferramenta para isso existe e não foi usada. `npm run leitura:regioes` nasceu do mesmo caso na traseira da empilhadeira (2026-11-09): corta a referência e o rascunho na mesma grade, amplia as regiões lado a lado, pede ao crítico uma resposta por região e recusa a rodada com região sem resposta. Ela aceita uma captura qualquer com `--painel`, mas três coisas a afastam da prancha. A skill `desenhar-prancha` manda comparar com a referência de olho (seção 7) e não a cita, e a `prancha-dos-contornos` também não. A prancha rasterizada traz cotas, rótulos e legenda, que entram no painel e deslocam a caixa do objeto. E a grade corta o objeto em retângulos iguais, de modo que uma região pega metade de uma coluna e metade de um vidro, e a resposta não se liga à parte da prancha que precisa mudar.

O processo não pegaria sozinho: nenhuma skill de prancha manda conferir região por região, e nada recusa levar a prancha à pessoa sem essa leitura.

## Resultado

Com um comando, a prancha de uma vista, o esboço ou a peça são lidos contra a imagem de referência parte por parte, com as partes declaradas por nome e em milímetro, a mesma calibração para os três, e a rodada só vale com todas as partes respondidas; as skills de prancha e de esboço a pedem antes de levar a imagem à pessoa.

## Filtro Agent-First

- `leitura:regioes`, com o pedido, o registro das rodadas, as diferenças em campos e a contradição entre rodadas: USAR DIRETO e ESTENDER. A leitura por partes é outra forma de cortar as regiões, e o resto da ferramenta vale igual.
- Prancha (`tools/modelar/prancha/prancha.mjs`): ENVOLVER. A leitura pede à prancha só as camadas de contorno e de linha da vista, sem cotas nem rótulos, desenhadas no quadro da caixa do objeto em mm; a prancha não muda.
- Partes declaradas: USAR DIRETO o que a peça já tem. Uma parte é um nome e uma caixa em mm no referencial da peça; a lista vem de um arquivo `partes.json` da vista, ou dos marcos e camadas da prancha, ou do `andaime.json`. Nenhum formato novo de peça.
- Calibração: USAR DIRETO a `--caixa-ref` e o relato da razão entre altura e largura que a ferramenta já dá, que mostra a deformação da imagem de IA (8% mais curta que a tabela, no carro). Âncoras por ponto ficam ADIADAS até a fatia 1 mostrar que a caixa não basta.
- Leitura passo a passo do objeto antes de modelar (a skill de leitura que a pessoa citou): ADIAR. Se a lista de partes sair pobre ou errada na fatia 1, vira plano à parte, com o achado.

## Incluído

- `--prancha=<arquivo.prancha.mjs> --vista=<vista>` como lado do rascunho na leitura, só com contorno e linhas;
- `--partes=<partes.json>` como alternativa à grade: uma região por parte declarada, com o nome da parte no pedido, nas folhas e no registro, e a grade como padrão quando não vier;
- a mesma lista de partes e a mesma `--caixa-ref` valendo para `--prancha` e para `--modelo`, de modo que prancha, esboço e peça são lidos no mesmo quadro;
- o passo nas skills `desenhar-prancha`, `prancha-dos-contornos` e `esbocar-opcoes`: rodar a leitura por partes e levar o pedido ao crítico antes de levar a imagem à pessoa;
- testes com fixture neutra (uma prancha de caixa com dois recortes e uma imagem sintética) e a prova na prancha lateral do carro.

## Excluído

- julgar forma pela ferramenta: ela entrega os lugares e cobra as respostas, e quem aprova continua sendo a pessoa;
- medir em milímetro a prancha contra a imagem: a imagem de IA vale como caráter, e o desvio em mm fica com `silhueta:desvio` quando houver contorno conferido;
- a skill de leitura passo a passo do objeto;
- mudar a prancha do carro além do que a pessoa decidir depois da prova.

## Gate de saída

1. Na fixture neutra, a leitura por partes gera uma folha por parte declarada, com o nome dela, e recusa a rodada com parte sem resposta; sem `--partes`, a grade sai como hoje (o teste atual passa sem mudança).
2. Com `--prancha`, o painel não contém cota, rótulo nem legenda, e a caixa do objeto na prancha coincide com a do contorno em mm.
3. Numa cópia da prancha lateral do carro com os cinco defeitos que a pessoa achou reintroduzidos de propósito (ombro reto, frente sem bico, colunas e teto deslocados, lanterna longe da quina, recortes de baixo ausentes), um crítico sem contexto lendo as folhas por partes acha pelo menos quatro dos cinco. A versão anterior às correções não foi guardada no histórico, por isso a cópia é refeita a partir da atual, fica fora do repositório como as imagens, e a lista dos cinco defeitos é escrita antes de o crítico ler. É a prova de que a ferramenta faz o que a pessoa fez apontando; se ele achar menos de três, o plano para.
4. As três skills citam o passo, e o `npm run gates` fica verde.
5. Decisão Agent-First registrada para cada interface tocada.

## Fatias

1. Prova sem código novo: montar a cópia com os cinco defeitos do gate 3, rodar `leitura:regioes` com ela rasterizada à mão e `--painel` recortando as cotas, em grade, e levar ao crítico. Anotar quantos dos cinco defeitos ele acha e quais regiões a grade cortou mal. Isso diz se o ganho está no corte por partes ou só em usar a ferramenta.
2. `--prancha` e `--partes`, com a fixture neutra e os testes.
3. A prova do gate 3 na prancha do carro, a leitura da versão atual levada à pessoa, e o passo nas skills.
4. Fechamento, com os achados e o que vai ao backlog.

## Riscos e parada

Se a fatia 1 mostrar que a grade já acha os defeitos, o plano encolhe para o passo nas skills e o recorte das cotas, sem `--partes`. Se a imagem de IA estiver tão deformada que as partes da prancha caiam fora das da referência na mesma caixa (razão de aspecto fora de 10%), as âncoras por ponto entram antes de seguir. Se o crítico achar menos de três dos cinco defeitos, o plano para e volta à pessoa com as folhas.

## Fechamento

Preencher somente ao concluir ou cancelar.

## Andamento — fatia 1

Feita em 2026-11-14, sem código novo. A cópia com os cinco defeitos e a prancha atual saíram do mesmo script, só com contorno, linhas e rodas, sem cotas, rótulos nem legenda (`tmp/leitura-por-partes/`, fora do repositório, com a lista dos defeitos escrita antes do crítico). A referência lateral está de frente para a esquerda e a prancha de frente para a direita, então a imagem foi espelhada à mão. As duas foram lidas por `leitura:regioes` na grade padrão de 4 por 3, com a mesma `--caixa-ref`, e cada uma foi a um crítico sem contexto; a prancha atual serviu de controle, para separar o defeito plantado do que o crítico acusa de qualquer jeito. A razão entre altura e largura da referência é 0,337 e a da prancha 0,292, 13,3% de diferença, porque a imagem de IA é 8% mais curta e 7% mais alta que a tabela; o ajuste de cada eixo em separado as alinha, e no índice as partes caem umas sobre as outras.

Resultado por defeito, contando só o que o crítico disse na cópia e não disse no controle: a frente sem bico foi achada (B4 e C4, frente reta e vertical, contra o nariz em ângulo do controle); os recortes de baixo foram achados (C4, sem a abertura do farol de neblina, e C1, sem o recorte do difusor); o teto recuado foi achado em parte (A2, arco do teto mais baixo e achatado, e A3, vidro da porta mais estreito), e a coluna B, não, porque o controle também a acusa fina e vertical; o ombro reto foi achado só como falta (B2 e C3, o friso curvo do para-lama ausente), sem dizer que a linha está reta; a lanterna longe da quina não conta, porque o controle a acusa do mesmo jeito. São três achados inteiros e dois parciais, acima do mínimo de parada.

O que a fatia mostrou além disso. O controle teve diferenças em 8 das 12 regiões (19 no total, contra 27 na cópia): o crítico acusa a prancha atual de lanterna afastada da quina, coluna entre os vidros fina, retrovisor alto e solto, para-brisa em faixa solta e janela traseira grande. Parte disso pode ser defeito real da prancha atual, e a pessoa decide; parte é a diferença entre um desenho de linhas e uma foto. Sem o controle, o defeito plantado e o ruído não se separam, e é isso que `aceitas` e a contradição entre rodadas da ferramenta tratam a partir da segunda rodada. A grade cortou a lanterna e a coluna B na divisa entre regiões, e o pedido chama o lado da prancha de "rascunho 3D", o que não serve à prancha. Os dois vão à fatia 2: o corte por partes nomeadas e o texto do pedido para `--prancha`.

O processo não pegaria sozinho a imagem espelhada nem a razão de aspecto acima de 10%: a ferramenta mede a razão e não recusa nem avisa acima de um limite. A fatia 2 acrescenta o aviso e o `--espelhar`.

## Andamento — fatia 2

A leitura ganhou quatro opções, com cinco testes novos em `leitura-por-regioes.test.mjs` e a prancha neutra em `tools/fixtures/leitura-por-partes/`. `--partes=<partes.json>` troca a grade por uma região por parte declarada em mm, com o nome dela na folha, no pedido e no registro, e o painel de cada parte com o maior lado em 1.200 px; a rodada recusa a parte sem resposta pelo nome. `--prancha=<arquivo.prancha.mjs>` desenha a vista só com contorno, linhas e rodas, rasteriza no navegador (cerca de 30 s com a leitura inteira, no carro) e chama aquele lado de PRANCHA, com o pedido explicando ao crítico que ali há um desenho de linhas; com ela, a parte pode citar camadas da prancha (`{ "camadas": ["lanterna"] }`) e o arquivo resolvido em mm fica em `partes.json` na pasta da leitura, para ser reusado no esboço e na peça. `--espelhar` vira a referência, com a caixa dada na imagem original. A diferença de altura sobre largura acima de 10% sai como aviso.

A prova repetiu a da fatia 1 com três críticos sem contexto em cada modo, sobre a mesma cópia com os cinco defeitos e as mesmas 13 partes (frente, capô, para-brisa, teto, vidros, queda, porta, ombro, rebaixo, traseira, os dois arcos e a saia). Defeitos achados por crítico, contando meio quando a diferença é dita sem a natureza do defeito:

| Defeito | Grade (3 críticos) | Partes (3 críticos) |
|---|---|---|
| frente sem bico | 3 | 3 |
| recortes de baixo | 3 | 1 |
| teto recuado | 0,5 | 2,5 |
| ombro reto | 2 | 2 |
| lanterna longe da quina | 3, mas o controle também a acusa | 1 |
| por crítico, sem a lanterna | 3,5 / 3 / 2,5 | 2 / 2,5 / 4 |

As partes acham melhor o que é grande e ocupa a parte inteira (o teto), e a grade acha melhor o detalhe pequeno (os recortes, que na parte da frente dividem o painel com o farol e o nariz). A soma empata, e a variação de um crítico para outro (de 2 a 4 na mesma folha) é maior que a diferença entre os modos. O controle da fatia 1 acusou diferenças em 8 de 12 regiões, e o das partes em 12 de 13. A mediana das partes, 2,5 sem a lanterna, fica abaixo do mínimo de três do critério de parada, e a da grade, 3, fica no limite. O que a prova diz é que nenhum corte, sozinho, faz um crítico achar o que a pessoa achou; o que acha é a soma de críticos e de cortes: a união dos seis acha os cinco defeitos.

O processo não pegaria sozinho a variação do crítico, porque a leitura pede uma resposta por rodada. A decisão sobre o rumo é da pessoa (ver "Decisão depois da fatia 2").

## Decisão depois da fatia 2

A pessoa escolheu seguir com a leitura combinada em 2026-11-14.

## Andamento — leitura combinada

A ferramenta ganhou `--consolidar=<config.json>`, que lê as respostas de vários críticos do alvo e do controle, agrupa as diferenças pela parte onde caem e pela palavra da coisa nomeada, e conta quantos críticos do alvo disseram cada grupo e quantos do controle disseram o mesmo na mesma parte. O resultado sai em `consolidado.json` e `consolidado.md`. As skills desenhar-prancha, prancha-dos-contornos e esbocar-opcoes e o guia CONFERIR-CONTRA-REFERENCIA passaram a mandar a leitura combinada antes de levar a prancha ou o esboço à pessoa.

Com as seis respostas da fatia 2 sobre a cópia com defeitos e um crítico por modo na prancha correta como controle, os cinco defeitos plantados aparecem entre os 26 grupos que pelo menos dois críticos disseram. O ruído é grande: a maioria desses grupos são diferenças que a prancha atual já tem contra a referência (lanterna, coluna B, retrovisor, para-brisa, vidro traseiro, frente ondulada, farol), e o controle com um crítico por modo desconta pouco delas. A palavra "farol" junta o farol de neblina com o dianteiro no mesmo grupo. O processo não teria pego sozinho o desequilíbrio do controle; a instrução no guia passa a pedir o mesmo número de críticos no controle e no alvo quando houver controle. O gate 3 segue aberto até a prancha lateral do carro ser aceita pela pessoa.
