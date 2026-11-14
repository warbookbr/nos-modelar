# Modelagem de carro de passeio: o que já serve, onde a carroceria travou antes e por onde começar

**Estado:** rascunho

**Território:** nenhum (aguarda aprovação)

Ao ativar, a proposta é `procedural/pecas/carro-fastback/` e `docs/modelar/banco-de-provas/carro-fastback-2026-11-14/`. O `tools/modelar/ondulacao-da-superficie.mjs` e o `procedural/criterios/veiculo.json` entram só com as fatias de ferramenta aprovadas. A família `procedural/familias/roda-pneu/` é território do plano do furgão realista, e o perfil de roda esportiva passa por ele ou por mudança de território decidida pela pessoa.

**Responsável:** a definir; proposta: a IA da sessão conduz e mede, e a pessoa julga a forma por imagem.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-14.

## Problema observado

A pessoa quer modelar um carro de passeio inteiro e saber se o caminho é núcleo, ferramenta geral ou família. As quatro imagens de referência (lateral, frontal, traseira e superior) foram geradas por IA, valem como caráter da forma e ficam fora do repositório; em 2026-11-14 a pasta `tmp/carro/` ainda não existia, e este estudo foi feito pela descrição. O objeto é um cupê fastback de duas portas: capô longo com duas tomadas de ar rebaixadas e vincos, grade grande e escura, faróis afilados, para-choque com entradas e faróis de neblina, para-brisa inclinado, coluna traseira longa que cai até uma tampa curta com spoiler, para-lama traseiro largo e saliente, lanternas em painel escuro, difusor com duas saídas de escape, retrovisores, maçanetas e rodas de dez raios em pares com disco e pinça à vista.

A forma descrita lembra um modelo comercial conhecido. O alvo deste plano é um fastback genérico: a proporção e a classe ficam, e os traços que identificam um fabricante (o desenho da lanterna, o contorno da grade, o desenho das tomadas do capô e qualquer emblema) são trocados por opções desenhadas que a pessoa escolhe no alinhamento. O nome do modelo e do fabricante não entra em arquivo nenhum.

### O que já existe

Para a lataria: `subdivisao` com vincos nomeados, `raio` de aresta e `espessura`; `gaiolaPorEstacoes` com `simetria`, `vaos`, `aneis`, `curvas` e `interpolar`; `gaiolaPorRede`, cuja gaiola segue curvas de feição; `gaiolaPorLacos` para para-choque e retrovisor; `paineisPorVaos` com `curvaDaGaiola`, que corta a chapa em capô, portas, para-lamas e tampa com vão constante; `aberturaPorContorno` com `sentido` e vista por vetor, para farol, grade e lanterna; `friso` e `gaiolaVarrida` para moldura, saia e lábio; `aparar` para o que fica por dentro da chapa. Para medir: `npm run ondulacao`, `raio:aresta`, `vao:partes`, `malha:lascas`, `vistas:superficie` com luz rasante e curvatura no Blender, `silhueta:desvio`, `conferir:vistas` e o `conferir-refino` entre rodadas. Para o alvo: as skills `desenhar-prancha`, `contorno-da-imagem` e `prancha-dos-contornos`, e os critérios de `procedural/criterios/veiculo.json`, com onze regras, sete delas ligadas a conferência da prancha. Para as rodas: a família `roda-pneu` 2.2.0, com nove perfis, posta por `instanciaDeFamilia`. Os guias são `docs/modelar/guias/modelar-carroceria.md`, `modelar-veiculo-em-chassi-e-lataria.md` e `modelar-veiculos.md`.

Dois veículos de aparência real já foram feitos. O furgão realista (`procedural/pecas/furgao-realista/`, plano ativo) tem 127 partes numa receita: lataria numa chapa só com os vãos de vidro, frestas de porta, saia, para-choques e molduras por varredura, rodas da família, vidros com borracha, interior em volumes simples, faróis com lente, conchas e lâmpadas, lanterna de quatro faixas, retrovisores, maçanetas e antena. O sedã em alta definição (`procedural/pecas/sedan-chassi-e-lataria/`, etapas fixas em 2026-11-13) tem 98 partes numa montagem v5 de cinco etapas: lataria de baixo e cabine em gaiolas com simetria, painéis cortados com vão de 4,00 a 4,07 mm iguais nos dois lados, raio dentro de 20% em 25 de 29 arestas e 9 falhas de ondulação, quase todas abaixo de 1,1 mm.

