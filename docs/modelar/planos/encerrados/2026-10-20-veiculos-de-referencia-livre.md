# Veículos de referência livre — 27 peças do acervo recriadas a partir de malhas de licença livre sem exigência de crédito

**Estado:** concluído

**Responsável:** Claude, com a pessoa aprovando forma

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `trabalho/veiculos`

## Problema observado

A pessoa quer cobrir veículos no acervo e não tem receitas de veículos do projeto de origem. A pesquisa de 2026-10-20 achou modelos 3D com licença livre sem exigência de crédito: o pacote A, de autor A, com 20 veículos completos de desenho estilizado em glTF e a licença livre sem exigência de crédito declarada no arquivo `License.txt` do pacote; três pacotes de um repositório de modelos livres (pacote B, de autor B, pacote C, de autor C, e pacote D, de autor D), todos com licença livre sem exigência de crédito declarada na página; e um pacote realista de carros de outro autor, com a mesma licença, cujo download respondeu "quota exceeded" e não foi obtido. Um segundo repositório de modelos livres só tem um carro coberto, pneus, aros e navios. As fontes com GPL ou CC-BY-SA (FlightGear, SuperTuxKart, Speed Dreams, BentSim) ficam fora por copyleft.

As malhas servem de referência de forma e de partes, e não são receitas. Elas não entram no repositório: `*.obj`, `*.mtl` e `importados/` já são ignorados pelo git e há teste que confere. Entram só as imagens de referência e as medidas em JSON que o Mecanifica gera.

## Resultado

27 veículos como peças do acervo, cada uma recriada em primitivas do núcleo por um agente Haiku a partir do estudo da malha de referência, com a silhueta medida contra a referência e a forma aprovada pela pessoa em imagem, e com o custo medido por veículo.

## Filtro Agent-First

- **`modelo-de-referencia.mjs`:** USAR DIRETO. Lê OBJ, FBX ou glTF no navegador com three.js, endireita o veículo com a frente em +z e o chão em y = 0, escala, e escreve `vistas.png` com quatro vistas ortográficas e `partes.json` com a caixa de cada malha e as silhuetas em fatias.
- **`comparar-silhueta.mjs`:** USAR DIRETO. Executa a receita e compara a silhueta com a da referência dentro de uma tolerância de 5% do comprimento; `--rigoroso` e `--cabine` entraram na fatia 2.
- **Processo leve de modelagem e `guarda:acervo`:** USAR DIRETO, com plano de modelagem e contatos declarados em cada peça.

## Incluído

Os 27 veículos da tabela abaixo. Os nomes seguem uma regra: pt-BR neutro, minúsculo com hífen, no formato tipo-variante (`carro-`, `jipe-`, `picape-`, `furgao`, `ambulancia`, `onibus-`, `caminhao-`, `trator-`), sem nome de pacote, de autor ou de jogo. A origem fica no cabeçalho da receita e em `referencias/` de cada peça (`fonte-partes.json` e uma nota de origem).

| Peça | Origem | Tipo |
|---|---|---|
| carro-sedan-compacto | pacote A, sedan | sedan |
| carro-esportivo-sedan | pacote A, sedan-sports | sedan |
| carro-esportivo-hatch | pacote A, hatchback-sports | hatchback |
| carro-suv | pacote A, suv | SUV |
| carro-suv-luxo | pacote A, suv-luxury | SUV |
| carro-taxi | pacote A, taxi | carro |
| carro-policia | pacote A, police | carro |
| furgao | pacote A, van | furgão |
| picape-compacta | pacote A, truck | picape |
| picape-plataforma | pacote A, truck-flat | picape |
| caminhao-entrega | pacote A, delivery | caminhão |
| caminhao-entrega-aberto | pacote A, delivery-flat | caminhão |
| ambulancia | pacote A, ambulance | ambulância |
| caminhao-bombeiro | pacote A, firetruck | caminhão |
| caminhao-lixo | pacote A, garbage-truck | caminhão |
| trator | pacote A, tractor | trator |
| trator-pa | pacote A, tractor-shovel | trator |
| trator-sirene | pacote A, tractor-police | trator |
| carro-corrida | pacote A, race | carro |
| carro-corrida-futurista | pacote A, race-future | carro |
| carro-sedan-classico | pacote B | sedan |
| onibus-rodoviario | pacote C | ônibus |
| carro-sedan-angular | pacote D, Sedan | sedan |
| jipe-aberto | pacote D, Jipe | jipe |
| picape-angular | pacote D, Pickup | picape |
| carro-perua | pacote D, Wagon | perua |
| onibus-urbano | pacote D, Bus | ônibus |

