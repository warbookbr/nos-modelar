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
  npm run desenho -- familia <f.familia-de-desenho.json> [--perfil=<nome>|minimo|medio|maximo] [--valores=a=1,b=2] [--grava=<pasta>] [--pecas=...]
                                                   desenha a família para um conjunto de valores (ver A FAMÍLIA)
  npm run desenho -- familia <f.familia-de-desenho.json> --provar
                                                   resolve a família nos extremos, no médio e nos pares de extremos cruzados
  npm run desenho -- familia <f.familia-de-desenho.json> --ajustar=<referencia.contornos.json> [--abrir=0.4] [--soltos=a,b] [--grava=<pasta>]
                                                   os valores da família mais próximos da referência (ver O AJUSTE)
  npm run desenho -- conferir [<pasta das famílias>]   o gate familias-de-desenho:check: a prova de toda família sob a pasta
                                                   (procedural/familias-de-desenho) e a conferência das pastas de perfil gravadas
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
                                  { "A": 8, "C": 3 } só nos cantos citados; a metade da espessura faz a ponta da barra semicircular;
                                  zero é canto vivo, para a peça deixar o arredondamento ao uso),
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
  sin, cos, tan, atan, atan2, sqrt (ângulos em graus) e min e max (dois ou mais valores). Um valor escrito uma vez vale em todos os
  lugares que o citam.
  Um parâmetro também pode ser uma palavra: "sentido": "abaixo". Ele não entra em conta, e o "lado", o "eixo" e o "por" de uma relação
  aceitam o nome dele no lugar da palavra. O "lado" de uma distância com "eixo" aceita ainda um sinal, o nome de um parâmetro numérico
  ou "=expressão": positivo é a direita ou acima, negativo a esquerda ou abaixo, e o mesmo número que espelha os chutes da peça
  ("=sentido*comprimento") escolhe o lado da relação. Palavras: acima, abaixo, esquerda, direita, fora, dentro, h e v; o nome de um
  parâmetro numérico, num valor passado a outro parâmetro, vale mais que a palavra de mesmo nome.

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
  A orientação vem do uso: a peça escreve a distância com sinal, { "distancia": ["Q","P"], "mm": "comprimento", "eixo": "eixo",
  "lado": "sentido" }, com "eixo": "v" e "sentido": "acima" como padrão, e o uso diz { "eixo": "h", "sentido": "direita", "angulo": 0 }.
  O "angulo" (ou a "origem") continua só chutando, e precisa apontar para o mesmo lado: o uso que pede a peça "abaixo" e a chuta para
  cima resolve, mas o relatório avisa que a peça está virada (uso, peça, lado pedido e lado do chute) e a prova da família reprova.
  Só vale para a relação cujo lado ou eixo veio de parâmetro; o lado escrito direto continua sem conferir o chute.

A FAMÍLIA (familia, conferir)
  { "formato": "mecanifica.familia-de-desenho@1", "id": "...", "versao": "1.0.0", "catalogo": "pecas.json",
    "parametros": { "largura": { "unidade": "mm" | "graus" | "razao", "padrao": 120, "minimo": 80, "medio": 120, "maximo": 200 } },
    "restricoes": [ { "id": "capo-abaixo-do-painel", "expressao": "capo < painel - 5", "motivo": "..." } ],
    "perfis": { "pequeno": { "parametros": { "largura": 90 } } },
    "desenho": { ...um desenho @3 que lê "largura" por nome... } }
  O parâmetro da família é escrito uma vez, na família; um que nenhum campo do desenho lê é recusado. "catalogo" é o catálogo de
  peças que o desenho usa, em caminho relativo ao arquivo da família (ou uma lista deles): "familia" e "--provar" o carregam sem
  --pecas, que continua aceito para acrescentar outros. "restricoes" são relações de ordem entre parâmetros: a expressão compara duas
  somas por <, <=, > ou >=, com parâmetros da família, + - * /, parênteses e as funções de OS PARÂMETROS (min, max, sqrt...). Valem para
  o padrão, o médio e cada perfil (a família que as fere é recusada), e o conjunto de valores que as fere é recusado antes de
  desenhar, em "familia" e na prova. "familia" desenha para os valores dados (padrão, depois o perfil, depois --valores; fora da faixa
  é recusado) e, com --grava=<pasta>, grava <vista>.desenho.json (com as peças dentro) e os contornos e a vista ao lado. Toda família
  tem os perfis "minimo", "medio" e "maximo" (todos os parâmetros naquele ponto da faixa), e uma família não os declara.
  "--provar" desenha com todos os parâmetros no mínimo, no médio e no máximo, com cada parâmetro no mínimo, no médio e no máximo e os
  outros no padrão, com cada par de parâmetros nos extremos cruzados (o mínimo de um com o máximo do outro, dos dois jeitos, os outros
  no padrão) e com cada perfil. Em cada conjunto exige resolvido (nenhum conflito, parte solta nem lado trocado), nenhum polígono
  cruzado, nenhuma parte toda escondida e nenhuma peça virada; o conjunto que fere uma relação de ordem não é desenhado, sai como
  recusa dizendo qual relação, e não reprova. Sai com 4 se algum conjunto desenhado falhar.
  "conferir [<pasta>]" é o gate familias-de-desenho:check: roda a prova de toda família sob a pasta e confere que a pasta ao lado dela
  com o nome de um perfil ("referencia/", "minimo/", "medio/", "maximo/") ainda é o que a família gera para ele, nos bytes do desenho
  e dos contornos (a vista em PNG só precisa existir). A família com o perfil "referencia" e sem a pasta reprova. Sai com 3 se uma
  família for inválida, com 4 se a prova ou uma pasta falhar e com 2 se não achar família nenhuma.

O AJUSTE (familia --ajustar)
  "--ajustar=<referencia.contornos.json>" procura os valores da família que dão a maior razão interseção/união contra o contorno da
  referência (a união das regiões, pela melhor translação, como "razao"), a partir do padrão, do --perfil e dos --valores. A busca
  anda um parâmetro por vez, um passo para cima e para baixo, e encurta o passo quando nenhum melhora; o conjunto que fere uma relação
  de ordem ou que a prova reprovaria não entra. Ela acha um máximo local, e começar de outro perfil pode dar outro. Diz a razão, o
  deslocamento, cada valor e quais ficaram no mínimo ou no máximo da faixa, e termina com a linha --valores=... pronta.
  "--abrir=0.4" deixa a busca ir além da faixa, 0,4 vez o médio de cada parâmetro para cada lado, e diz quais valores ficaram fora
  dela: é quanto a faixa precisa crescer para a família cobrir a referência. "--soltos=a,b" busca só esses parâmetros. Com
  --grava=<pasta>, grava ajuste.json (a referência e o sha256 dela, a razão, os valores e o que ficou no limite ou fora) e o desenho dos
  valores achados, com os contornos e a vista. Cada avaliação desenha a família inteira: numa família de quinze parâmetros, a busca
  leva alguns minutos.

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
