/* ajustes-de-curva.js — os ajustes de curva lisa de procedural/pecas/carro-fastback/partes/lataria/receita.js, guardados. ARQUIVO GERADO: não edite à mão.
 *
 * Cada entrada é o resultado de `ajustarCurvaLisa` (núcleo) para um ajuste de que a receita precisa: `impressao` é a dos pontos e das opções que entraram no ajuste,
 * `curva` é o que refaz a mesma curva sem ajustar (`curvaLisaGuardada`) e `medido`, o que o ajuste mediu. Quando a impressão não confere com a entrada dela, a
 * receita ajusta na hora e avisa; quem muda a tabela ou a opção de um ajuste regrava este arquivo com
 *
 *   node tools/modelar/regravar-ajustes-de-curva.mjs procedural/pecas/carro-fastback/partes/lataria/receita.js
 *
 * e confere a malha, porque o ajuste refeito de outra entrada muda a forma. */
export default {
  "planta": {
    impressao: {"versao":3,"pontos":432,"soma":"067cc4d63d985326","opcoes":{"tolerancia":3,"maximoDeClotoides":14,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[999.9997801200196,915.0151214157722],"rumo":-3.135585360709765,"comprimento":4306.390314077154,"joelhos":[{"f":0,"k":-0.000007181576528792364},{"f":0.3464737919501922,"k":-0.0000014741345288994877},{"f":0.4189755027234596,"k":-0.0006162470218567236},{"f":0.44072052523734756,"k":0.0004336605286220063},{"f":0.5403470151185649,"k":0.00012080624871894829},{"f":0.7036819742298523,"k":0.0009612285683673859},{"f":0.7779727077148468,"k":0.003469692779068993},{"f":0.7880655555189604,"k":0.0009610300602634669},{"f":0.8730775244122589,"k":0.0004195700127514339},{"f":1,"k":0.0006285549405084758}],"tolerancia":3},
    medido: {"desvioMaximo":2.7342409664155074,"clotoides":9,"inflexoes":1},
  },
  "teto": {
    impressao: {"versao":3,"pontos":222,"soma":"2c2ee883c12ca0b9","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1],"objetivo":"lisura","trechoMinimo":300}},
    curva: {"inicio":[-0.02886529535826554,1345.8955279291006],"rumo":2.9003487832391,"comprimento":2253.1705159466696,"joelhos":[{"f":0,"k":0.0010069818398226152},{"f":0.2579752051074913,"k":0.00019377535928578134},{"f":0.6992098386349591,"k":0.00025264363947529714},{"f":0.8323555539178324,"k":-0.0010746201766399142},{"f":1,"k":-0.0000728865237185532}],"tolerancia":3},
    medido: {"desvioMaximo":2.5497499685520997,"clotoides":4,"inflexoes":1},
  },
  "quinaDoTeto.x": {
    impressao: {"versao":3,"pontos":206,"soma":"699900bf6a0be191","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1],"objetivo":"lisura"}},
    curva: {"inicio":[-2049.998695739917,430.03342940891434],"rumo":0.1695327367946867,"comprimento":2076.9398322263305,"joelhos":[{"f":0,"k":-0.00003508117960502471},{"f":0.27370111142331455,"k":0.000586427353637708},{"f":0.39404573401102144,"k":-0.002092282017554649},{"f":0.5293315974762353,"k":0.00030857760950731917},{"f":1,"k":-0.000013539657206471468}],"tolerancia":3},
    medido: {"desvioMaximo":2.22416646731889,"clotoides":4,"inflexoes":2},
  },
  "quinaDoTeto.y": {
    impressao: {"versao":3,"pontos":206,"soma":"da44e883541ef0ed","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1],"objetivo":"lisura"}},
    curva: {"inicio":[-2049.995307040401,1048.9723134801025],"rumo":0.08367216411406388,"comprimento":2076.8626849773104,"joelhos":[{"f":0,"k":0.000030071259506470136},{"f":0.349817341541344,"k":0.00002027060167416577},{"f":0.3656098824425746,"k":0.001020790978687036},{"f":0.4943836121967288,"k":0.0009636548563289607},{"f":0.5043836121967288,"k":-0.0003728643283569699},{"f":0.5711878701007873,"k":-0.0013398016277831439},{"f":0.6871469938257044,"k":-0.0002884986201458917},{"f":1,"k":-0.000349103568003843}],"tolerancia":3},
    medido: {"desvioMaximo":2.69450062637985,"clotoides":7,"inflexoes":1},
  },
  "traseira": {
    impressao: {"versao":3,"pontos":75,"soma":"08bff6e83d8b409c","opcoes":{"tolerancia":3,"maximoDeClotoides":12,"duros":[],"eixos":[0,1],"objetivo":"lisura"}},
    curva: {"inicio":[303.9987513801101,-2282.004366846876],"rumo":-0.5975038357079883,"comprimento":830.9480267682247,"joelhos":[{"f":0,"k":-0.00030799254966007124},{"f":0.26798344783540584,"k":0.004987698396041895},{"f":0.326279878977299,"k":-0.0012414479657970009},{"f":0.42924096120950556,"k":0.004301830606123475},{"f":0.7754021786045044,"k":0.0010154852758462443},{"f":0.7854021786045045,"k":-0.023906282953330554},{"f":0.8461897782710971,"k":-0.02954588964874733},{"f":0.8561897782710971,"k":-0.008102374683685073},{"f":0.8661897782710971,"k":0.013724374774397587},{"f":1,"k":0.007411997464277758}],"tolerancia":3},
    medido: {"desvioMaximo":2.7813257153928377,"clotoides":9,"inflexoes":2},
  },
};
