# Ferramentas e documentação: o registro de ferramentas e a lista do que está sem chamador

Pasta do plano [ferramentas e documentação](../../planos/2026-11-26-ferramentas-e-documentacao.md), fatia 2. A evidência de partida é a [frente das ferramentas](../analise-do-projeto-2026-11-26/ferramentas.md) da análise do projeto, recomendações 1 e 7.

## O que foi medido em 2026-11-26

O comando `npm run ferramentas:registro:check` leva menos de um segundo e confere 324 módulos de `tools/` (código fora de `tools/fixtures/`, de teste e de declaração de tipo). Deles, 164 são linha de comando e têm entrada em `tools/registro-de-ferramentas.json`: 109 de uso, 42 de gate e 13 internas. Antes desta fatia, 39 linhas de comando não tinham comando em `package.json`; a zebra numérica, a distância à pele, a conferência de pontos, a rodada de modelagem e o preenchimento da rede ganharam `npm run zebra`, `distancia:pele`, `conferir:pontos`, `rodada` e `preenchimento:rede`, e as cinco já respondiam a `--ajuda` com saída zero. Restam 37 sem comando, todas com entrada no registro e o caminho do arquivo no `tools/README.md`.

A conferência acha 91 módulos sem chamador, isto é, que nenhum comando, passo do CI, skill, configuração ou código de fora de `tools/` chama, nem direto nem por um módulo vivo que os importe. Trinta estão em `tools/blender/`, que é opcional e roda à mão. Trinta e sete são apoio de teste: trinta em pastas `fixtures/` de dentro de `tools/modelar/` e de `tools/mcp/` e sete soltos. Os outros 24 somam 3.548 linhas e estão declarados um a um no campo `semChamador` do registro, com o motivo: 23 esperam decisão e um (`visor-montagem.js`) é carregado pela página que a captura de montagem abre. A análise contou 21 arquivos e perto de 2.100 linhas; a diferença vem de a conferência seguir a cadeia de imports (o que só um módulo sem chamador importa também fica sem chamador), de não contar a citação em comentário e de não contar o caminho citado no meio de uma mensagem de texto.

## Apoio de teste, que fica

Estes existem para os testes e não pedem decisão: `tools/arquitetura/nucleo-sem-three.mjs` (a varredura que prova que o núcleo de autoria não importa Three.js), `tools/modelar/acervo-reduzido.mjs` (monta um acervo de três peças pequenas em `tmp/`), `tools/modelar/capacidade-symlink.mjs` (diz se a máquina deixa criar ligação simbólica), `tools/modelar/fonte-sintetica.mjs` (monta um `partes.json` de fonte a partir de uma receita, para os testes do estudo de modelo de terceiros), `tools/modelar/guardas/etapas-do-acervo.mjs` (a conferência de um registro de etapas pela impressão do aceite, que só o teste dela roda), `tools/modelar/medir-importar-receita.mjs` (o processo filho que mede o tempo de importar cada receita) e `tools/oficina/conferir-malha.ts` (a conferência de malha que 26 testes de operação do núcleo chamam). O `fonte-sintetica.mjs` sai junto se o grupo do estudo de modelo de terceiros for apagado, e a guarda das etapas do acervo merece a pergunta de por que nenhum gate a roda.

## À espera da decisão da pessoa: apagar ou religar

