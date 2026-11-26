# tools/ — as ferramentas do Modelar

Gerado de `tools/registro-de-ferramentas.json` por `npm run ferramentas:registro:gerar`; não edite à mão. O registro tem uma entrada por ferramenta de linha de comando desta pasta (o arquivo, os comandos de `package.json`, o que faz e o tipo), e `npm run ferramentas:registro:check` recusa a que ficar de fora, a entrada sem arquivo e o módulo sem chamador. Ferramenta nova nasce na pasta do assunto dela (`tools/modelar/` para peça e bancada, `tools/mapa/` para documento e processo, `tools/gates/` para a bateria), responde a `--ajuda` e ganha entrada no registro. As regras de quem muda esta pasta estão em `tools/CLAUDE.md`.

## De uso (108)

Quem trabalha chama, com `npm run <comando> -- <argumentos>`; a que não tem comando roda pelo arquivo.

| Comando | O que faz |
|---|---|
| `historico:conferir` | Varre o histórico inteiro do git atrás de termo proibido, malha ou cena, antes de o repositório ficar público. |
| `node tools/blender/gabarito-booleana.mjs` | Usa a booleana exata e o bevel do Blender como gabarito para conferir a booleana do núcleo. |
| `node tools/blender/imagens.py` | Desenha a grade em milímetro nas vistas ortográficas e monta a folha da régua do Blender. |
| `node tools/blender/oraculo-subdivisao.mjs` | Gera a fixtura do oráculo da subdivisão com o modificador Subdivision Surface do Blender. |
| `gates:vigiar` | Fica em segundo plano e roda os gates que cada edição afeta enquanto o trabalho acontece. |
| `banco:indice:gerar` | Gera o índice de docs/modelar/banco-de-provas/README.md das pastas, e confere que ele está em dia. |
| `ferramentas:registro:check`, `ferramentas:registro:gerar` | Confere este registro contra a árvore (linha de comando sem entrada, entrada sem arquivo, módulo sem chamador) e gera o tools/README.md. |
| `roteiros:gerar` | Gera a página dos roteiros de leitura e os blocos do CLAUDE.md a partir de roteiros.json, e confere que estão em dia. |
| `node tools/mcp/servidor.mjs` | Servidor MCP local que entrega as ferramentas de revisão e de autoria à IA sem linha de comando. |
| `comparar:revisao` | Compara dois JSON de revisão de um pacote de modelagem e escreve a diferença em JSON canônico. |
| `validar:critica` | Valida o arquivo de crítica de um pacote de modelagem sem abrir navegador nem peça. |
| `fechar:aceite:visual` | Fecha a revisão de um pacote depois de conferir briefing, modelo, arquivos e crítica. |
| `preparar:modelagem` | Cria o esqueleto de um pacote de modelagem e recusa pasta que já existe. |
| `revisar:modelagem` | Mede o alvo de um pacote com a régua sem navegador e captura as quatro câmeras da bancada como evidência. |
| `validar:modelagem` | Valida um pacote de modelagem: bytes canônicos e o alvo conferido pela régua sem navegador. |
| `absorver` | Mede se a receita reescrita chega onde a pessoa deixou a peça ao arrastar os cantos na bancada. |
| `alisar` | Calcula quanto mover cada valor editável de uma receita para tirar a ondulação da superfície de subdivisão sem afastá-la dos pontos medidos. |
| `malha:assinatura` | A assinatura de cada parte e da peça inteira, e a comparação de duas rodadas. |
| `ativar:bancada` | Ativa uma peça ou montagem procedural na sessão aberta da bancada. |
| `node tools/modelar/cadeiras-medida.mjs` | A medida da família cadeira contra o esboço alvo de cada perfil, e a prancha com os dois lado a lado. |
| `capacidade` | Lista os ajudantes de gaiola e imprime a ficha de um deles, recortada do cabeçalho do arquivo. |
| `casamento:vista` | Duas medidas do modelo contra a imagem de referência numa vista, as duas tiradas da malha e não de uma captura com luz. |
| `comecar` | A entrada por intenção: dado o roteiro, diz o que ler, a skill, os comandos e o passo seguinte. |
| `node tools/modelar/comparar-silhueta.mjs` | Compara a silhueta de uma receita do acervo com a de um modelo de referência medido por modelo-de-referencia.mjs. |
| `conferir:referencia` | Desvio em MILÍMETRO entre a silhueta lateral de partes de uma peça e a borda correspondente de uma foto de referência. |
| `conferir:juntas` | Mede o vão de contato e a interferência nas interfaces entre os componentes de uma peça. |
| `malha:conferir` | Imprime a topologia da malha de uma receita, com os avisos do motor. |
| `conferir:pedido` | Lê um pedido da mecatrônica e escreve a resposta de cada item medindo a forma de agora. |
| `node tools/modelar/conferir-placa.mjs` | Confere o cobre traçado de uma placa declarada e desenha o mapa das redes. |
| `conferir:pontos` | Mede os PONTOS DECLARADOS de uma peça contra a malha que a receita produz, e devolve o desvio de cada um em milímetro. |
| `node tools/modelar/conferir-retrato-do-acervo.mjs` | Prova que o rastreio declarado do retrato (ESCRITA_DAS_OPERACOES) não muda nada na malha. |
| `conferir:vistas` | A rodada inteira de conferência de um rascunho contra as imagens de referência num comando só. |
| `emendas` | Mede, nas linhas onde dois trechos da chapa se encontram, a fresta, o ângulo entre as normais e o salto de curvatura. |
| `contorno` | Separa as partes de uma imagem de referência por watershed com sementes nomeadas e tira o contorno de cada uma. |
| `custo:peca` | A tabela de custo de cada peça de um objeto, lida dos registros de rodada e do registro das etapas. |
| `descrever:gesto` | Descreve em palavras a edição que a pessoa fez na bancada, antes de a receita ser reescrita. |
| `descrever:montagem:persistida` | Imprime o contexto de uma montagem persistida em JSON, com as interseções auditadas. |
| `descrever:montagem` | Lê uma montagem piloto e imprime o diagnóstico declarativo do encaixe. |
| `descrever` | Mede uma peça sem navegador: caixa, partes, contatos, malha e avisos, em texto ou JSON. |
| `distancia:pele` | Mede, por região, a distância da superfície limite da chapa à pele analítica que a receita declara, e junta o veredito ao da zebra. |
| `esboco:nucleo` | Monta as opções de forma de um esboço com as operações do núcleo e as captura na bancada, lado a lado. |
| `etapas` | O registro de etapas de uma montagem v5, em disco, e a única porta para fixar uma etapa. |
| `exportar:ficha` | CLI que exporta a ficha de um objeto montado para a ponte com o nos-mecatronica. |
| `exportar:gltf` | CLI que grava uma receita procedural como glTF 2.0 binário (.glb), com os materiais dela. |
| `exportar:obj` | CLI para exportação atômica e segura de receitas procedurais em Wavefront OBJ (.obj). |
| `exportar:step` | CLI para exportação atômica e segura de receitas procedurais em formato STEP. |
| `fluxo:objeto` | Em que passo um objeto está, da referência à etapa fixa, e o comando exato que vem agora. |
| `node tools/modelar/folha-comparativa.mjs` | A fonte e a receita lado a lado, nas MESMAS câmeras e na MESMA escala, e a vista de diferença que marca onde a receita sobra ou falta. |
| `forma:esboco` | A forma de uma receita contra a forma do esboço que ela refina, sem mudar a receita. |
| `malha:lascas` | Lista cada face fina de uma receita. |
| `leitura:regioes` | Corta a vista de referência e a captura do rascunho na mesma grade e as põe lado a lado, região por região. |
| `diario` | Lê o diário da oficina e responde onde o tempo foi e onde o trabalho emperrou. |
| `linhas:modelo` | As linhas que o modelo tem numa vista, tiradas da malha e não de uma imagem com luz. |
| `receita:mapa` | O mapa de uma receita do acervo, para ler só o trecho que se precisa. |
| `desvio` | Pinta uma peça pela distância, com sinal e em milímetro, a uma superfície lisa ajustada a ela. |
| `material` | Imprime tudo que pertence a uma peça e onde está. |
| `node tools/modelar/medidas-da-fonte.mjs` | Tira de fonte-partes.json, em milímetro, o ponto de partida das três vistas da carroceria. |
| `node tools/modelar/medir-importar-receita.mjs` | O tempo de importar cada receita e gerar os passos dela, num processo novo. |
| `medir:transcricao` | Reparte por etapa os tokens que entraram no contexto de um agente, a partir da transcrição JSONL. |
| `node tools/modelar/modelo-de-referencia.mjs` | Estuda uma malha de terceiros (OBJ, FBX ou glTF) como REFERÊNCIA de forma, sem a levar ao repositório. |
| `modelo:sobrepor` | Projeta a silhueta ortográfica da malha sobre a prancha ou sobre a imagem de referência calibrada. |
| `objeto` | O estado das referências de um objeto que passa por mapa de partes e prancha de contornos, e o que vem a seguir. |
| `bancada`, `bancada:tela`, `revisar` | Captura as vistas de uma peça na bancada, sem janela, em PNG. |
| `olhar:montagem` | Captura as vistas de uma montagem persistida na bancada. |
| `olhar` | Rasteriza SVG em PNG para a IA olhar o desenho. |
| `ondulacao` | Acha onde a superfície de subdivisão de uma receita ondula, salta ou dobra fora dos vincos declarados, e diz quanto em milímetro. |
| `parametros` | Lista os parâmetros que dá para mexer numa receita, com faixa e valor. |
| `pente` | Desenha e mede o pente de curvatura de uma seção da peça. |
| `node tools/modelar/perfil-da-execucao.mjs` | Mede a execução de uma receita sem mudar nada nela (fatia 1 do plano do planejador de execução). |
| `perfil:cor` | Classifica os pixels de uma vista pela cor do material e mede a largura de cada cor em cada altura. |
| `node tools/modelar/perguntas-do-alinhamento.mjs` | As perguntas do alinhamento da família declarada, filtradas pelas partes. |
| `planejado` | Compara o andaime planejado com a montagem executada, parte por parte, no quadro do conjunto. |
| `node tools/modelar/prancha-de-referencia.mjs` | Põe a vista da peça ao lado da foto de referência, as duas na mesma escala em milímetro. |
| `prancha:coerencia` | Confere coerência geométrica entre pranchas parciais do mesmo objeto (lateral, frontal, traseira, planta/topo). |
| `contorno:prancha` | A prancha de uma vista desenhada com os contornos que npm run contorno tirou da imagem de referência, em milímetro. |
| `node tools/modelar/prancha/prancha-referencia.mjs` | Lê uma prancha rasterizada, calibra pixel para milímetro por duas medidas e extrai a silhueta em milímetro. |
| `prancha:sobrepor` | Projeta a geometria limpa de uma prancha, em alto contraste, sobre a imagem de referência calibrada. |
| `node tools/modelar/prancha/prancha.mjs` | Motor de prancha ortográfica: recebe a especificação em milímetro e devolve o SVG com o relatório medido dele. |
| `referencia:grade` | Estampa uma grade numerada em milímetro e pixel sobre uma imagem de referência calibrada. |
| `procedencia:check` | Confere a procedência (medido, derivado, resolvido ou declarado) da fonte de restrições. |
| `proporcoes` | A fonte única das medidas de uma montagem, e a conferência de que os outros lugares a seguem. |
| `raio:aresta` | Mede o raio de cada aresta de caráter de uma peça, sobre a malha final. |
| `ramos:parados` | Lista os ramos do remoto com commits fora da main, a data do último e se o CI os recusaria hoje. |
| `receita:esqueleto` | O esqueleto da receita de uma peça que ainda vai ser alinhada. |
| `silhueta:referencia` | Do contorno de uma imagem ao arquivo de trechos que silhueta:desvio lê, em milímetro e nos eixos do modelo. |
| `node tools/modelar/regravar-ajustes-de-curva.mjs` | Refaz os ajustes de curva lisa de que uma receita precisa e grava o resultado ao lado dela. |
| `node tools/modelar/reguas-de-malha/resumo-do-acervo.mjs` | Roda as três réguas de malha sobre o acervo inteiro e imprime a tabela. |
| `crista:regularidade` | Percorre cada crista da superfície de subdivisão e acusa onde o que ela mede varia de repente, com a posição em mm. |
| `esboco:nucleo` | Faz a cópia isolada achar na raiz do repositório principal o pacote que ela não tem. |
| `retrato:acervo` | Mede cada peça do acervo e compara dois retratos, para saber o que uma mudança no núcleo fez com as peças que já estavam aprovadas. |
| `rodada` | Mede a receita, registra a rodada do laço de modelagem com a decisão da pessoa e diz a próxima ação. |
| `silhueta:desvio` | O desvio da silhueta de uma peça contra um contorno de referência, em milímetro, por trecho. |
| `silhueta:pedida` | Quanto a malha de uma parte se afasta do corpo pedido a lacosPelasVistas, faixa por faixa de altura. |
| `sobra:partes` | Quanto de uma parte aparece fora do contorno da parte que a contém, vista por vista. |
| `suavidade` | Calcula o índice de suavidade de cada região da chapa. |
| `node tools/modelar/tracar-placa.mjs` | Traça o cobre de uma placa declarada pela lista de redes do pedido e grava o traçado salvo. |
| `uso` | Registra o que a IA pede às ferramentas de entrada e resume o registro. |
| `vao:partes` | O vão e o degrau entre partes vizinhas, medidos sobre a malha, e a lista das partes soltas. |
| `variantes` | Captura as variantes de uma receita lado a lado. |
| `varrer` | Varre os parâmetros de uma receita e devolve os candidatos medidos, sem escrever nela. |
| `vincos-das-linhas` | Casa as linhas 3D lidas do pacote cego com as colunas e as estações nomeadas da gaiola de uma receita. |
| `vista:rapida` | A imagem sombreada de uma opção de esboço numa vista, tirada da malha em JavaScript, sem navegador. |
| `node tools/modelar/vistas-da-receita.mjs` | A folha de seis vistas de uma receita .js do acervo, cada parte com uma cor, para olhar a forma e a divisão em partes. |
| `node tools/modelar/vistas-de-passos.mjs` | A folha de seis vistas de um objeto convertido do esboço em receita do Modelar, para conferir o que a conversão e os ajustes fizeram. |
| `vistas:superficie` | A luz rasante e a curvatura da lataria de uma peça, e a conferência de que o pacote do crítico as trouxe. |
| `vistas:critica` | Monta, numa chamada, o pacote que a crítica visual precisa receber. |
| `node tools/modelar/vistas-texturizadas.mjs` | Captura três vistas de uma peça com a textura que a exportação OBJ gera, para julgar o acabamento. |
| `zebra` | Conta as ilhas de reflexo e os laços fechados de listra da zebra em cada região da chapa, por faixa de comprimento de onda. |