Em andamento fora da main: a roda esportiva de dez raios em pares, com pneu e freio previstos, no branch `claude/roda-esportiva`, e o disco de freio ventilado aprovado no branch `claude/pecas-automotivas`.

### Onde as tentativas de carroceria travaram, com a medida

O registro de decisão de 2026-11-13 guarda nove hipóteses reprovadas em agosto: seção digitada à mão, `loft` ou envelope longitudinal como pele (dá cápsula), mais polígonos, suavização depois, blocagem multivista, interseção de silhuetas (IoU frontal de 0,7645) e três vistas como determinação da seção (82% das estações escondidas). A decisão de 2026-08-19 fixou a pele por subdivisão com vincos.

A carroceria por subdivisão (outubro) chegou a 1,4 mm de distância mediana em sete testes cegos e parou no F1 dos vincos, que não passou de 0,36, porque a grade de estações não segue as feições. A gaiola que segue as feições chegou a 1,9 e 2,3 mm sem rugas, com os detalhes de borda na escala errada. A rede de curvas teve a primeira nota 7 do trecho inteiro e 5 na região da janela, e a pessoa fixou o nível oficial: lataria lisa, com os detalhes de borda como peças à parte, que ficam em torno de 5 e não sobem com mais rodadas.

O furgão está aberto desde 2026-10-30, passou da rodada 19 e parou três vezes para a ferramenta aprender: a abertura de contorno livre, o corte de um corpo fechado por um lado só e o corte na diagonal da quina. A forma do farol ficava presa às linhas da gaiola até a `aberturaPorContorno` existir. A receita dele leva 135 s para executar.

O sedã em alta definição fechou a lataria e travou no carro montado. O ciclo 5 levou cerca de 4 horas e 10 minutos, mais da metade em espera de montagem e medida: a etapa da carroceria executa em 242 s, o `descrever` dela leva 275 s, cada `vao:partes` do carro 12 a 16 minutos e o relato de contatos 17 minutos. Ficaram sem solução a face de área nula que faz o modo estrito recusar com 42 itens, o chassi que não se apara pela pele de dentro de uma chapa subdividida, a aba de borda do painel (o `paineisPorVaos` passa na fixture e não fecha a união no sedã), o rebaixo de fundo fechado para maçaneta, placa e lanterna, a porta com quadro e o espelho de gaiola por laços, feito por um `espelho.mjs` da peça.

A roda esportiva recebeu notas 5, 5 e 4 em três rodadas julgadas de quatro, com a emenda dos raios no aro serrilhada e as faces finas subindo de 194 para 288 numa delas.

### A prova barata desta pesquisa

A dúvida real era se a régua de ondulação aceita o para-lama traseiro saliente, que o sedã e o furgão não têm. Uma receita de dois passos em `tmp/carro-prova/`, fora do repositório, fez meia lataria de 4.600 mm numa chapa só, com 15.064 faces, em 2 s no `npm run descrever` e 5 s no `npm run ondulacao`. Com a saliência de 60 mm em 520 mm de meia extensão e estações a cada 200 mm, a régua acusa o para-lama desenhado como calombo de 3,57 mm no ponto exato do pico (x 923, z 850) e o dianteiro como 2,03 mm; com a saliência em zero as duas falhas somem. Com estações a cada 100 mm o mesmo calombo cai para 1,78 mm, e com a saliência espalhada em 900 mm cai para 1,43 mm. O limiar da régua é 0,3 mm, e ela não tem como receber uma saliência declarada, ao contrário das dobras, que têm `PLANO.dobrasAceitas`. Num carro de para-lama saliente, a régua fica vermelha na forma pedida, e o caminho mais curto para o modelador silenciá-la é achatar o para-lama.