A licença livre sem exigência de crédito dispensa crédito e menção. A recomendação adotada é registrar a origem nos cabeçalhos e em `referencias/`, por rastreabilidade e como prova da licença, e não a colocar no nome da peça nem em texto voltado ao usuário. Se uma fonte CC-BY entrar um dia, o crédito passa a ser obrigatório e vai num arquivo de créditos.

## Excluído

- veículos sem receita nem malha livre (moto, bicicleta, trem, bonde e aeronaves);
- malha de fonte copyleft (GPL, CC-BY-SA);
- a malha de terceiros no repositório;
- texto sobre o veículo;
- animação de rodas.

## Invariantes

Peça determinística e versionada, aprovada pelo `guarda:acervo` com plano de modelagem e contatos declarados; quem aprova forma é a pessoa; o núcleo continua sem Three.js; nenhuma malha de terceiros entra no git.

## Gate de saída

1. as 27 peças no acervo, ou recusadas com motivo registrado;
2. o resultado de `comparar-silhueta` registrado por peça;
3. a aprovação da pessoa por imagem, peça a peça;
4. o custo por veículo medido;
5. `npm run gates` verde, e `--completo` antes do envio à main.

## Fatias

1. **Ferramentas e referências.** `modelo-de-referencia.mjs`, `comparar-silhueta.mjs` e a pasta `referencias/` de cada peça, com `fonte-partes.json` e as vistas da malha. Feita.
2. **Ferramentas de comparação com a fonte.** A análise da primeira leva (oito das nove peças reprovadas pela pessoa por forma que nenhum número acusou, com a silhueta aprovada em seis delas) pediu cinco ferramentas gerais em `tools/modelar/`, todas com teste: `folha-comparativa.mjs` (fonte e receita nas mesmas câmeras e na mesma escala, e a vista de diferença que marca onde a receita sobra ou falta, com a área em porcentagem); `comparar-silhueta.mjs --rigoroso` (2% do comprimento por fatia e nenhuma fatia fora) e `--cabine` (a estufa medida em separado do corpo), sem mudar o comportamento padrão; `medidas-da-fonte.mjs` (perfil lateral, planta, seção frontal e rodas da fonte, em milímetro, com um trecho de receita); `vistas-da-receita.mjs` (a folha de seis vistas coloridas por parte); e a conferência de origem e orientação: `modelo-de-referencia.mjs` grava no `partes.json` o campo `frente` (tirado das rodas, dos faróis ou do para-brisa pelo nome, ou declarado com `--frente`), `comparar-silhueta.mjs`, `folha-comparativa.mjs` e `medidas-da-fonte.mjs` recusam fonte sem ele, e `origem-das-fontes.test.mjs` confere a tabela fonte para pacote (`docs/modelar/veiculos-referencias.json`) contra a tabela deste plano, o `arquivo` de cada `fonte-partes.json` e a linha de origem de cada `alvo.md`. Os 27 `fonte-partes.json` foram regerados com o campo novo. Feita, sem tocar o núcleo.
3. **Primeiro lote de 9 veículos, refeito.** Os nove modelados por agentes Haiku foram recusados pela pessoa, exceto o `carro-sedan-compacto`. Um Opus analisou a abordagem (carroceria com largura constante, rodas dentro do corpo, perfis laterais errados e uma silhueta que media escala e não forma) e escreveu as instruções por grupo de veículo; as outras oito peças foram refeitas por agentes Sonnet pela interseção do perfil lateral, da seção frontal e da planta, com os arcos de roda no próprio perfil. Aprovadas pela pessoa em 2026-10-20. Feita.
4. **Os 18 restantes,** em dois lotes de 9 por agentes Sonnet, com as instruções do Opus e as lições do lote anterior. Aprovados pela pessoa em 2026-10-20. Feita.
5. **Brilho.** Autorizada pela pessoa em 2026-10-20. O material de `MATERIAIS` aceita `brilho` (número de 0 a 1; ausente mantém o comportamento atual, e nenhuma peça existente muda). O campo é validado em `especificacaoDeTextura` e em `validarTexturas`, o `.mtl` da exportação OBJ grava `Ns` (brilho x 200) e `Ks` cinza (brilho x 0,5), e `vistas-texturizadas.mjs` mostra o reflexo pelo `MeshPhongMaterial` que o `MTLLoader` já cria. Aplicado só na `geladeira-compacta-branca` (`branco` e `brancoCinza`) e no `freezer-horizontal` (`branco`), com 0,7. Os testes de `.mtl` com e sem brilho e a recusa de valor fora de 0 a 1 impedem o campo de cair em silêncio. PBR completo (aspereza, metalicidade, normal) e paleta nova seguem fora. Feita.
6. **Fechamento.** Custos, achados e a decisão sobre as peças recusadas. Feita.

## Riscos e parada