## De gate (42)

A bateria (`npm run gates`) ou o CI chama, e cada uma roda sozinha para conferir uma coisa só: `arquitetura/fronteira-da-bancada.mjs`, `arquitetura/independencia-catalogo.mjs`, `arquitetura/mapear-motor-procedural.mjs`, `arquitetura/nome-antigo.mjs`, `bancadas/porteiro.mjs`, `catalogo/gerar-catalogo-capacidades.mjs`, `ci/juntar-a-main.sh`, `gates.mjs`, `gates/argumentos-essenciais.mjs`, `gates/recusas-exercitadas.mjs`, `mapa/citacoes.mjs`, `mapa/decisoes.mjs`, `mapa/estrutura-docs.mjs`, `mapa/leitura-obrigatoria.mjs`, `mapa/links.mjs`, `mapa/mapa.mjs`, `mapa/mecanismos.mjs`, `mapa/planos.mjs`, `mapa/reguas-nos-gates.mjs`, `mapa/territorio-do-envio.mjs`, `mapa/toc.mjs`, `modelar/banco-de-provas.mjs`, `modelar/calibracao-do-critico.mjs`, `modelar/familia.mjs`, `modelar/ferramentas-por-objeto.mjs`, `modelar/guardas/guarda-acervo.mjs`, `modelar/guardas/guarda-bancada-vazia.mjs`, `modelar/guardas/guarda-camera-livre.mjs`, `modelar/guardas/guarda-edicao-de-malha.mjs`, `modelar/guardas/guarda-escolha-da-peca.mjs`, `modelar/guardas/guarda-gesto.mjs`, `modelar/guardas/guarda-inspecao-par.mjs`, `modelar/guardas/guarda-junta-da-bancada.mjs`, `modelar/guardas/guarda-portas-bancada.mjs`, `modelar/guardas/guarda-referencia-da-peca.mjs`, `modelar/guardas/guarda-referencial.mjs`, `modelar/guardas/guarda-temas-e-visoes.mjs`, `modelar/guardas/guarda-tempo-do-descrever.mjs`, `modelar/guardas/rodar-guardas.mjs`, `modelar/origens-check.mjs`, `reguas-de-texto/reguas-de-texto.mjs`, `testes-lentos.mjs`.