A mesma prova repetiu, sem necessidade, o que o registro já media: a chapa única gerada por uma seção ao longo do comprimento sai como cápsula, com a cabine fundida ao corpo. A consulta ao registro antes do experimento, que é a regra V-31, teria poupado essa parte.

### Achados de processo

O processo não pegaria sozinho a régua vermelha na forma pedida: a ondulação reprova e nada distingue o defeito da saliência desenhada. A correção é a declaração de saliência na régua, na fatia 2.

`docs/modelar/pesquisas/FERRAMENTAS-POR-OBJETO.md` lista para o carro de passeio a superfície suave por seções, que a decisão de 2026-08-19 recusa como pele. O `ferramentas:check` não cruza a pesquisa com os registros de decisão, e é o mesmo tipo de falta que o estudo do robô achou na coluna do que já existe. As duas linhas vão ao backlog juntas.

Nenhuma regra ou pergunta do alinhamento trata da referência cuja forma identifica um fabricante sem trazer marca escrita. A regra do contrato cobre a imagem com logotipo, e a forma parecida passa. A correção é uma pergunta de alinhamento em `procedural/criterios/veiculo.json`, na fatia 1.

## Resultado

O carro fastback genérico inteiro montado na bancada como montagem v5 em etapas aprovadas pela pessoa por imagem, começando pelo quarto traseiro, que é a região que nenhum veículo do acervo provou.

## Veredito: onde investir

A recomendação é modelar o carro como objeto da família `veiculo` com o método do sedã em alta definição, corrigir duas ferramentas gerais de medida no caminho e extrair famílias de componente só onde a segunda ocorrência já existe.

Investir no núcleo de formas não se sustenta: toda parte do carro tem operação, e as pendências de núcleo que tocam o carro já têm dono. O rebaixo de fundo fechado é do plano do rebaixo por contorno, em rascunho. A aba de borda do painel e a face de área nula ficaram com o fechamento da fatia 4c do plano do núcleo para qualquer mecanismo. `procedural/nucleo/operacoes/` é território do plano ativo do núcleo para quem escreve receita. Este plano registra onde o carro esbarra nelas e segue com o contorno já usado no sedã (forro por trás do vão, peça à parte no lugar do rebaixo).

A ferramenta geral é onde a medida mandou investir, em dois pontos. O primeiro é a saliência declarada na régua de ondulação, sem a qual a lataria deste carro não fecha rodada limpa. O segundo é o tempo de medida do carro inteiro: com 12 a 17 minutos por medida, a rodada do objeto montado custa mais em espera do que em escrita, e o plano mede por etapa e por região (`--recorte`, `--ate-passo`, cache de medida) antes de pedir qualquer mudança. Os dois servem a qualquer casca de forma livre, inclusive às do robô.

A família de objeto já existe (`veiculo`, com critérios em dados), e o carro entra nela sem pasta de domínio nova. Famílias de componente entram pela regra da segunda ocorrência, tratada adiante.

O custo, pela história medida: o sedã em alta definição levou perto de 11 horas de trabalho em cinco ciclos, mais a conversão em receitas e quatro rodadas de crítico, numa forma facetada de origem. Este carro tem dupla curvatura no para-lama e na queda do teto, e a previsão é de duas a três vezes isso, com a maior parte na lataria. O risco principal é a lataria não chegar a 7 no quarto traseiro, e por isso ele vem primeiro.

## Decomposição em partes e superfícies

