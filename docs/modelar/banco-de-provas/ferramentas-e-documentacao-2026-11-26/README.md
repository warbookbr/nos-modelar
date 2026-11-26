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

## Limites da conferência

Em código, conta como chamada o import de verdade e a string cujo texto inteiro é o caminho do módulo (o caminho desde `tools/`, o relativo que resolve a partir de quem cita, e o nome solto do arquivo, este só em `tools/` e em teste). Em texto que não é código (skill, guia de pasta, configuração, passo do CI, script de shell) conta o caminho desde `tools/` em qualquer lugar. Um import montado em tempo de execução com nome variável não é visto, e para ele a declaração traz o motivo "carregado por caminho calculado" com o campo `por` apontando o carregador vivo. `node tools/mapa/registro-de-ferramentas.mjs --chamadores=<arquivo>` mostra quem importa e quem cita um módulo, por categoria.
