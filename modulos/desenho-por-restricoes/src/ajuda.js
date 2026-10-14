/* ajuda.js — o texto de ajuda do desenho por restrições: o formato `mecanifica.desenho@3` (o @2 e o @1 seguem aceitos), as relações, o lado, os
   parâmetros, as peças e a família, e o que cada estado do relatório pede. É o que `npm run desenho -- --ajuda` imprime; a explicação
   completa está no README do módulo. */

export function textoDaAjuda() {
  return `desenho por restrições: a IA declara pontos, partes e relações em milímetro, o resolvedor dá a geometria.

COMANDOS
  npm run desenho -- <vista>.desenho.json          resolve, grava <vista>.contornos.json e <vista>.png e imprime o relatório
  npm run desenho -- <vista>.desenho.json --so-relatorio   só o relatório, sem gravar
  npm run desenho -- <vista>.desenho.json --json          o relatório em JSON
  npm run desenho -- <vista>.desenho.json --pecas=<catalogo.json>[,<outro.json>]   peças de desenho de um catálogo (ver AS PEÇAS)
  npm run desenho -- razao <a.contornos.json> <b.contornos.json> [--parte-a=<nome>] [--parte-b=<nome>] [--partes] [--ponto-a=h,v --ponto-b=h,v] [--medida=regioes|silhueta]
                                                   razão interseção/união entre dois contornos (ver A RAZÃO)
  npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=...]
                                                   desenha a família para um conjunto de valores (ver A FAMÍLIA)
  npm run desenho -- familia <f.familia-de-desenho.json> --provar
                                                   resolve a família nos extremos e no médio de cada parâmetro
  npm run desenho -- --ajuda                       este texto
  Códigos de saída: 0 resolvido; 2 uso errado ou arquivo ilegível; 3 descrição inválida; 4 não resolvido (conflito, solto ou lado trocado).

O ARQUIVO <vista>.desenho.json
  { "formato": "mecanifica.desenho@3", "objeto": "<nome>", "vista": "lateral" | "topo" | "frontal", "olhando": "<de que lado se olha>",
    "parametros": { "largura": 120, "meia": "=largura/2" },          só no @3: valores com nome, usados em qualquer campo numérico
    "referencias": { "chao": { "reta": "horizontal", "v": 0 }, "eixo": { "reta": "vertical", "h": 0 } },
    "pontos": { "A": [h, v], ... },                 chute inicial de cada ponto; h para a direita, v para cima
    "partes": { "<nome>": { "circulo": { "centro": "A" } } | { "barra": ["A","B"], "espessura": 40 } |
                          { "poligono": ["A","B","C"] } | { "arco": { "centro": "A", "inicio": "B", "fim": "C" }, "fecha": "corda" | "centro" },
                "raioDoCanto": 8 (opcional, só em barra e poligono: raio em mm de todos os cantos; no polígono também
                                  { "A": 8, "C": 3 } só nos cantos citados; a metade da espessura faz a ponta da barra semicircular),
                "foraDoModelo": true (opcional: a parte não entra na silhueta) },
    "construcao": { "<nome>": { "circulo": { "centro": "A" } } | { "reta": ["A","B"] } },   só no @3
    "frenteParaFundo": ["<parte>", ...],            opcional: quem esconde quem; sem ele as partes não se escondem
    "relacoes": [ { "nome": "<único>", "<tipo>": ..., "mm" | "graus" | "lado" | "por" | "eixo": ... } ] }

AS RELAÇÕES (cada uma tem um nome, que volta no relatório)
  sobre         ["P", reta | círculo | arco]            o ponto fica sobre a reta ou a curva
  coincidente   ["P", "Q"]                              os dois pontos são um só (dois centros coincidentes são círculos concêntricos)
  distancia     ["P", "Q"], mm                          distância entre pontos
                ["P", "Q"], mm, eixo, lado              só em h (eixo "h", lado "esquerda"|"direita") ou só em v (eixo "v", lado
                                                        "acima"|"abaixo"); o lado diz onde o primeiro ponto fica em relação ao segundo
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
  simetrico     ["P", "Q", reta]                        P e Q são simétricos em relação à reta (só no @3)
                ["<parte>", "<parte>", reta]            duas partes da mesma forma: o ponto de mesma posição na lista é o simétrico
                                                        (círculos: centros simétricos e raios iguais; barras de mesma espessura)
  Uma reta é o nome de uma referência, o nome de uma barra (o eixo dela), o nome de uma reta de construção ou dois pontos ["P","Q"], na
  ordem que dá o sentido.

O CANTO ARREDONDADO
  "raioDoCanto" não passa pelo resolvedor: as relações valem para os pontos de canto vivo, como numa cotagem, e o arco tangente às
  duas arestas é traçado depois. O raio precisa caber: o comando recusa o desenho se as tangentes de dois cantos somam mais que a aresta.
  No @3, um canto do polígono pode nomear o centro do arco: "raioDoCanto": { "KF": { "raio": 211.3, "centro": "CKF" } }. "CKF" é então
  um ponto que as relações citam: "coincidente" com o eixo de um furo diz que o canto é concêntrico com ele, e "distancia" entre dois
  centros mede o entre-eixos. O chute do centro sai do canto como foi chutado; se o resolvedor o pôr em outro círculo tangente às
  duas arestas, o estado é lado trocado e o relatório pede os chutes do canto mais perto da forma final.

A GEOMETRIA DE CONSTRUÇÃO
  "construcao" guarda o que amarra relações sem ser parte: um círculo ("raio" por relação, como as partes) ou uma reta com nome para
  dois pontos. O círculo entra no resolvedor e fica fora dos contornos e da vista; a reta é um nome para ["P","Q"].

OS PARÂMETROS (só no @3)
  "parametros": { "nome": número | "outro" | "=expressão" }. Qualquer campo numérico (coordenada do chute, mm, graus, espessura,
  raioDoCanto, chute do raio, v e h de referência) aceita um número, o nome de um parâmetro ou "=expressão" com + - * /, parênteses e
  sin, cos, tan, atan, atan2 e sqrt (ângulos em graus). Um valor escrito uma vez vale em todos os lugares que o citam.

AS PEÇAS (só no @3)
  Uma peça é um trecho do formato com parâmetros de entrada e pontos de ligação, no desenho ("pecas") ou num catálogo
  ({ "formato": "mecanifica.pecas-de-desenho@1", "pecas": { ... } }, com --pecas):
    "pecas": { "anel": { "parametros": { "diametro": null, "comprimento": 100 },     null é obrigatório
                         "pontos": {...}, "partes": {...}, "construcao": {...}, "relacoes": [...],
                         "ligacoes": { "inicio": "P", "fim": "Q", "tambor": "corpo" },   os nomes que o desenho de fora enxerga
                         "frenteParaFundo": [...] } }
    "usos": { "pilha": { "peca": "anel", "parametros": { "diametro": "=2*raio" }, "origem": [0, 0], "nomeiaPartes": { "corpo": "tambor" } } }
  Os nomes internos ganham o prefixo "pilha." (pontos, partes, relações); o desenho de fora cita só "pilha.inicio", "pilha.fim" e as
  outras ligações. "origem" desloca só os chutes. "nomeiaPartes" dá à parte um nome final sem prefixo (o nome de uma região de
  referência). Em "frenteParaFundo" do desenho, o nome de um uso vale pelas partes dele. Uma peça não usa outra peça.

A FAMÍLIA (familia)
  { "formato": "mecanifica.familia-de-desenho@1", "id": "...", "versao": "1.0.0",
    "parametros": { "largura": { "unidade": "mm" | "graus" | "razao", "padrao": 120, "minimo": 80, "medio": 120, "maximo": 200 } },
    "perfis": { "pequeno": { "parametros": { "largura": 90 } } },
    "desenho": { ...um desenho @3 que lê "largura" por nome... } }
  O parâmetro da família é escrito uma vez, na família; um que nenhum campo do desenho lê é recusado. "familia" desenha para os
  valores dados (padrão, depois o perfil, depois --valores; fora da faixa é recusado) e, com --grava=<pasta>, grava
  <vista>.desenho.json (com as peças dentro) e os contornos e a vista ao lado. "--provar" desenha com todos os parâmetros no mínimo, no médio
  e no máximo, com cada parâmetro no mínimo, no médio e no máximo e os outros no padrão, e com cada perfil, e exige em cada um resolvido
  (nenhum conflito, parte solta nem lado trocado), nenhum polígono cruzado e nenhuma parte toda escondida. Sai com 4 se algum falhar.

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
  --partes    depois da razão geral, a razão de cada região que os dois arquivos têm pelo nome, da pior para a melhor, e as regiões
              que só um deles tem. Não combina com --parte-a nem --parte-b.

O RELATÓRIO
  resolvido    0 graus de liberdade: grava os contornos e a vista em traço, e lista as medidas derivadas para você conferir.
  conflito      lista as relações que não cabem juntas, pelo nome. Corrija o valor ou apague uma; não mexa nas coordenadas.
  solto         lista as partes e os pontos que ainda se movem. Acrescente relações que os prendam.
  lado trocado  a solução ficou do lado oposto ao "lado" declarado. Diz a relação, o lado pedido e o lado em que ficou, e o chute
                refletido que resolve. Redundância é só aviso.
`;
}