| Parte | Com que se faz hoje | Qualidade medida | Lacuna |
|---|---|---|---|
| Lataria contínua (capô, para-lamas, portas, teto, coluna, tampa) | gaiolas com `simetria` por andar (corpo de baixo e cabine), ou `gaiolaPorRede` pelas curvas de caráter; `subdivisao` com vinco de `raio` | sedã: 9 falhas de ondulação, raio em 25 de 29 arestas; furgão: nota 8 na chapa | a união sem degrau da coluna traseira com o para-lama, que o sedã resolve com quina no ombro; a saliência declarada na ondulação |
| Para-lama traseiro saliente | colunas da gaiola deslocadas por estação, com perfil sem quina no pé | prova desta pesquisa: forma sai, régua acusa 3,57 mm | a declaração de saliência; densidade de estações na região |
| Vincos do capô e da lateral | vinco por coluna ou estação com `de` e `ate`; rede de curvas para o vinco em diagonal | F1 de vincos 0,36 por estações; a rede deu a primeira nota 7 | o vinco que segue curva livre está no backlog; onde a quina morre, o sedã mediu 15,4 mm de emenda |
| Vãos de porta, capô e tampa | `paineisPorVaos` com `curvaDaGaiola` | 4,00 a 4,07 mm, lados iguais | aba de borda e porta com quadro pendentes; mensagem de recusa sem a linha nem o ponto |
| Vidros embutidos | chapa própria por gaiola no vão, borracha por `friso` | sedã e furgão aprovados, nota 8 | nenhuma de forma; regra `vidro-com-interior` pede o interior |
| Grade e tomadas do capô | `aberturaPorContorno`, lâminas por `arranja`, peça rebaixada por trás | furgão: grade aprovada | tomada rebaixada de fundo fechado depende do plano do rebaixo; hoje é abertura com peça |
| Faróis e lanternas | `aberturaPorContorno` por vista ou vetor, lente recuada, carcaça, concha por `lathe` | furgão: aprovados depois de três pausas de ferramenta | borda aberta conforme o raio do canto, no backlog |
| Para-choques, difusor e spoiler | `gaiolaPorLacos` com raio na ponta; aletas por `arranja`; escape por `lathe` | sedã: raio de 5,8 a 7,0 mm para 6 pedidos; 1 falha de ondulação por barra | espelho de gaiola por laços fora do núcleo |
| Retrovisor | `gaiolaPorLacos` com raio (sedã) ou carcaça com braços (furgão) | aprovados nos dois | terceira ocorrência; candidato a família |
| Maçaneta | caixa ou alça sobre placa | aprovadas, simplificadas | o rebaixo atrás dela não existe |
| Rodas, pneus e freios | família `roda-pneu`; roda esportiva e disco nos branches | família aprovada; roda esportiva em nota 4 a 5 | raio de liga fundido ao aro; garras do pneu; pinça nunca feita |
| Interior visto pelo vidro | volumes simples, como no furgão; família `cadeira` para o banco | furgão aprovado | nenhuma no nível pedido |
| Forro dos arcos e assoalho | `gaiolaVarrida` e chapa, como no furgão | aprovado, regra `forro-do-arco` | nenhuma |

Material: tinta com verniz, vidro, plástico escuro e metal já saem do plano dos materiais realistas, por escolha de peça na receita. Nada de paleta nova.

## Duas ideias da pessoa, aplicadas ao carro

A primeira ideia é o esqueleto iterável com a régua do planejado contra o executado. O veredito é aceitar, e no carro ela custa menos que no robô porque metade já é o fluxo oficial. O esqueleto de um carro são os pontos duros (comprimento, largura, altura, entre-eixos, bitola, diâmetro do pneu, balanços, altura do capô e da cintura) e as curvas de caráter nomeadas (silhueta de lado, linha do ombro, arcos das rodas, contorno dos vidros). A prancha cotada da `desenhar-prancha` guarda as duas coisas, confere envelope, simetria e coerência entre vistas, e foi iterada com a pessoa no furgão em mais de dez rodadas com escolhas lado a lado. O executado já se compara com ela pela silhueta (`silhueta:desvio`, `conferir:vistas`), pelos `PONTOS` da receita e pelas regras de veículo com conferência.

Faltam duas coisas. A caixa por parte nos dois sentidos e a parte esquecida são a régua `planejado-contra-executado` do plano do robô, e o carro a usa em vez de ganhar outra; para isso a lataria, as rodas, os vidros e as luzes ganham volume no `andaime.json` da peça. A outra é própria de carroceria: a comparação das linhas de caráter executadas com as planejadas, que foi onde a subdivisão por estações travou (F1 de 0,36). O ajuste recomendado é fazer a gaiola nascer das curvas da prancha por `gaiolaPorRede`, de modo que a linha planejada é a aresta da gaiola, e medir o desvio com `linhas:modelo` e `casamento:vista`, que existem. O esqueleto é posição, proporção e linha; a blocagem como base de forma segue reprovada pelo registro de 2026-11-13.

