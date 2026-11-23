# Guia de Modelagem — `carro-quadrado/lataria` (Referência Otimizada para Agentes)

Este documento registra **o que foi feito, por que foi feito e como resolver cada classe de problema** na modelagem da lataria da perua quadrada (`carro-quadrado/lataria`), para que qualquer agente que modele outro carro do zero reutilize os padrões sem repetir tentativas e erros.

---

## 1. Arquitetura da receita

A receita é dividida em 4 arquivos pequenos com responsabilidades isoladas:

- [`partes/lataria/receita.js`](partes/lataria/receita.js): tabela paramétrica única (`TABELA`), catálogo de materiais PBR (`MATERIAIS`), montagem dos passos (`gerarPassos`), `CONTATOS`, `PONTOS`, `vaos` e `PLANO`.
- [`partes/lataria/receita/chapa.js`](partes/lataria/receita/chapa.js): gaiola 100% quad da chapa contínua (`gaiolaPorRede`), `contornoComFilete`, `projetarVista` e arcos de roda (`furoPassante`).
- [`partes/lataria/receita/parachoques.js`](partes/lataria/receita/parachoques.js): para-choques dianteiro/traseiro (`gaiolaVarrida`), frisos laterais e fenda do capô (`conformarNaChapa`).
- [`partes/lataria/receita/frente-traseira.js`](partes/lataria/receita/frente-traseira.js): grade frontal, faróis principais, setas dianteiras, lanternas traseiras, neblina, placas, puxador, fechadura, churrasqueira de ventilação e escapamento.

**Regra de ouro de IDs:** usar um gerador `proxId()` para blocos dinâmicos e reservar IDs altos fixos (`900`, `901`, …) para peças citadas em `ALIASES` (como cilindros com tampas `fechaduraTampaInteiro` e `escapamentoInteiro`), evitando colisão ao inserir sub-peças novas.

---

## 2. Problemas geométricos reais e soluções comprovadas

| Problema visual | Causa raiz | Solução aplicada |
|---|---|---|
| **Losango/beliscão no centro do capô e da tampa traseira** | `gaiolaPorRede` com `simetria: 'x'` inclui nós de 2 faces no plano de simetria (`f_cintura`, `t_cintura`) em `rede.passo.cantos`. Com `borda: 'cantos'`, eles ficam presos como cantos agudos. | Filtrar `f_cintura` e `t_cintura` fora de `cantos` antes de passar à `subdivisao` e ativar `costuraExata: true`. |
| **Estrela/beliscão (`val: 3`) na base da coluna D e na quina do capô** | Retalhos triangulares de 3 lados (`f_capo_canto`, `c_tampa_canto`) criavam polos internos de valência 3 bem na quina visível. | Converter ambos em retalhos **100% quad de 4 lados** usando pares de nós auxiliares (`f_canto`/`f_quina` e `t_canto`/`t_quina`), mantendo sempre `cintura` por dentro de `vinco` para não gerar dobra aguda na `espessura`. |
| **Lateral "chata" sem o vinco horizontal característico** | Gaiola de 6 níveis não tinha curva longitudinal dedicada ao ombro/vinco da carroceria. | Passar `secoes` para **7 níveis** (`soleira`, `baixo`, `meio`, `vinco`, `cintura`, `quina`, `eixo`) com `vinco` em reta contínua levemente ascendente da frente (`718 mm`) até o sulco do âmbar traseiro (`800 mm`) e `vincos.lateral: 0.85`. |
| **Ombros frontais "balão" e nariz alto demais** | `quina` do para-lama muito para dentro (`x = 645`) e `cintura`/`eixo` altos demais (`y = 796..810`), gerando raio enorme acima dos piscas. | Trazer `quina` para fora (`x = 718`), baixar a ponta do capô (`y = 756`) e reforçar `vincos.quina: 0.30`. |
| **Colunas A em "pirâmide" (muito inclinadas para dentro)** | Teto estreito demais (`x = 580`) em relação à cintura (`x = 775`). | Alargar a quina do teto na cabine (`x = 622`), alargar a base/topo do vão `paraBrisa` e arredondar os cantos (`r = 32..36 mm`). |
| **Coluna B muito rígida e canto da porta seco** | Janelas desenhadas como retângulos verticais simples. | Arredondar o canto superior-dianteiro da janela da porta (`r = 145 mm`) e inclinar a borda dianteira de `lateralTraseiro` para trás descendo (`-412` no topo → `-456` na base). |
| **Traseira estufada ao contrário (sem Curva 1)** | `traseira` avançava para `-z` na parte de baixo. | Manter vertical no trecho do âmbar (`z = -2022` em `y = 800`) e recuar para frente descendo até o para-choque (`z = -1982` em `y = 430`). |
| **Abertura frontal falhando com "borda que não fecha"** | Contorno da `aberturaPorContorno` encostando na dobra curva lateral do para-lama. | Manter `aberturas.frontal` dentro da face frontal plana (`±742`, `y = 568..700`); os piscas envolvem o canto por fora da abertura. |