| Arquivo em `tools/modelar/` | Linhas | O que fazia | Quem ainda o toca |
|---|---|---|---|
| `modelo-de-referencia.mjs` | 115 | Estuda uma malha de terceiros (OBJ, FBX ou glTF) como referência de forma, sem levá-la ao repositório, e grava as partes medidas. | Um teste e dois guias |
| `folha-comparativa.mjs` | 213 | Desenha a fonte e a receita lado a lado, nas mesmas câmeras e escala, e a vista de diferença. | Um teste e o guia de veículos |
| `comparar-silhueta.mjs` | 145 | Compara a silhueta de uma receita com a do modelo de referência medido. | Dois testes e o guia de veículos |
| `medidas-da-fonte.mjs` | 120 | Tira do arquivo de partes da fonte, em milímetro, o ponto de partida das três vistas da carroceria. | Um teste e o guia de veículos |
| `frente-da-fonte.mjs` | 71 | Diz de que lado fica a frente de uma malha de referência e confere que o arquivo de partes a registrou. | Um teste e os quatro acima |
| `silhueta-da-superficie.mjs` | 55 | Mede a extensão de uma malha em fatias ao longo de um eixo, na superfície e não nos vértices. | Um teste e três do grupo |
| `triangulos-da-receita.mjs` | 31 | Devolve os triângulos de uma receita em milímetro, com a parte de cada um. | Quatro do grupo |
| `vistas-da-receita.mjs` | 65 | Desenha a folha de seis vistas de uma receita do acervo, cada parte com uma cor. | Três testes e o guia de veículos |
| `vistas-de-passos.mjs` | 161 | Desenha a folha de seis vistas de um objeto convertido do esboço em receita. | Três testes |
| `vistas-texturizadas.mjs` | 108 | Captura três vistas de uma peça com a textura que a exportação OBJ gera, para julgar o acabamento. | Só o guia de veículos |
| `esboco-para-passos.mjs` | 369 | Converte as formas de um esboço em passos de uma receita do Modelar, sem agente. | Quatro testes e dois desta lista |
| `esboco-alinhar-caixas.mjs` | 180 | Alinha as caixas de um esboço que a receita de origem deixou desencontradas por pouco. | Um teste e o conversor acima |
| `receita-externa.mjs` | 323 | Traduz a receita de um repositório externo da pessoa para o esboço do Modelar, e de volta. | Quatro testes e dois desta lista |
| `cadeiras-medida.mjs` | 304 | Mede a família cadeira contra o esboço alvo de cada perfil e desenha a prancha com os dois lado a lado. | O teste da família cadeira |
| `familia-com-esboco.mjs` | 118 | Adapta a conferência entre uma família e o componente do esboço de mesmo nome. | Um teste e o contrato da família |
| `exportar-peca.mjs` | 290 | Roda o núcleo e grava a peça resolvida num arquivo que o produto só lê. | Quatro testes e o contrato de arquitetura |
| `perfil-da-execucao.mjs` | 167 | Mede a execução de uma receita, operação por operação, sem mudar nada nela. | Um teste e a conferência abaixo |
| `conferir-retrato-do-acervo.mjs` | 79 | Prova que o rastreio declarado do retrato do acervo não muda nada na malha. | Um teste |
| `derivar-campanha-revalidacao.mjs` | 17 | Liga o impacto global de uma mudança à campanha de revalidação de um estudo antigo. | Dois testes |
| `reguas-de-malha/resumo-do-acervo.mjs` | 52 | Roda as três réguas de malha sobre o acervo inteiro e imprime a tabela. | Ninguém |
| `reguas-de-malha/costura-registrada.mjs` | 36 | Compara a costura que o `unir` registra com a costura geométrica da malha que ele entregou. | O teste dela e o de uma fixtura |
| `migrar-etapas-para-impressao.mjs` | 219 | Migra o registro de etapas de uma montagem da versão 2 para a 3. | Dois testes; a migração já foi feita |
| `medir-arvore-para-migracao.mjs` | 73 | Mede uma montagem dentro da árvore de um commit antigo, para a migração acima. | Só a migração acima |

Os dez primeiros são o grupo do estudo de modelo de terceiros, que só se importa entre si; o guia `docs/modelar/guias/modelar-veiculos.md` e os `referencias/alvo.md` de algumas peças ainda mandam rodá-los pelo arquivo. Os três seguintes são a conversão do esboço antigo em receita. Recomendo religar o grupo do estudo com um comando só (`modelo-de-referencia.mjs`, que é a entrada dele), porque os guias o usam; apagar a conversão do esboço antigo com `cadeiras-medida.mjs` e `familia-com-esboco.mjs`, se o esboço antigo saiu em 2026-11-05 como o gate da calibração registra; dar comando a `resumo-do-acervo.mjs` e a `perfil-da-execucao.mjs`, que são medidas úteis sem porta; e conferir o `exportar-peca.mjs` com cuidado antes de qualquer coisa, porque o contrato de arquitetura o descreve como a porta de exportação para o produto e hoje nenhum comando o roda. As duas ferramentas da migração dos registros de etapas podem ser apagadas, porque a migração já foi feita, e a régua `costura-registrada.mjs` merece comando ou lugar na guarda do acervo, se a costura do `unir` ainda for conferida.

