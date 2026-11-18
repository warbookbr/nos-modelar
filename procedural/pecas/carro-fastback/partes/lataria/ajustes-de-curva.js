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
    impressao: {"versao":1,"pontos":432,"soma":"067cc4d63d985326","opcoes":{"tolerancia":3,"maximoDeClotoides":14,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[999.9997801200196,915.0151214157722],"rumo":-3.135585360709765,"comprimento":4306.390314077154,"joelhos":[{"f":0,"k":-0.000007181576528792364},{"f":0.3464737919501922,"k":-0.0000014741345288994877},{"f":0.4189755027234596,"k":-0.0006162470218567236},{"f":0.44072052523734756,"k":0.0004336605286220063},{"f":0.5403470151185649,"k":0.00012080624871894829},{"f":0.7036819742298523,"k":0.0009612285683673859},{"f":0.7779727077148468,"k":0.003469692779068993},{"f":0.7880655555189604,"k":0.0009610300602634669},{"f":0.8730775244122589,"k":0.0004195700127514339},{"f":1,"k":0.0006285549405084758}],"tolerancia":3},
    medido: {"desvioMaximo":2.7334619267102873,"clotoides":9,"inflexoes":1},
  },
  "teto": {
    impressao: {"versao":1,"pontos":222,"soma":"2c2ee883c12ca0b9","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[-0.03134314872673659,1345.8751950477645],"rumo":2.8964383520853056,"comprimento":2253.5180444335588,"joelhos":[{"f":0,"k":0.0010425261612707405},{"f":0.2455078368111926,"k":0.00020521277325504683},{"f":0.7209395059977937,"k":0.00023585708617132085},{"f":0.8461771654688133,"k":-0.0013811489072374837},{"f":1,"k":0.0006139234429390581}],"tolerancia":3},
    medido: {"desvioMaximo":2.671346278248931,"clotoides":4,"inflexoes":1},
  },
  "quinaDoTeto.x": {
    impressao: {"versao":1,"pontos":206,"soma":"699900bf6a0be191","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[-2049.9903283804756,429.9473302268983],"rumo":0.1812729996702621,"comprimento":2077.422877685231,"joelhos":[{"f":0,"k":-0.00011377003307369999},{"f":0.28701835727576813,"k":0.0006372156073373086},{"f":0.39604451580298744,"k":-0.002462001067286757},{"f":0.5049298824043933,"k":0.0002799130706373826},{"f":1,"k":0.000013664727977399174}],"tolerancia":3},
    medido: {"desvioMaximo":2.1369525395014817,"clotoides":4,"inflexoes":2},
  },
  "quinaDoTeto.y": {
    impressao: {"versao":1,"pontos":206,"soma":"da44e883541ef0ed","opcoes":{"tolerancia":3,"maximoDeClotoides":8,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[-2049.9994136086234,1048.9933138889737],"rumo":0.08062103553516695,"comprimento":2077.4564139757044,"joelhos":[{"f":0,"k":0.00005269537086120248},{"f":0.33080851394282035,"k":0.00000692707182417867},{"f":0.44559070107736826,"k":0.0015741539624626987},{"f":0.6005738647108608,"k":-0.002314893832458457},{"f":0.6188496051917656,"k":-0.0002806053696672737},{"f":1,"k":-0.0003645735967210557}],"tolerancia":3},
    medido: {"desvioMaximo":0.5883175375136553,"clotoides":5,"inflexoes":1},
  },
  "traseira": {
    impressao: {"versao":1,"pontos":75,"soma":"08bff6e83d8b409c","opcoes":{"tolerancia":3,"maximoDeClotoides":12,"duros":[],"eixos":[0,1]}},
    curva: {"inicio":[303.99996954975325,-2282.0065473278337],"rumo":-0.5963442090819777,"comprimento":833.9419886217843,"joelhos":[{"f":0,"k":-0.00033908180552454586},{"f":0.2641380572283484,"k":0.004967058975994703},{"f":0.3273031449213901,"k":-0.0012541026109122355},{"f":0.41740618703747057,"k":0.004120501055864773},{"f":0.7568026904977136,"k":0.0015395493131165061},{"f":0.8271502217059193,"k":-0.0385884462471806},{"f":0.8766624335055828,"k":0.016582845858977742},{"f":1,"k":0.0052556947320993395}],"tolerancia":3},
    medido: {"desvioMaximo":2.6154565037558375,"clotoides":7,"inflexoes":2},
  },
};
