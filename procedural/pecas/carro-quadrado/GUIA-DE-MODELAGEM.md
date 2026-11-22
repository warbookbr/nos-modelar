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
- **Fendas de painel e frisos (`fendaCapo`, `frisoLateral`):**
  - Usar `conformarNaChapa` sobre `stChapa` (calculado uma vez só em `parachoques.js`) — executa em fração de segundo, acompanha qualquer curvatura 3D e evita booleanas pesadas.

---

## 5. Estado das rodadas e próximos blocos

### Concluído neste ramo (`envio/carro-quadrado-forma`)
- **Fatia A (`26423358`):** casco 100% quad sem estrela na coluna D, vinco horizontal lateral contínuo, Curvas 1/3/4, colunas A/B/D corrigidas.
- **Fatia B (`d6226993`):** lanternas traseiras envolventes 3D com lentes prismáticas translúcidas, sulco em V contínuo, refletor interno e ré embutida no vermelho.
- **Fatia C (`9311007d`, `a6e0ef2e`):** conjunto óptico dianteiro com altura real, farol trapezoidal com parábola 3D + máscara prata + lente transparente, pisca embutido curvo em "D" e grade trapezoidal de 7 lâminas.
- **Bloco 1 (`f3dd95ec`):** nariz mais fino sem ombros "balão", colunas A mais verticais com teto mais largo e para-brisa arredondado, fenda do capô (`fendaCapo`) e churrasqueira de ventilação (`churrasqueira`).

### Próximos blocos planejados
- **Bloco 2:** recesso horizontal superior/inferior do conjunto óptico, borda interna dos faróis mais suave/curvada, estrias verticais limpas sem efeito "alvo", piscas com estrias horizontais e grade de 7 lâminas mais profunda.
- **Bloco 3:** para-choque dianteiro mais esbelto e afunilado (`y = 258..496`), friso claro fino (`7 mm`), faróis de neblina trapezoidais estriados integrados à grade inferior e placa reposicionada com cantos arredondados.
- **Bloco 4:** para-choque traseiro esbelto com balanço traseiro ascendente, rebaixo trapezoidal mais profundo da placa traseira, fechadura detalhada, escapamento inclinado, maçaneta da porta e auditoria final (`guarda:acervo`, `guarda:referencial`, tempo de importação).