## Fatia 3: onde cada ferramenta de uso aparece, medido em 2026-11-26

O registro ganhou o campo `aparece` na ferramenta de uso, com até três lugares que a citam hoje, e `npm run ferramentas:registro:check` reprova a ferramenta de uso que nenhum roteiro, skill ou guia cita. Conta como citação o `npm run <comando>` de um comando dela ou o caminho do arquivo desde `tools/`. Roteiro é o `roteiros.json` (os comandos, o passo e o que se confere). Skill são as skills, as definições de agente e as regras comuns dos agentes. Guia são os documentos de `docs/modelar/usar/`, `guias/`, `contratos/` e `blender/`, a página de entrada, o índice, o `CLAUDE.md` de cada pasta e o README de cada módulo. Plano, pesquisa, decisão e banco de provas não contam.

Antes da fatia o registro tinha 109 ferramentas de uso, e 18 delas não apareciam em nenhum desses lugares, fora 7 que já estão declaradas em `semChamador` ou em `apoioDeTeste` e esperam a decisão da fatia 4. A decisão da pessoa fala em 29 de 108; a diferença vem de a conferência contar como guia o contrato, o `CLAUDE.md` de pasta e o README de módulo, e de tirar da conta as 7 declaradas. Depois da fatia são 165 entradas: 105 de uso, 42 de gate e 18 internas, e nenhuma de uso sem citação fora as 7 declaradas. A primeira citação de cada ferramenta de uso é um roteiro em 25 delas, uma skill em 36 e um guia em 37.

### Citadas, com o lugar e o momento de uso

| Comando | Onde passou a aparecer | Quando usar |
|---|---|---|
| `npm run zebra` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | a superfície lisa de uma chapa parece ondular no reflexo |
| `npm run distancia:pele` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | a receita declara a pele analítica e é preciso a distância por região |
| `npm run preenchimento:rede` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | o miolo de uma rede de curvas sai torto depois de alisar |
| `npm run casamento:vista` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | há imagem de referência de uma vista e é preciso saber onde o material e as divisas se afastam |
| `npm run perfil:cor` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | a medida que falta está na imagem, por cor de material |
| `npm run silhueta:pedida` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | um corpo foi pedido pelas vistas e é preciso o desvio por faixa de altura |
| `npm run material` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | antes de mover, renomear ou apagar uma peça |
| `npm run proporcoes` | o roteiro `modelar/montar` e `MEDIDAS-AVULSAS.md` | as medidas de uma montagem estão escritas em mais de um lugar |
| `npm run planejado` | o roteiro `modelar/montar` e `MEDIDAS-AVULSAS.md` | depois de executar as partes de uma montagem por etapas |
| `npm run sobra:partes` | o roteiro `modelar/montar` e `MEDIDAS-AVULSAS.md` | uma parte deveria ficar dentro do contorno de outra |
| `npm run descrever:montagem` | `docs/modelar/usar/MEDIDAS-AVULSAS.md` | para ler o diagnóstico de encaixe de um dos quatro pilotos |
| `npm run ramos:parados` | o roteiro `mudar/plano` | antes de abrir trabalho novo, para ver o que ficou fora da main |
| `npm run pedido` (novo) | o roteiro `mudar/plano` | ao despachar um agente para a fatia de um plano |