---

## 3. Como casar peças envolventes ao milímetro na chapa

Para lanternas traseiras e piscas dianteiros que dobram da face traseira/frontal para a lateral **sem folga, sem moldura preta grossa e sem ser "mordidos" pela chapa**:

1. **Amostrar a malha real da chapa antes de modelar** executando apenas `rec.PASSOS[0]` (`subdivisao` id 1) em Node e lendo `(x, y, z)` dos vértices `st.V` na faixa do canto.
2. **Parametrizar a superfície local** `amostrarPele(u, y, offsetMm)` com `u ∈ [0, 1]` (face plana → arco elíptico do canto → face lateral), suavizando o `offsetMm` perto de `u → 1` para a lente morrer rente à lataria.
3. **Construir a lente em `subdivisao` (`niveis: 0`)** com array `vertices: [[x,y,z], ...]` e `faces: [[...]]` (zero entradas extras em `TOPO`, 100% manifold, sempre conferindo o winding com produto vetorial `(dP/du) × (dP/dy)` — atenção: na traseira `-z` e na frente `+z` têm sentidos opostos!).
4. **Regra de camadas:** em malhas com mais de 2 linhas verticais (`rows > 1`), usar **2 camadas** (trás + frente com domo/chanfro embutido), nunca uma camada intermediária com vértices internos sem face (o núcleo recusa vértices órfãos).

---

## 4. Receita de óptica automotiva realista (PBR nativo)

O adaptador (`src/autoria/adaptar-three.js`) já suporta `MeshPhysicalMaterial` completo e mapas procedurais via `MATERIAIS`:

- **Lanternas traseiras translúcidas (`lanternaSeta`, `lanternaFreio`, `lanternaRe`):**
  - `verniz: 0.95..0.96`, `asperezaDoVerniz: 0.03..0.04`, `transmissao: 0.60..0.66`, `tomDoVidro`, `indiceDeRefracao: 1.49` e `relevo: { tipo: 'prismas', escala: 2.8..3.0, intensidade: 0.45..0.48, projecao: 'caixa' }`.
  - Sempre colocar um **refletor metálico cromado** (`metalicidade: 0.92`, `aspereza: 0.14`) recuado atrás da lente para dar profundidade óptica.
  - Evitar "barrinhas pretas" coladas na frente da lente (causam z-fighting); usar sulcos geométricos reais (como o canal em V entre as 2 faixas âmbar alinhado ao vinco lateral).
  - Luz de ré cristal: modelada **embutida dentro** da faixa vermelha inferior (vermelho embaixo, à esquerda e à direita) e recuada `0.1 mm` em relação ao vermelho para não vazar na vista de perfil.
- **Faróis dianteiros com profundidade real (`farol`):**
  - **Nunca usar cubo maciço na carcaça** até a frente (ele tampa a parábola e o bulbo!): usar placa traseira recuada + moldura externa **oca**.
  - Camadas internas: máscara prata com recorte circular cortado no topo/base (criando os arcos `(` `)` laterais) → parábola circular côncava profunda → conjunto óptico central da lâmpada.
  - Lente frontal: usar `mistura: 'transparente'` (`opacidade: 0.40..0.45`) + `verniz: 1.0` + estrias verticais reais na geometria (evitar `transmission` puro em malha fechada dupla quando se quer ver o refletor com nitidez no estúdio da bancada).
