# Fluxo genérico de modelagem com Blender

O fluxo abaixo serve de norte para a IA e para a pessoa criarem um objeto novo. Ele é o mesmo que recriou 27 veículos a partir de malhas de licença livre sem exigência de crédito no plano [Veículos de referência livre](../planos/encerrados/2026-10-20-veiculos-de-referencia-livre.md), escrito sem depender de veículo. O Blender aparece só na etapa b e em usos opcionais descritos em [`USOS-E-LIMITES.md`](USOS-E-LIMITES.md). O produto de todas as etapas é a receita.

## Com forma de referência

Etapa a, escolher a fonte e conferir a licença. Entra o objeto desejado e o que se sabe sobre onde achar um modelo. Sai a fonte escolhida e a origem registrada em `referencias/alvo.md` da peça, com modelo, autor, pacote, licença e página. A licença aceita é livre, sem exigência de crédito, sem marca nem nome de fabricante, e nada de GPL nem de CC-BY-SA. CC-BY exige um arquivo de créditos. A IA confere e registra, e a pessoa confirma a escolha da fonte.

Etapa b, converter para GLB. Entra a fonte em um formato qualquer. Se ela já for glb, obj ou fbx, a etapa não existe. Se for outro formato, como `.blend`, converte-se com o Blender pelo script de [`INSTALAR-E-CONVERTER.md`](INSTALAR-E-CONVERTER.md). Sai um arquivo GLB fora do repositório. A IA executa e nada precisa de aprovação.

Etapa c, estudar a fonte. Entra o GLB. A IA roda, em `tools/mecanifica/`, o `modelo-de-referencia.mjs` com `--saida <pasta>` e `--frente` para fixar a orientação, e o `medidas-da-fonte.mjs` sobre o `partes.json` para obter perfil lateral, planta, seção frontal e rodas. Depois de ter uma receita, roda `folha-comparativa.mjs` e `comparar-silhueta.mjs --rigoroso --cabine auto`. Saem `vistas.png`, `partes.json`, a folha comparativa com a vista de diferença e a medida de silhueta. A IA gera as imagens e as medidas. A regra do `--rigoroso` é que nenhuma fatia passe de 2% do comprimento, e a medida sozinha nunca aprova a forma.

Etapa d, modelar a receita pelo núcleo. Entram as medidas da etapa c. A IA escolhe o grupo de forma do objeto e escreve a receita com a técnica da interseção: extrusão do perfil lateral em x, extrusão da seção frontal em z e, quando a planta importa, a planta em y, todas em interseção com uma caixa de corte por parte. Os arcos de roda e vãos semelhantes são recortados no próprio perfil 2D, e nunca por booleana 3D sobre a carroceria, que deixa face fina. Vértices colineares saem do perfil antes de ele ir ao núcleo, e pontos repetidos por espelhamento ou arredondamento de arco são deduplicados. Sai a receita com `referencias/alvo.md` completo, incluindo a lista do que não ficou igual. Os registros de 27 peças em `procedural/pecas/*/referencias/alvo.md` são os exemplos de técnica. As instruções por grupo de veículo que um Opus escreveu para esse plano não estão versionadas no repositório, e o resumo desta etapa é o que dá para registrar delas. Para modelar de fato, abra a skill `criar-peca` e o roteiro `modelar/peca` de `npm run comecar`.

Etapa e, aprovação da forma. Entra a folha comparativa aberta como imagem, com a fonte, a receita e a diferença. A pessoa olha a imagem e aprova ou recusa. Sem a aprovação dela a peça não está pronta, qualquer que seja o valor medido. Sai a peça aprovada, ou uma lista de correções que volta à etapa d. A correção que um objeto revela vai para a ferramenta, o gate ou a instrução geral, e não para o arquivo daquele objeto.

## Sem forma de referência

Quando não há modelo, imagem, receita de outro projeto nem medida, o Blender serve para bloquear a forma só para medir: uma caixa, as proporções e o perfil. Exportam-se as medidas, por exemplo as dimensões da caixa e os pontos do perfil lido na vista lateral, e reescreve-se tudo em receita pelo núcleo, seguindo as etapas d e e. A malha do Blender nunca é levada ao repositório nem à receita.

O esboço detalhado é a alternativa opcional e só entra por escolha da pessoa. Ele parte das skills `esboco-detalhado` e `laco-do-esboco` e dos roteiros `modelar/esboco` e `modelar/laco-do-esboco`. O alinhamento prévio, com opções de forma lado a lado em imagem, é conduzido pela skill `alinhar-modelagem`.

## Resumo

| Etapa | Entra | Sai | Quem aprova |
|---|---|---|---|
| a, fonte e licença | objeto desejado | origem em `referencias/alvo.md` | a pessoa confirma a fonte |
| b, conversão | fonte em outro formato | GLB fora do repositório | ninguém |
| c, estudo da fonte | GLB | `vistas.png`, `partes.json`, medidas, folha | ninguém, só a pessoa lê |
| d, receita | medidas | receita e `alvo.md` | os gates do repositório |
| e, forma | folha comparativa | peça aprovada ou correções | a pessoa |