As quatro exportações já apareciam (`exportar:step` e `exportar:obj` no guia de autoria e na página de entrada, `exportar:gltf` e `exportar:ficha` só no README do módulo) e passaram a ter página própria, `docs/modelar/usar/EXPORTACAO.md`, entregue pelo roteiro `modelar/exportar`. A página `MEDIDAS-AVULSAS.md` é nova e existe porque o guia mais próprio de cada medida (o de carroceria para a zebra, a distância à pele e o preenchimento da rede; o de conferência contra a referência para o casamento da vista, o perfil por cor e a silhueta pedida) está fora do território deste plano. Quem conduz pode mover cada parágrafo para o guia do assunto, e o registro acompanha com `npm run ferramentas:registro:gerar`.

### Marcadas como internas, por serem de manutenção

| Ferramenta | Por que não é de uso |
|---|---|
| `tools/blender/imagens.py` | desenha a grade e monta a folha para as outras ferramentas do Blender, que a chamam |
| `npm run banco:indice:gerar` | regrava o índice do banco de provas, e a bateria confere se está em dia |
| `tools/mcp/servidor.mjs` | o servidor MCP, que a configuração (`.mcp.json` e a do Codex) liga, e ninguém chama pela mão |
| `npm run medir:transcricao` | mede o custo em tokens de uma sessão de agente, para quem estuda o processo |
| `npm run procedencia:check` | conferência de contrato de dados que só o teste dela e a lista das réguas citam |

### Fora da conta, à espera da fatia 4

`tools/blender/gabarito-booleana.mjs`, `tools/modelar/cadeiras-medida.mjs`, `tools/modelar/conferir-retrato-do-acervo.mjs`, `tools/modelar/medir-importar-receita.mjs`, `tools/modelar/perfil-da-execucao.mjs`, `tools/modelar/reguas-de-malha/resumo-do-acervo.mjs` e `tools/modelar/vistas-de-passos.mjs` são de uso no registro, não aparecem em roteiro, skill nem guia, e já estão declaradas sem chamador ou como apoio de teste. A conferência as deixa passar para a mesma ferramenta não ser recusada duas vezes pela mesma decisão pendente.

## Fatia 3: os roteiros e o orçamento, medidos em 2026-11-26

`npm run leitura:obrigatoria` passou a somar a skill que o passo seguinte manda aplicar e a lista de leitura não traz. Só o roteiro `modelar/peca/nova` mudou de medida: de 16.487 para 26.489 bytes, porque os 10.007 bytes da skill `alinhar-modelagem` já eram lidos e não eram contados. O orçamento dele subiu de 16.500 para 26.500 bytes no mesmo dia, sem folga nova (11 bytes), e a linha de base de 62.482 continua longe. Nada saiu da leitura para o orçamento caber.

Os três ramos novos nasceram com o orçamento rente à leitura: `modelar/rodada` lê 11.881 bytes (orçamento 11.900, linha de base 32.617, que é o contrato, a skill do laço e as definições do modelador e do crítico), `modelar/montar` lê 12.768 (orçamento 12.800, linha de base 29.182, os dois documentos de montagem inteiros) e `modelar/exportar` lê 5.267 (orçamento 5.300, linha de base 27.249, a página de entrada e os três READMEs de módulo). A exportação ficou sob `modelar` porque um ramo novo no primeiro nível acrescentava uma linha ao `CLAUDE.md`, que todo roteiro lê, e o roteiro `modelar/opcoes` passava da linha de base dele por 108 bytes. Com a pergunta de `modelar` reescrita, o `CLAUDE.md` foi de 2.609 para 2.604 bytes.

## Limites da conferência

Em código, conta como chamada o import de verdade e a string cujo texto inteiro é o caminho do módulo (o caminho desde `tools/`, o relativo que resolve a partir de quem cita, e o nome solto do arquivo, este só em `tools/` e em teste). Em texto que não é código (skill, guia de pasta, configuração, passo do CI, script de shell) conta o caminho desde `tools/` em qualquer lugar. Um import montado em tempo de execução com nome variável não é visto, e para ele a declaração traz o motivo "carregado por caminho calculado" com o campo `por` apontando o carregador vivo. `node tools/mapa/registro-de-ferramentas.mjs --chamadores=<arquivo>` mostra quem importa e quem cita um módulo, por categoria.
