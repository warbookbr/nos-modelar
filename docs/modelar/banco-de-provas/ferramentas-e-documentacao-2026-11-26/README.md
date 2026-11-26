# Ferramentas e documentação: o registro de ferramentas e a lista do que está sem chamador

Pasta do plano [ferramentas e documentação](../../planos/2026-11-26-ferramentas-e-documentacao.md), fatia 2. A evidência de partida é a [frente das ferramentas](../analise-do-projeto-2026-11-26/ferramentas.md) da análise do projeto, recomendações 1 e 7.

## O que foi medido em 2026-11-26

O comando `npm run ferramentas:registro:check` leva perto de meio segundo e confere 291 módulos de `tools/` (código fora de pasta `fixtures/`, de teste e de declaração de tipo). Deles, 161 são linha de comando e têm entrada em `tools/registro-de-ferramentas.json`: 108 de uso, 42 de gate e 11 internas. Antes desta fatia, 39 linhas de comando não tinham comando em `package.json`; a zebra numérica, a distância à pele, a conferência de pontos e a rodada de modelagem ganharam `npm run zebra`, `distancia:pele`, `conferir:pontos` e `rodada`, e as quatro já respondiam a `--ajuda` com saída zero. Restam 35 sem comando, todas com entrada no registro e o caminho do arquivo no `tools/README.md`.

A conferência acha 57 módulos sem chamador, isto é, que nenhum comando, passo do CI, skill, configuração ou código de fora de `tools/` chama, nem direto nem por um módulo vivo que os importe. Trinta estão em `tools/blender/`, que é opcional, roda à mão e está declarada como pasta. Os outros 27 somam 3.522 linhas e estão declarados um a um no campo `semChamador` do registro, com o motivo. A análise contou 21 arquivos e perto de 2.100 linhas; a diferença vem de a conferência seguir a cadeia de imports (o que só um módulo sem chamador importa também fica sem chamador) e de não contar a citação em comentário. Uma ferramenta que o código cita num texto de mensagem, como `regravar-ajustes-de-curva.mjs` na receita da lataria, conta como chamada, e por isso saiu da lista da análise.

## Apoio de teste, que fica (7)

Estes existem para os testes e não pedem decisão: `tools/arquitetura/nucleo-sem-three.mjs` (a varredura que prova que o núcleo de autoria não importa Three.js), `tools/modelar/acervo-reduzido.mjs` (monta um acervo de três peças pequenas em `tmp/`), `tools/modelar/capacidade-symlink.mjs` (diz se a máquina deixa criar ligação simbólica), `tools/modelar/fonte-sintetica.mjs` (monta um `partes.json` de fonte a partir de uma receita, para os testes do estudo de modelo de terceiros), `tools/modelar/guardas/etapas-do-acervo.mjs` (a conferência de um registro de etapas pela impressão do aceite, que só o teste dela roda), `tools/modelar/medir-importar-receita.mjs` (o processo filho que mede o tempo de importar cada receita) e `tools/oficina/conferir-malha.ts` (a conferência de malha que 26 testes de operação do núcleo chamam). O `fonte-sintetica.mjs` sai junto se o grupo do estudo de modelo de terceiros for apagado, e a guarda das etapas do acervo merece a pergunta de por que nenhum gate a roda.

## À espera da decisão da pessoa: apagar ou religar (20)

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

Os dez primeiros são o grupo do estudo de modelo de terceiros, que só se importa entre si; o guia `docs/modelar/guias/modelar-veiculos.md` e os `referencias/alvo.md` de algumas peças ainda mandam rodá-los pelo arquivo. Os três seguintes são a conversão do esboço antigo em receita. Recomendo religar o grupo do estudo com um comando só (`modelo-de-referencia.mjs`, que é a entrada dele), porque os guias o usam; apagar a conversão do esboço antigo com `cadeiras-medida.mjs` e `familia-com-esboco.mjs`, se o esboço antigo saiu em 2026-11-05 como o gate da calibração registra; dar comando a `resumo-do-acervo.mjs` e a `perfil-da-execucao.mjs`, que são medidas úteis sem porta; e conferir o `exportar-peca.mjs` com cuidado antes de qualquer coisa, porque o contrato de arquitetura o descreve como a porta de exportação para o produto e hoje nenhum comando o roda.

## Fora desta lista, e também para decidir

`tools/modelar/medir-arvore-para-migracao.mjs` e `tools/modelar/migrar-etapas-para-impressao.mjs` têm chamador (`etapas-da-montagem.mjs` e `src/autoria/etapas-pela-impressao.js` citam a migração), e por isso a conferência não os acusa, mas a análise os aponta como ferramentas de uma migração já feita. Estão no registro como internas.

## Limites da conferência

A citação é procurada no texto: o caminho inteiro desde `tools/`, a string entre aspas que resolve para o arquivo, o nome solto do arquivo (o caso de `join(RAIZ, 'tools', 'x.mjs')`) e o import sem extensão do TypeScript. Um import montado em tempo de execução com nome variável não é visto, e uma mensagem de texto que cite o caminho de outra ferramenta conta como chamada. `node tools/mapa/registro-de-ferramentas.mjs --chamadores=<arquivo>` mostra quem cita um módulo, por categoria.