O agente pode errar rodas, janelas e perfil, que são o que mais separa um veículo reconhecível de uma caixa. A primeira leva, de agentes Haiku, foi recusada em oito de nove peças; o plano passou a usar agentes Sonnet com as instruções por grupo. Para e volta à pessoa se menos da metade de um lote passar na aprovação da pessoa, ou se o custo por veículo ficar acima do planejado.

## Fechamento

O plano terminou com 27 veículos de referência livre (7 de três pacotes e 20 de outro pacote, todos de licença livre sem exigência de crédito) recriados no núcleo e aprovados pela pessoa em imagem, e nenhuma peça foi recusada. Saíram do plano as ferramentas de comparação de forma com a fonte, o campo `brilho` do módulo de textura e o esboço detalhado fora do fluxo padrão.

O custo em tokens de subagente, lido das notificações da sessão, vai em valores arredondados e aproximados. O primeiro lote, de 9 agentes Haiku, custou cerca de 2,9 milhões no total (250 a 410 mil cada) e só um veículo foi aprovado pela pessoa. A análise do Opus custou cerca de 260 mil, e as ferramentas, feitas por um Sonnet, cerca de 260 mil. Os oito refazeres por Sonnet custaram cerca de 1,9 milhão (150 a 310 mil cada) e todos foram aprovados. O segundo lote, de 9 Sonnet, custou cerca de 2,4 milhões (200 a 330 mil cada), e o terceiro, também de 9 Sonnet, cerca de 2,4 milhões (200 a 375 mil cada), todos aprovados. O total fica em torno de 10 milhões de tokens: cerca de 350 a 400 mil por veículo aprovado quando se conta o lote Haiku recusado, e cerca de 250 mil por veículo nos lotes Sonnet.

Cada achado abaixo responde se o processo o teria pego sozinho.

1. A primeira leva com Haiku passou na silhueta e foi recusada pela pessoa, porque o comparador por vértices media escala e não forma. O processo não pegou. O que faltava virou `--rigoroso`, `--cabine` e a folha comparativa com vista de diferença, e a regra de que a aprovação de forma vem da folha aberta entrou nas instruções dos agentes.
2. O comparador por vértices acusava peças corretas porque a fonte tem triângulos grandes. O processo pegou apenas pelo sintoma. Virou medida por superfície e o campo `metodo` no `partes.json`, recusado quando ausente.
3. Uma fonte (pacote C) veio com a frente invertida. O processo não pegou. Virou o campo `frente`, gravado por `modelo-de-referencia.mjs` e recusado por `comparar-silhueta`, `folha-comparativa` e `medidas-da-fonte` quando falta.
4. A origem de uma peça foi registrada no pacote errado. O processo não pegou no cabeçalho da receita. Virou `origem-das-fontes.test.mjs`, que confere `docs/modelar/veiculos-referencias.json` contra o plano, o `fonte-partes.json` e o `alvo.md`, mas ainda não confere o cabeçalho de `receita.js`. Essa lacuna fica registrada.
5. O teste do diagnóstico do acervo inteiro estourou o tempo ao passar de 30 para 57 peças, e o primeiro remendo, subir o teto, só adiou a falha. O processo pegou, mas mal. Virou a opção `raiz` e o teste de encanamento sobre um acervo reduzido, mais o teste lento `acervo-real.test.mjs` com teto por peça.
6. `npm run vistas:critica` estourou 30 s em vários agentes sem causa investigada. O processo não explica o motivo. Fica como pendência, descrita em 'Ajustes no núcleo'.
7. Agentes com monitores de fundo acordavam a sessão em laço até serem parados. O processo não pegou. A instrução de que agente despachado não deixa monitor ou processo de fundo foi escrita só no brief dos lotes e ainda não está em skill ou gate. Essa lacuna fica registrada.

Os achados do núcleo ficam em 'Ajustes no núcleo' e na tabela do [backlog](../BACKLOG.md), sem implementação, e dependem de plano próprio. As 27 peças estão no acervo, sem peça recusada.

## Andamento

Fatia 1 feita em 2026-10-20: as duas ferramentas estão em `tools/modelar/` e a pasta `referencias/` de cada uma das 27 peças já tem a medida da malha de origem.

Fatia 2 (ferramentas de comparação) feita em 2026-10-20, sem tocar o núcleo.

Fatias 3, 4 e 5 feitas em 2026-10-20: as 27 peças têm receita, `referencias/alvo.md`, vistas e folha comparativa, todas aprovadas pela pessoa em imagem, e o campo `brilho` está no módulo de textura e no exportador. O que o processo revelou do núcleo, sem corrigir, está em 'Ajustes no núcleo'.

### Fatia: esboço detalhado fora do fluxo padrão