## Internas (11)

Outra ferramenta chama: `arquitetura/termos-proibidos.mjs`, `modelar/dobra-da-superficie.mjs`, `modelar/guardas/etapas-do-acervo.mjs`, `modelar/medir-arvore-para-migracao.mjs`, `modelar/migrar-etapas-para-impressao.mjs`, `modelar/pedidos-da-pessoa.mjs`, `modelar/perguntas-da-peca.mjs`, `modelar/prancha/prancha-geometria.mjs`, `modelar/preenchimento-da-rede.mjs`, `modelar/sobreposicao-de-cortes.mjs`, `modelar/vinco-oculto.mjs`.

## Sem chamador, declarados (28)

Nenhum comando, import de ferramenta viva, skill ou configuração chama o que está abaixo; o motivo de cada um ficar está no registro.

`arquitetura/nucleo-sem-three.mjs`, `blender/`, `modelar/acervo-reduzido.mjs`, `modelar/cadeiras-medida.mjs`, `modelar/capacidade-symlink.mjs`, `modelar/comparar-silhueta.mjs`, `modelar/conferir-retrato-do-acervo.mjs`, `modelar/derivar-campanha-revalidacao.mjs`, `modelar/esboco-alinhar-caixas.mjs`, `modelar/esboco-para-passos.mjs`, `modelar/exportar-peca.mjs`, `modelar/familia-com-esboco.mjs`, `modelar/folha-comparativa.mjs`, `modelar/fonte-sintetica.mjs`, `modelar/frente-da-fonte.mjs`, `modelar/guardas/etapas-do-acervo.mjs`, `modelar/medidas-da-fonte.mjs`, `modelar/medir-importar-receita.mjs`, `modelar/modelo-de-referencia.mjs`, `modelar/perfil-da-execucao.mjs`, `modelar/receita-externa.mjs`, `modelar/reguas-de-malha/resumo-do-acervo.mjs`, `modelar/silhueta-da-superficie.mjs`, `modelar/triangulos-da-receita.mjs`, `modelar/vistas-da-receita.mjs`, `modelar/vistas-de-passos.mjs`, `modelar/vistas-texturizadas.mjs`, `oficina/conferir-malha.ts`.