- **Capô como peça separada real (`capo` + `cofreCapo` em `receita/capo.js`) em vez de fitas `conformarNaChapa`:**
  - **Nunca colocar os vincos longitudinais do capô na coluna `L5` (`quina`) da `chapa`:** `L5` forma a coluna A; puxá-la para dentro em `z = 845` torce a base da coluna A em "S" e cria bicos nos cantos do teto.
  - **Solução definitiva:** deixar `L5` livre para formar uma coluna A reta e uniforme (`~62 mm`) com teto abobadado suave, recortar o vão real do capô + vão frontal na `chapa` via `subtrair` dedicado (`passoVaoCapoNaChapa`), e construir o `capo` com sua própria `gaiolaPorRede` (`espessura: 6 mm`, vincos longitudinais próprios e dobra frontal de lombada) deixando **fenda física real de 4 mm** contínua até a divisão farol/pisca.
  - **Rasgos de respiro reais no capô:** cortar diretamente na malha do `capo` com um único bloco `subtrair` de 24 prismas verticais sobre uma bandeja escura (`cofreCapo`) 14–20 mm abaixo — elimina qualquer bloco colado/torto ("churrasqueira") e mostra a espessura real da chapa nos rasgos.
  - **Atenção nas calhas do `cofreCapo`:** manter as calhas laterais `16–22 mm` abaixo da pele externa (e acima de `y = 706` na frente) para nunca aflorarem na fenda nem encostarem nos faróis/setas, usando a calha traseira (`y = 921`) encostada na face interna do capô para fechar o grafo de contatos (`chapa ↔ cofreCapo ↔ capo`).
- **Portas independentes de quadro completo (`portaDireita` e `portaEsquerda`) com 100% da curvatura da lataria:**
  - **Nunca reconstruir portas em `gaiolaPorRede` separada nem usar só `divisaoPorContorno` (fenda 0 mm):** usar a operação nativa **`aberturaPorContorno` com `lente: true` e `recuoDaLente: m(4)`** em `vista: 'x'` (`sentido: '+'` para `portaDireita` e `sentido: '-'` para `portaEsquerda`), executada logo após os arcos de roda.
  - A `chapa` recebe os dois vãos reais fechados com parede de `8 mm`, preservando soleira contínua (`y = 255..328`), coluna A estrutural fixa e coluna B fixa; cada `lente` herda bit-a-bit o bojo Curva 3, o vinco `L3`, o chanfro `L4` e a inclinação da coluna A com **fenda física real de 4 mm**.
  - Em seguida, abrir o vão do vidro (`vidros.porta`) diretamente sobre cada `lente` (`{ op: 'aberturaPorContorno', id, parte: 'lente' }`), dividir o `frisoLateral` em 3 trechos nas fendas reais (acoplando o trecho da porta + maçaneta à própria parte da porta) e declarar `portaDireita`/`portaEsquerda` em `ilhas`.
  - **Cuidado no topo do contorno da porta (`vista: 'x'`):** manter o topo ~10–15 mm abaixo da dobra da `quina` (`y = 1342` para `quina = 1362`) para evitar sobreposição de camadas na curvatura do teto.
- **Frisos laterais (`frisoLateral`):**
  - Usar `conformarNaChapa` sobre `stChapa` (calculado uma vez só em `parachoques.js`) — executa em fração de segundo e acompanha a curvatura 3D da lateral.

---

## 5. Estado das rodadas e próximos blocos

