/* ajuda.js — o texto de ajuda do desenho por restrições: o formato `mecanifica.desenho@2` (o @1 segue aceito), as relações, o lado e o que cada estado do
   relatório pede. É o que `npm run desenho -- --ajuda` imprime; a explicação completa está no README do módulo. */

export function textoDaAjuda() {
  return `desenho por restrições: a IA declara pontos, partes e relações em milímetro, o resolvedor dá a geometria.

COMANDOS
  npm run desenho -- <vista>.desenho.json          resolve, grava <vista>.contornos.json e <vista>.png e imprime o relatório
  npm run desenho -- <vista>.desenho.json --so-relatorio   só o relatório, sem gravar
  npm run desenho -- <vista>.desenho.json --json          o relatório em JSON
  npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--ponto-a=h,v --ponto-b=h,v] [--medida=regioes|silhueta]
                                                   razão interseção/união entre dois contornos (ver A RAZÃO)
  npm run desenho -- --ajuda                       este texto
  Códigos de saída: 0 resolvido; 2 uso errado ou arquivo ilegível; 3 descrição inválida; 4 não resolvido (conflito, solto ou lado trocado).

O ARQUIVO <vista>.desenho.json
  { "formato": "mecanifica.desenho@2", "objeto": "<nome>", "vista": "lateral" | "topo" | "frontal", "olhando": "<de que lado se olha>",
    "referencias": { "chao": { "reta": "horizontal", "v": 0 }, "eixo": { "reta": "vertical", "h": 0 } },
    "pontos": { "A": [h, v], ... },                 chute inicial de cada ponto; h para a direita, v para cima
    "partes": { "<nome>": { "circulo": { "centro": "A" } } | { "barra": ["A","B"], "espessura": 40 } |
                          { "poligono": ["A","B","C"] } | { "arco": { "centro": "A", "inicio": "B", "fim": "C" }, "fecha": "corda" | "centro" },
                "raioDoCanto": 8 (opcional, só em barra e poligono: raio em mm de todos os cantos; no polígono também
                                  { "A": 8, "C": 3 } só nos cantos citados; a metade da espessura faz a ponta da barra semicircular),
                "foraDoModelo": true (opcional: a parte não entra na silhueta) },
    "frenteParaFundo": ["<parte>", ...],            opcional: quem esconde quem; sem ele as partes não se escondem
    "relacoes": [ { "nome": "<único>", "<tipo>": ..., "mm" | "graus" | "lado" | "por": ... } ] }

AS RELAÇÕES (cada uma tem um nome, que volta no relatório)
  sobre         ["P", reta | círculo | arco]            o ponto fica sobre a reta ou a curva
  coincidente   ["P", "Q"]                              os dois pontos são um só
  distancia     ["P", "Q"], mm                          distância entre pontos
                ["P", reta], mm, lado                   distância de um ponto a uma reta; o lado é obrigatório
  raio          "<círculo ou arco>", mm
  tangente      ["<círculo>", reta], lado               o círculo toca a reta, e o centro fica do lado dito
                ["<círculo>", "<círculo>"], por         por "fora" ou por "dentro"
  paralela      [reta, reta]
  perpendicular [reta, reta]
  vertical      ["P", "Q"]                              os dois pontos têm o mesmo h
  horizontal    ["P", "Q"]                              os dois pontos têm o mesmo v
  angulo        [reta, reta], graus                     da primeira reta para a segunda, anti-horário
  igual         [reta, reta] (mesmo comprimento) ou [círculo, círculo] (mesmo raio)
  Uma reta é o nome de uma referência, o nome de uma barra (o eixo dela) ou dois pontos ["P","Q"], na ordem que dá o sentido.

O CANTO ARREDONDADO
  "raioDoCanto" não passa pelo resolvedor: as relações valem para os pontos de canto vivo, como numa cotagem, e o arco tangente às
  duas arestas é traçado depois. O raio precisa caber: o comando recusa o desenho se as tangentes de dois cantos somam mais que a aresta.

O LADO
  A distância de um ponto a uma reta e a tangência não têm sinal: o resolvedor aceita os dois lados e o chute decide. Por isso o
  "lado" (acima = v maior; abaixo; direita = h maior; esquerda) é obrigatório, e é conferido depois de resolver.

A RAZÃO (razao)
  Mede o primeiro contorno contra o segundo sobre os polígonos, sem rasterizar, de três jeitos: sem alinhar, pelo ponto declarado
  (--ponto-a e --ponto-b) e pela melhor translação, que separa o erro de posição do erro de forma.
  --medida=regioes (padrão)   a união das regiões de cada arquivo, sem as foraDoModelo. O vão que as regiões cercam, como o arco da
                              roda sob a longarina, fica de fora; o anel de fora da silhueta o enche e exagera o acerto.
  --medida=silhueta           a medida antiga, o anel de fora da silhueta.
  Quando a outra medida dá um número diferente, ele sai ao lado, para ninguém comparar razões de medidas diferentes sem saber.
  --parte-a e --parte-b medem uma região pelo nome e não dependem da medida. O arquivo precisa de regiões para a medida padrão.

O RELATÓRIO
  resolvido    0 graus de liberdade: grava os contornos e a vista em traço, e lista as medidas derivadas para você conferir.
  conflito      lista as relações que não cabem juntas, pelo nome. Corrija o valor ou apague uma; não mexa nas coordenadas.
  solto         lista as partes e os pontos que ainda se movem. Acrescente relações que os prendam.
  lado trocado  a solução ficou do lado oposto ao "lado" declarado. Diz a relação, o lado pedido e o lado em que ficou, e o chute
                refletido que resolve. Redundância é só aviso.
`;
}