A segunda ideia é a pré-modelagem por famílias extraídas na segunda ocorrência. O veredito por candidato:

- Roda e pneu: já é família. Falta o tipo de roda de liga com raios fundidos ao aro e a garra do ombro do pneu, que saem da roda esportiva quando ela for aprovada. Faz sentido, depois dela.
- Freio a disco: o disco tem uma ocorrência aprovada e terá a segunda na etapa 2 da roda esportiva; a pinça não tem nenhuma. Faz sentido como família de disco e pinça depois dessa etapa, com este carro como primeiro cliente.
- Retrovisor: duas ocorrências feitas à mão, de tipos diferentes (carcaça com braços no furgão, corpo com pé na porta no sedã). Este carro é a terceira. Faz sentido extrair no fim deste plano, com o tipo como parâmetro.
- Maçaneta: duas ocorrências, as duas simplificadas pela falta do rebaixo. Extrair agora fixaria o contorno. Faz sentido só depois do plano do rebaixo.
- Farol e lanterna: duas ocorrências. O contorno é livre em cada carro, e o que se repete é a sequência de vão por contorno, aba, lente recuada, carcaça e concha. Fica recusado como família de forma e aceito como ajudante geral de luz embutida, decidido no relatório deste carro. A concha com lâmpada e soquete é candidata a família na segunda ocorrência, que é esta.
- Grade, para-choque, difusor e spoiler: recusados; a forma é livre e a técnica já é operação.
- Banco: a família `cadeira` cobre o volume visto pelo vidro; perfil de banco de carro fica adiado.
- Plataforma ou chassi: o sedã pediu a família (34 partes à mão). Este carro não mostra chassi, e ela fica fora.

## Filtro Agent-First

- `subdivisao`, gaiolas, `paineisPorVaos`, `aberturaPorContorno`, `friso`, `gaiolaVarrida`, `instanciaDeFamilia`: USAR DIRETO.
- Régua de ondulação: REFATORAR para ler regiões de saliência declaradas no `PLANO`, com a amplitude e a extensão pedidas, e reprovar só o desvio em relação a elas.
- Prancha cotada e `andaime.json`: USAR DIRETO como esqueleto; a régua do planejado contra o executado é a do plano do robô.
- Critérios de veículo: ENVOLVER com a pergunta nova sobre traço de fabricante.
- Ajudante de luz embutida e famílias de retrovisor, freio e concha: ADIAR até o relatório do carro.
- Operação nova de forma e pasta de domínio: ADIAR sem data.

## Incluído

O alinhamento pela `alinhar-modelagem`, com a escala, os traços trocados, a lista de partes e os critérios de reprovação. A prancha cotada do fastback genérico. O quarto traseiro como piloto. A lataria inteira, os painéis, os vidros, a frente e a traseira, os acessórios, o interior simples e as rodas, como montagem v5 em etapas. A saliência declarada na ondulação e a pergunta de traço de fabricante, cada uma com fixture neutra. O relatório de atritos e as linhas de backlog dos achados de processo.

## Excluído

Operação nova de forma no núcleo. Chassi, suspensão, motor e porta que abre. Rebaixo de fundo fechado, aba de borda e a face de área nula, que são de outros planos. Material fora da paleta. Qualquer imagem de referência, nome de modelo ou de fabricante no repositório. Mudança no furgão ou no sedã.

## Invariantes

O núcleo não conhece veículo. O acervo sai com a mesma malha. A ondulação sem saliência declarada dá o mesmo resultado de antes. A forma é aprovada pela pessoa por imagem, e nenhuma medida a aprova sozinha.

## Fatias

