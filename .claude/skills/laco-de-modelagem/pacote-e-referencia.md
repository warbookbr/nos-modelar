# O pacote do crítico e a referência

Apoio da skill [`laco-de-modelagem`](SKILL.md). Leia antes de despachar o modelador ou o crítico de uma peça que tem imagem de referência, prancha ou mapa de partes, lataria, sombreamento suave sobre emenda de fusão, junta de tubos soldada, `REFINA.esboco` ou lugar numa montagem, e quando precisar comparar duas rodadas na mesma câmera ou trazer foto de terceiro ao pedido.

## O que o modelador e o crítico recebem da referência

**O pacote de referência.** Quando o objeto passou pelo mapa de partes e pela
prancha, o modelador e o crítico recebem as mesmas três imagens, nesta ordem:
a imagem de referência, a prancha com as cotas e o mapa de partes
com as folhas de divisa. `npm run objeto -- <objeto>` lista o caminho de cada
uma, e `docs/modelar/usar/FLUXO-DO-OBJETO.md` diz por que as três vão ao
crítico sem contar como a peça foi feita.

**A referência, além da prancha.** As medidas do 3D (`silhueta:desvio`,
`conferir:vistas`, `PONTOS`) comparam com a prancha, e um modelo fiel a uma
prancha errada passa em todas. Por isso a rodada de peça com imagem de
referência passa também pela leitura combinada do modelo contra a imagem
(`npm run leitura:regioes -- --modelo=<peça> ...`, grade e partes, três
críticos cada e `--consolidar`, como em
[`CONFERIR-CONTRA-REFERENCIA.md`](../../../docs/modelar/usar/CONFERIR-CONTRA-REFERENCIA.md)).
Quando o modelo bate com a prancha e pelo menos dois críticos acusam a mesma
parte contra a referência, o defeito é da prancha: corrija-a primeiro e só
depois a receita.

## O pacote da ação revisar

**revisar** — a ferramenta mediu a receita atual e ela passou. Rode `npm run vistas:critica -- <peça>`, que mede a receita antes de capturar e recusa a que reprova (`--sem-medir` só para quem quer as imagens sem o crítico), e grava as
imagens e, na pasta da rodada (`tools/bancadas/out/critica-<peça>/rodada-NN/`, com NN o número da próxima rodada a registrar, ou a de `--saida=<pasta>`), o `pedido.md` pronto, tirado
da receita: o texto do despacho do `critico-visual`. Não escreva o pedido à mão, nem copie caminho, promessa de parte ou critério
do `PLANO`; mande o texto do `pedido.md` como está. Foto de terceiro não entra no repositório, e quem conduz a traz ao pedido com `--referencia=<caminho absoluto da imagem>[@<vista>]` (repetível, o caminho não é gravado). Ele traz, nesta ordem, o objeto, o alvo, as referências, o modelo (as vistas
da peça sozinha e a malha em arame), as vistas montadas, a sobreposição dos cortes, cada parte com a forma e a técnica que o plano
promete, os critérios de reprovação, as perguntas e o limite de 240 caracteres de `onde`, `evidencia` e `observacao` do veredito
(o registro recusa o mais longo, e o detalhe vai no texto; a regra fica no despacho, e não no agente, que mudado pede a calibração
de novo), com o caminho de todas as imagens e o lado de onde cada vista olha. As perguntas são as da família, quando o `PLANO`
declara `familia` ou `familiaProcedural`, e, quando a receita declara `REFINA.esboco`, a de onde o alvo difere da referência real:
o para-brisa saliente do avião veio do esboço, passou por dois críticos e só a pessoa o viu.

Sem opção sai o pacote padrão, proposto em 2026-11-26 e ainda à espera da aprovação da pessoa: as seis vistas da peça sozinha, a malha
em arame de três quartos e em raio X de trás, na peça de montagem a vista montada isométrica e a ortogonal em que mais área da peça
aparece, com o corte do encaixe de menor folga, na peça de lataria a curvatura, a luz rasante e a zebra na vista de três quartos, e a
vista isolada só das partes cuja malha ou promessa difere da cópia da receita da última rodada que o crítico julgou. Sem rodada julgada
ou sem a cópia, todas as partes entram, e o relatório do comando diz por quê. O `pedido.md` diz ao crítico o que entrou e o que ficou de
fora, sem citar receita nem rodada. Quando a rodada pedir tudo (uma reprovação da pessoa sobre uma parte que
não mudou, uma dúvida de superfície fora da vista de três quartos), rode `npm run vistas:critica -- <peça> --completo`, que monta o
pacote de antes, com todas as vistas e a vista isolada de todas as partes.

