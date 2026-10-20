# Veículos de referência livre — 27 peças do acervo recriadas a partir de malhas de licença livre sem exigência de crédito

**Estado:** ativo

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
2. **Ferramentas de comparação com a fonte.** A análise da primeira leva (oito das nove peças reprovadas pela pessoa por forma que nenhum número acusou, com a silhueta aprovada em seis delas) pediu cinco ferramentas gerais em `tools/mecanifica/`, todas com teste: `folha-comparativa.mjs` (fonte e receita nas mesmas câmeras e na mesma escala, e a vista de diferença que marca onde a receita sobra ou falta, com a área em porcentagem); `comparar-silhueta.mjs --rigoroso` (2% do comprimento por fatia e nenhuma fatia fora) e `--cabine` (a estufa medida em separado do corpo), sem mudar o comportamento padrão; `medidas-da-fonte.mjs` (perfil lateral, planta, seção frontal e rodas da fonte, em milímetro, com um trecho de receita); `vistas-da-receita.mjs` (a folha de seis vistas coloridas por parte); e a conferência de origem e orientação: `modelo-de-referencia.mjs` grava no `partes.json` o campo `frente` (tirado das rodas, dos faróis ou do para-brisa pelo nome, ou declarado com `--frente`), `comparar-silhueta.mjs`, `folha-comparativa.mjs` e `medidas-da-fonte.mjs` recusam fonte sem ele, e `origem-das-fontes.test.mjs` confere a tabela fonte para pacote (`docs/mecanifica/veiculos-referencias.json`) contra a tabela deste plano, o `arquivo` de cada `fonte-partes.json` e a linha de origem de cada `alvo.md`. Os 27 `fonte-partes.json` foram regerados com o campo novo. Feita, sem tocar o núcleo.
3. **Primeiro lote de 9 veículos.** Pilotar o brief do agente, medir a silhueta (agora também com `--rigoroso` e `--cabine auto`), levar a folha comparativa e as imagens à pessoa e medir o custo por veículo.
4. **Os 18 restantes,** em dois lotes de 9, com o brief ajustado pelo que o primeiro lote revelar.
5. **Fechamento.** Custos, achados e a decisão sobre as peças recusadas.

## Riscos e parada

O agente Haiku pode errar rodas, janelas e perfil, que são o que mais separa um veículo reconhecível de uma caixa. Para e volta à pessoa se menos da metade do primeiro lote passar na silhueta e na aprovação da pessoa, ou se o custo por veículo ficar acima do planejado.

## Fechamento

## Andamento

Fatia 1 feita em 2026-10-20: as duas ferramentas estão em `tools/mecanifica/` e a pasta `referencias/` de cada uma das 27 peças já tem a medida da malha de origem. As receitas ainda não existem.

Fatia 2 (ferramentas de comparação) feita em 2026-10-20. A origem da perua já está certa em `referencias/alvo.md` (Wagon do pacote D, de um repositório de modelos livres); o cabeçalho e a descrição de `procedural/pecas/carro-perua/receita.js` ainda dizem pacote A e ficam para quem refizer a carroceria, porque a receita não foi tocada nesta leva.

### Fatia: esboço detalhado fora do fluxo padrão

Escopo. O esboço detalhado (esbocista, crítico cego, Condutor, Marcos; skills esboco-detalhado e laco-do-esboco; roteiros modelar/esboco e modelar/laco-do-esboco) deixa de ser etapa do fluxo padrão e fica como ferramenta opcional, indicada só para objeto sem nenhuma forma de referência (sem modelo, imagem, receita de outro projeto nem medidas) e só quando a pessoa escolhe esboçar. O fluxo padrão parte de forma de referência ou medida (conversão, modelo de referência, imagem, prancha). Nenhum código, módulo, teste ou skill é apagado. Os textos reescritos são a linha dos roteiros no CLAUDE.md (gerada de roteiros.json), as descrições das skills esboco-detalhado e laco-do-esboco e do agente esbocista, o passo do roteiro modelar/peca, alinhar-modelagem, laco-de-modelagem, README, modulos/esboco/README, PARE-E-ANALISE e usar/README.

Critério de pronto. Nenhum roteiro fora dos dois do esboço cita o esboço em skill, passo, comando ou leitura; os dois roteiros do esboço trazem na descrição "sem forma de referência" e "escolha da pessoa"; npm run roteiros:gerar não deixa diferença; npm run leitura:obrigatoria, npm run mapa:check, links e planos:check passam. O teste que confere isso está em tools/mapa/roteiros.test.mjs (gate de testes rápidos).

O processo teria pego sozinho? Não. O roteiro padrão apresentava o esboço como etapa (roteiros, skills e README o citavam sem condição) e nenhuma conferência olhava isso. O que faltava era um teste de que roteiros padrão não citam o esboço como etapa e de que os dois roteiros do esboço declaram a condição de uso; ele foi implementado em tools/mapa/roteiros.test.mjs, barato e dentro do gate existente. Resta sem gate o texto livre de skills e docs (alinhar-modelagem, README), que depende de revisão.

## Ajustes no núcleo

Os três problemas abaixo apareceram nas nove peças da primeira leva. Nenhum é implementado neste plano: cada um tem contorno testado, e a correção mexe no núcleo, o que pede plano próprio depois desta leva, com o caso mínimo do sintoma como prova. As linhas correspondentes estão em [`BACKLOG.md`](BACKLOG.md).

**Face fina deixada por subtrair cilindros em carroceria.** Sintoma: no experimento da perua, `subtrair` de cilindros de 8 lados na carroceria gerou a face 8006 com razão 1,81e-3, que `conferir-malha` reprova (limite 3e-3), e é a origem provável das faces degeneradas que o exportador recusa. Contorno atual: recortar o arco da roda no próprio perfil lateral 2D antes de extrudar, sem lasca; `subtrair` continua bom em peça pequena. A correção pede plano próprio: a triangulação das faces cortadas fica no núcleo.

**Pontos alinhados em perfil de extrusão recusados pelo exportador.** Sintoma: um perfil com vértices colineares vira triângulo sem área na triangulação, e o exportador o recusa; o `carro-sedan-angular` deslocou vértices 1 mm em zigue-zague para ser aceito. Contorno atual: tirar do perfil os vértices colineares antes de passar ao núcleo (`medidas-da-fonte.mjs` já simplifica o perfil que gera). A correção pede plano próprio: `extrusao` normalizar o contorno.

**`arredondarAresta` que deixa vértice solto.** Sintoma: em forma facetada, o arredondamento da aresta deixa vértice órfão (relato dos agentes da primeira leva). Contorno atual: arredondar no perfil 2D (`contorno` com `concordancia` ou pontos de arco) e nunca na aresta 3D de uma booleana. A correção pede plano próprio, com um caso mínimo reproduzível.