1. Alinhamento, traços e prancha. A pessoa fixa as medidas de classe, o nível, as partes e escolhe por `esbocar-opcoes` a lanterna, a grade e as tomadas do capô que deixam o carro genérico. A pergunta de traço de fabricante entra em `veiculo.json`. A prancha cotada das quatro vistas passa pelo crítico e pela pessoa. Saída: `ALINHAMENTO.md`, a prancha e o `andaime.json` com os pontos duros.
2. Quarto traseiro como piloto, do meio da porta para trás, meio carro: para-lama saliente, coluna caindo até a tampa, vão do vidro lateral e arco da roda, numa chapa contínua pelas curvas da prancha. Antes do crítico entra a saliência declarada na ondulação, com fixture neutra e teste. Validações: ondulação sem falha fora da saliência declarada, `raio:aresta` dentro de 20%, luz rasante e curvatura, silhueta contra a prancha na tolerância do alinhamento e crítico cego. Saída: a região com nota 7 ou mais, ou a parada.
3. Ponto de decisão. A pessoa vê o piloto e decide se a lataria segue numa chapa só ou em dois andares, com a recomendação do relatório.
4. Lataria inteira com simetria e painéis por `paineisPorVaos`, medida por etapa.
5. Frente e traseira: para-choques, grade, faróis, lanternas, difusor, escapes, spoiler e tomadas.
6. Vidros, borrachas, interior simples, retrovisores e maçanetas.
7. Rodas e freios pela roda esportiva aprovada, ou pelo perfil `carro` da família como provisório, com forro dos arcos.
8. Objeto inteiro: montagem v5 em etapas fixas, auditoria, crítico do objeto e aprovação. Relatório de atritos e a extração das famílias que ele confirmar.

## Gate de saída

1. O carro resolve como montagem v5, com cada etapa fixa pela pessoa e nota 8 do crítico sem contexto no objeto.
2. Nenhuma falha de ondulação fora das saliências declaradas, vãos de painel dentro de 0,2 mm do declarado e iguais nos dois lados.
3. A pergunta de traço de fabricante consta do alinhamento respondida, e nenhum arquivo traz nome de modelo ou de fabricante.
4. Cada correção de ferramenta tem fixture sem domínio, teste e o acervo com o mesmo resultado.
5. Cada achado do relatório responde se o processo o teria pego sozinho.
6. `npm run gates` verde e a decisão Agent-First registrada para cada interface tocada.

## Riscos e parada

Se o quarto traseiro não chegar a 7 em três rodadas, o plano para e volta à pessoa com o registro, como no furgão. Se a união da coluna com o para-lama pedir operação nova, o plano para, porque isso contradiz o inventário. Se a medida de uma etapa passar de 10 minutos, a etapa é dividida antes de seguir. Se a roda esportiva não fechar, o carro usa o perfil `carro` da família e a roda de liga fica como pendência. A forma pode continuar parecida demais com o modelo comercial depois das trocas; quem julga isso é a pessoa, na prancha, antes de qualquer malha.

## Decisões da pessoa

Decidido em 2026-11-14, com as sete recomendações aprovadas. A lanterna, o contorno da grade e o desenho das tomadas do capô são trocados por opções desenhadas que a pessoa escolhe no alinhamento, e a proporção de fastback fica. As medidas de classe são 4.750 mm de comprimento, 1.900 de largura, 1.380 de altura, 2.720 de entre-eixos e pneu de 680 mm. O nível é o oficial de carroceria, com interior em volumes simples, sem chassi e sem porta que abre. As rodas usam o perfil `carro` da família `roda-pneu` até a roda esportiva fechar. As tomadas do capô e a maçaneta saem como abertura com peça por trás, sem esperar o plano do rebaixo. O retrovisor é extraído como família no fim, o freio depois da roda esportiva, a maçaneta só depois do rebaixo, e farol e lanterna ficam como ajudante geral de luz embutida.

A ativação está aprovada com uma condição: o plano passa a ativo, como quinto na ordem de prioridade e só com as fatias 1 e 2, quando as quatro imagens de referência estiverem em `tmp/carro/`. Em 2026-11-14 a pasta não existe, e o estado segue rascunho. Ao ativar, o território declarado é o proposto no alto deste plano, e o restante das fatias depende do ponto de decisão da fatia 3.

Uma decisão continua pendente: o território da família `procedural/familias/roda-pneu/`, que pertence ao plano do furgão realista. A pessoa vai decidir se o perfil de roda esportiva passa por aquele plano ou se o território muda. Até a resposta, este plano não toca a família.

## Fechamento

Preencher somente ao concluir ou cancelar.