O pacote inteiro mora nessa pasta, com as capturas da bancada, e ficam a desta rodada e a da anterior. O `pacote.json` grava a
resolução, fixa por tipo de imagem, e a câmera de cada uma. Para ver o que mudou entre as duas rodadas na mesma câmera, rode
`npm run vistas:critica -- <peça> --antes-e-depois=<imagem>` (o nome da imagem no `pacote.json` ou um trecho que só uma tenha), que
grava as duas lado a lado em `antes-e-depois/` da pasta atual; não copie imagem à mão. Ele recusa quando a anterior não existe ou a
câmera ou a resolução diferem, e avisa quando o enquadramento mudou, porque a bancada enquadra pela caixa da peça.

Na peça com sombreamento suave sobre a emenda de uma fusão (um `liso` cuja seleção alcança o resultado de `unir`, `subtrair`,
`intersectar` ou `arredondarCostura`), o pacote leva a luz rasante, sem a curvatura, e o `--registrar` cobra essa vista como cobra
da lataria; a etapa já fixa pela pessoa fica fora da regra até voltar ao laço.

Na peça com junta de tubos soldada, o brief do modelador cita a nota de
[`GOTCHAS-POR-OPERACAO.md`](../../../docs/modelar/usar/GOTCHAS-POR-OPERACAO.md#junta-de-tubos-soldada-unir-friso-na-costura-com-cordao-e-unir-com-vincarcostura):
a solda é `unir`, `friso` com `costura` e `cordao` e `unir` com `vincarCostura`, sem anéis da receita nas pontas dos tubos, e a
recusa do friso por curva fechada demais volta ao modelador como limite de geometria, que se resolve pela largura do cordão.

Na peça de lataria (a receita tem passo `subdivisao` ou declara `PLANO.lataria`), o pacote leva também a luz rasante e a curvatura
da lataria, que mostram o amassado largo e raso que nenhuma medida e nenhuma vista comum mostram, e elas saem da bancada, junto com a zebra e a pintura: rode
`npm run vistas:critica -- <peça>` (o Blender, com `--com-blender`, é só conferência opcional). O brief do modelador de peça de lataria leva o mesmo
comando, porque sem ele o modelador não confere a correção de superfície pelas vistas que o crítico vai olhar. O `--registrar`
recusa o veredito do crítico de peça de lataria cujo pacote (o `pacote.json` da pasta da rodada, ou a de `--pacote <pasta>` quando
você usou `--saida`) não trouxe as duas vistas da versão medida. Não contorne a recusa com a dispensa: `PLANO.lataria.dispensa` é da
pessoa, para a superfície que não é chapa, e não para a falta do Blender.

Quando a receita declara `REFINA.esboco`, o alvo é a composta da unidade do esboço, gerada pela ferramenta do esboço no momento,
sobre uma cópia do esboço declarado, e nunca a imagem guardada, que pode ser de uma versão anterior do esboço; a pasta traz também a
sobreposição dos cortes do modelo com os do sólido do esboço, e o relatório do comando diz o desvio máximo de cada corte. A
diferença do esboço vai à pessoa, que decide se a receita a corrige. Quando a peça é instância de `<objeto>/montagem.json`, as
vistas montadas saem com o quadro na caixa da peça e as etapas já construídas em volta: duas vezes o crítico errou por ver a peça
pequena demais no conjunto, e o relatório diz quanto do quadro ela ocupa. Se a peça ainda não está entre as etapas construídas, o
relatório avisa que não há vista montada. O que o crítico recebe e não recebe, o veredito e o limite de rodadas estão em
[O laço do crítico](../../../docs/modelar/usar/REFERENCIA-E-CRITICA-VISUAL.md#o-laço-do-crítico); aqui vale também
não mandar o que mudou, porque contar como foi feito faz revisão virar
concordância. Sem alvo não há rodada; busque o alvo e despache de novo, sem inventar nota.