### Concluído neste ramo (`envio/carro-quadrado-forma`)
- **Fatia A (`26423358`):** casco 100% quad sem estrela na coluna D, vinco horizontal lateral contínuo, Curvas 1/3/4, colunas A/B/D corrigidas.
- **Fatia B (`d6226993`):** lanternas traseiras envolventes 3D com lentes prismáticas translúcidas, sulco em V contínuo, refletor interno e ré embutida no vermelho.
- **Fatia C (`9311007d`, `a6e0ef2e`):** conjunto óptico dianteiro com altura real, farol trapezoidal com parábola 3D + máscara prata + lente transparente, pisca embutido curvo em "D" e grade trapezoidal de 7 lâminas.
- **Bloco 1 (`f3dd95ec`):** nariz mais fino sem ombros "balão", colunas A mais verticais com teto mais largo e para-brisa arredondado.
- **Bloco 2 (`40952942`):** recesso horizontal sob o lábio do capô, borda interna dos faróis mais suave (`12 mm`, cantos `r = 16 mm`), aro vítreo fino (`3.5 mm`), 32 estrias verticais reais na lente sem telinha quadriculada nem "alvo" concêntrico, estrias horizontais nos piscas dianteiros e grade de 7 lâminas mais profunda e contrastada.
- **Bloco 3 (`903ed6a8`):** para-choque dianteiro esbelto e afunilado (`y = 256..498`) com friso claro fino (`7 mm`), faróis de neblina trapezoidais com estrias verticais e placa dianteira mais alta com cantos arredondados.
- **Bloco 3B (`01ff1bd4`):** chanfro superior nos para-lamas, para-choque dianteiro subido `+26 mm` sem espichar afinando o bigode, e brilho óptico interno (cromo vivo nos faróis, bacia côncava 3D + bulbo nos neblinas e lente âmbar transparente com refletor nos piscas).
- **Bloco 4A (`2161be45`):** colunas A corrigidas (retas, uniformes `~62 mm`, cantos do teto suavemente arredondados, sem torção em S), `capo` como peça separada real com fenda física contínua de `4 mm` envolvendo a dobra frontal até a divisão farol/pisca, vincos longitudinais próprios, 24 rasgos reais de respiro cortados na malha do capô, e remoção definitiva das fitas `fendaCapo` e blocos `churrasqueira`.
- **Bloco 4B (`c3df1a7`):** recorte real envolvente do alojamento da `setaDianteira` no canto do para-lama (`x = ±840, y = 568..702, z = 1946..2040`, frente + lateral, sem chapa fechada atrás do pisca), carcaça preta da seta 100% contida atrás/dentro da altura da lente âmbar, e remoção do `cofreCapo`.
- **Bloco 4B-2 + 4C (`8176948d`, `be94a1e2`, `105ba154`):** canto superior do para-lama avançado e mais quadrado cobrindo a `setaDianteira` por cima (`e0_cintura = [768, 738]`, `f_canto = [760, 738, 1982]`, `f_quina = [694, 742, 1998]`); portas independentes `portaDireita` e `portaEsquerda` de quadro completo recortadas da `chapa` via `aberturaPorContorno` (`lente: true`, `recuoDaLente: 4 mm`), canto superior frontal suavizado (`r = 135 mm` concêntrico ao vidro), Coluna B alargada e paralela (`~98 mm` total), janelas laterais traseiras alinhadas em `y = 1312`, ajuste lateral da Coluna A preservando o para-brisa intacto, soleira contínua (`y = 255..328`), friso lateral dividido nas fendas reais e maçanetas pretas acopladas em cada porta.
- **Bloco 4D (`9c1d5fb9`):** `tampaTraseira` (porta-malas) como peça separada real via `aberturaPorContorno` (`vista: 'z', sentido: '-', lente: true, recuoDaLente: 4 mm`) com vidro traseiro (`y = 1312` alinhado às janelas laterais) e rebaixo trapezoidal da placa (`5,5 mm`) recortados diretamente na tampa, para-choque traseiro esbelto (`y = 278..515`, friso claro de `7 mm`), fechadura detalhada com miolo metálico e escapamento levemente inclinado (`-5°`).
- **Bloco 5A (`d1bbd169`):** `tampaTanque` corrigida como portinhola separada real no lado direito (`aberturaPorContorno` `+x`, `lente: true`, `recuoDaLente: 2,5 mm`, cantos `r = 16 mm`) + 4 abas estampadas salientes (`arcosEstampados`, `receita/acabamentos.js`) na cor da `lataria` com relevo `+14 mm` no topo e dobra interna de `18 mm` na caixa de roda.
- **Bloco 5B (`9c983cd6`) + 5C:** guarnições de borracha preta nos 5 vãos de vidro via `friso` nativo sobre `aberturaPorContorno` (com `sentido: '+'` na porta direita e `sentido: '-'` na porta esquerda para simetria exata da normal externa — e borracha do para-brisa gerada antes de `vaoCapo`!), vidros esverdeados translúcidos (`vidroAutomotivo`, `lente: true`), plásticos das portas (coluna do quebra-vento + triângulo base na coluna A) e retrovisores externos chanfrados com espelho metálico acoplados a `portaDireita` e `portaEsquerda`.

### Próxima etapa sugerida
- **Rack de teto (trilhos + 3 travessas), rodas de aço com pneus, forro dos arcos e interior simples** (bancos, painel e volante).
