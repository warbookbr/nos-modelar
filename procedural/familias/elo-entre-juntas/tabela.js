/* tabela.js — os parâmetros do elo entre juntas a partir das flanges que ele liga, em milímetro.

   O elo liga a saída de um atuador de junta (a boca A, na flange de saída que gira) à fixação do próximo (a boca B, na flange
   de fixação). Cada boca é descrita pela flange: o diâmetro de fora, o círculo dos furos, a contagem e o diâmetro do furo.
   A entrada aceita os parâmetros de um atuador (`parametrosDoAtuador`), de onde a boca A lê a flange de saída e a boca B a de
   fixação, ou a flange solta `{ diametro, circulo, furos, diametroDoFuro }`.

   FICHA parametrosDoElo
   serve: os parâmetros da família `elo-entre-juntas` pelas duas flanges que o elo liga (a de saída de um atuador de junta e a
     de fixação do seguinte, ou duas flanges soltas), pela seção e pelo comprimento: a carenagem oca do membro, com a parede, a
     cintura e a furação de fixação das duas bocas casada com a das flanges.
   quando: membro de robô (braço, antebraço, coxa, canela) entre duas juntas, de eixos coaxiais em linha reta ou de eixos diferentes
     (o joelho e o cotovelo), com o eixo do membro em curva suave de uma flange à outra.
   unidades: mm.
   campos:
     de: parâmetros do atuador da junta de saída (de `parametrosDoAtuador`) ou a flange { diametro, circulo, furos, diametroDoFuro }.
     para: o mesmo, do atuador seguinte (a boca B toma a flange de fixação dele).
     comprimento: entre os planos das duas flanges, em mm (a distância em y; no elo com desvio, a da boca A à boca B nesse eixo).
     secao: 1 elíptica (padrão), 2 redonda ou 3 de cantos arredondados.
     larguraDaSecao, profundidadeDaSecao: o corpo no meio, em x e em z (mm).
     cintura: o fator do corpo no meio do comprimento (1 reto, menor que 1 cintura, maior que 1 barriga).
     parede: a espessura da parede, em mm (2 por padrão).
     desvio: o ângulo, em graus, entre o eixo da boca B e o da boca A (0 é o elo reto, até 90). A boca B sai na posição e na direção novas, e as
       seções acompanham a curva sem torcer. A restrição `curva-fecha-a-parede` recusa o que dobra demais para a seção, dizendo o recebido e o aceito.
     azimute: a direção do desvio em graus em volta do eixo do elo (0 dobra para +z, no sentido da profundidade; 90 para +x, no da largura).
     deslocamentoLateral: o afastamento extra da boca B, em mm (0 a 40), na direção do desvio (soma-se ao do arco do desvio; para o outro lado,
       gire o azimute 180 graus).
   devolve: os parâmetros completos da família, que a chamada completa com os padrões.
   exemplo:
     parametrosDoElo({ de: parametrosDoAtuador(100), para: parametrosDoAtuador(100), comprimento: 230, larguraDaSecao: 96, profundidadeDaSecao: 76, cintura: 0.85 })
   peça: tools/fixtures/elo-entre-juntas/elo-entre-atuadores.mjs (o elo de antebraço entre dois atuadores de 100 mm) e
     tools/fixtures/elo-entre-juntas/elo-com-desvio.mjs (a canela com o joelho, a 25 graus).
   FIM DA FICHA */

const flangeDeSaida = (a) => ({ diametro: a.diametroDaSaida, circulo: a.circuloDaSaida, furos: a.furosDaSaida, diametroDoFuro: a.diametroDoFuroDaSaida });
const flangeDeFixacao = (a) => ({ diametro: a.diametroDoFlange, circulo: a.circuloDoFlange, furos: a.furosDoFlange, diametroDoFuro: a.diametroDoFuroDoFlange });
/* o que o elo aceita além das duas flanges: o corpo da carenagem */
const CAMPOS_DO_CORPO = ['comprimento', 'secao', 'larguraDaSecao', 'profundidadeDaSecao', 'cintura', 'parede', 'desvio', 'azimute', 'deslocamentoLateral'];
const ehAtuador = (x) => x && x.diametroDaSaida !== undefined;

export function parametrosDoElo({ de, para, ...resto } = {}) {
  if (!de || !para) throw new Error(`elo entre juntas: faltam as duas flanges (de e para); recebido de=${JSON.stringify(de)}, para=${JSON.stringify(para)}; aceito: parâmetros de atuador ou { diametro, circulo, furos, diametroDoFuro }`);
  const a = ehAtuador(de) ? flangeDeSaida(de) : de;
  const b = ehAtuador(para) ? flangeDeFixacao(para) : para;
  const boca = (lado, f) => ({ [`diametroDaBoca${lado}`]: f.diametro, [`circuloDaBoca${lado}`]: f.circulo, [`furosDaBoca${lado}`]: f.furos, [`diametroDoFuroDaBoca${lado}`]: f.diametroDoFuro });
  const desconhecido = Object.keys(resto).find((k) => !CAMPOS_DO_CORPO.includes(k));
  if (desconhecido) throw new Error(`elo entre juntas: o campo ${desconhecido} não existe; aceitos: de, para, ${CAMPOS_DO_CORPO.join(', ')}`);
  return { ...boca('A', a), ...boca('B', b), ...resto };
}