Escopo. O esboço detalhado (esbocista, crítico cego, Condutor, Marcos; skills esboco-detalhado e laco-do-esboco; roteiros modelar/esboco e modelar/laco-do-esboco) deixa de ser etapa do fluxo padrão e fica como ferramenta opcional, indicada só para objeto sem nenhuma forma de referência (sem modelo, imagem, receita de outro projeto nem medidas) e só quando a pessoa escolhe esboçar. O fluxo padrão parte de forma de referência ou medida (conversão, modelo de referência, imagem, prancha). Nenhum código, módulo, teste ou skill é apagado. Os textos reescritos são a linha dos roteiros no CLAUDE.md (gerada de roteiros.json), as descrições das skills esboco-detalhado e laco-do-esboco e do agente esbocista, o passo do roteiro modelar/peca, alinhar-modelagem, laco-de-modelagem, README, modulos/esboco/README, PARE-E-ANALISE e usar/README.

Critério de pronto. Nenhum roteiro fora dos dois do esboço cita o esboço em skill, passo, comando ou leitura; os dois roteiros do esboço trazem na descrição "sem forma de referência" e "escolha da pessoa"; npm run roteiros:gerar não deixa diferença; npm run leitura:obrigatoria, npm run mapa:check, links e planos:check passam. O teste que confere isso está em tools/mapa/roteiros.test.mjs (gate de testes rápidos).

O processo teria pego sozinho? Não. O roteiro padrão apresentava o esboço como etapa (roteiros, skills e README o citavam sem condição) e nenhuma conferência olhava isso. O que faltava era um teste de que roteiros padrão não citam o esboço como etapa e de que os dois roteiros do esboço declaram a condição de uso; ele foi implementado em tools/mapa/roteiros.test.mjs, barato e dentro do gate existente. Resta sem gate o texto livre de skills e docs (alinhar-modelagem, README), que depende de revisão.

## Ajustes no núcleo

Os três problemas abaixo apareceram nas nove peças da primeira leva. Nenhum é implementado neste plano: cada um tem contorno testado, e a correção mexe no núcleo, o que pede plano próprio depois desta leva, com o caso mínimo do sintoma como prova. As linhas correspondentes estão em [`BACKLOG.md`](../BACKLOG.md).

**Face fina deixada por subtrair cilindros em carroceria.** Sintoma: no experimento da perua, `subtrair` de cilindros de 8 lados na carroceria gerou a face 8006 com razão 1,81e-3, que `conferir-malha` reprova (limite 3e-3), e é a origem provável das faces degeneradas que o exportador recusa. Contorno atual: recortar o arco da roda no próprio perfil lateral 2D antes de extrudar, sem lasca; `subtrair` continua bom em peça pequena. A correção pede plano próprio: a triangulação das faces cortadas fica no núcleo.

**Pontos alinhados em perfil de extrusão recusados pelo exportador.** Sintoma: um perfil com vértices colineares vira triângulo sem área na triangulação, e o exportador o recusa; o `carro-sedan-angular` deslocou vértices 1 mm em zigue-zague para ser aceito. Contorno atual: tirar do perfil os vértices colineares antes de passar ao núcleo (`medidas-da-fonte.mjs` já simplifica o perfil que gera). A correção pede plano próprio: `extrusao` normalizar o contorno.

**`arredondarAresta` que deixa vértice solto.** Sintoma: em forma facetada, o arredondamento da aresta deixa vértice órfão (relato dos agentes da primeira leva). Contorno atual: arredondar no perfil 2D (`contorno` com `concordancia` ou pontos de arco) e nunca na aresta 3D de uma booleana. A correção pede plano próprio, com um caso mínimo reproduzível.

As 18 peças dos lotes seguintes trouxeram mais quatro achados do núcleo, também sem correção aqui. Uma parte cujo contorno repete um ponto, por espelhamento sobre o eixo ou por arredondamento de arco, é recusada em silêncio e some da peça sem erro; o contorno atual é arredondar e deduplicar os pontos na receita e conferir no `descrever-peca` que a parte existe. A revolução (`lathe`) de um perfil que não toca o eixo sai com a casca aberta, e só `furos: []` ou um aro que enche o bolsão a fecha. A malha guarda os vértices em precisão simples (erro de cerca de 1e-8 m contra a tolerância de contato de 1e-9 m), então um plano inclinado só fecha contato quando os vértices são idênticos, e o vidro sobre uma face inclinada precisa de um encaixe declarado de cerca de 1 mm. Os auxiliares de arco copiados de uma receita para outra deixam lasca de 0,5 mm quando o corte cai a menos de 1 mm de um vértice. Fora do núcleo: `PLANO.referencias` exige `referencias/alvo.md` antes de `vistas:critica` rodar e o erro só aparece depois de gerar as imagens, e `vistas:critica` estourou o tempo de 30 s ao carregar a sessão da bancada em quatro agentes, o que precisa ser investigado antes de ser dado como falha de ambiente.
