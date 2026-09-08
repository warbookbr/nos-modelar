# Gotchas de autoria visual

**Estado:** regra operacional obrigatória para qualquer família cuja qualidade
seja julgada visualmente (veículos, robôs humanoides e peças mecânicas). Este
documento existe porque uma geometria estruturalmente válida pode ser, ainda
assim, uma forma visualmente absurda.

## Regra zero: o absurdo visual veta o avanço

Se uma imagem individual não é reconhecível como o objeto pretendido, a rodada
está **reprovada**. Não importa que a receita execute, a malha seja fechada, os
hashes coincidam ou uma métrica local esteja verde. Um carro que parece cápsula
com rodas, uma cabeça que parece objeto solto, ou um robô com membros sem
ligação interrompem a execução naquele ponto.

O usuário não é gatilho de revisão. O sistema deve fazer essa checagem antes de
anunciar êxito, solicitar aprovação ou abrir a etapa seguinte.
## O que falhou e não pode se repetir

| Gotcha | Por que engana | Bloqueio obrigatório |
| --- | --- | --- |
| Malha fechada tratada como objeto bom | Topologia não mede caráter, proporção nem reconhecimento. | Nunca promover por fechamento/manifold. |
| IoU/silhueta global verde | Pode esconder cabine, arcos, frente, traseira e conexões erradas. | Métrica é diagnóstico; não aprova sem veredito visual por vista. |
| Painel/mosaico | Miniaturas escondem desconexões, faces invertidas e proporções ruins. | Abrir referência, render e comparação separadamente em tamanho nativo. |
| Volume genérico parametrizado | Estações ou primitivas suaves tendem a gerar cápsulas, caixas ou bonecos articulados. | Usar gramática da família antes de gerar a primeira forma. |
| Peças feitas isoladamente | Uma peça aceitável pode falhar ao ser montada. | Validar encaixe, oclusão e silhueta do conjunto em cada alteração. |
| Perspectiva bonita compensando ortográfica ruim | Uma câmera pode esconder erros fundamentais. | As vistas ortográficas críticas têm veto independente; perspectiva é auxiliar. |
| Mudança por métrica sem reabertura visual | Um número melhora enquanto a forma piora. | Toda alteração que muda geometria regenera e reinspeciona todas as vistas afetadas. |
| Métrica que muda com a densidade da malha | Diedro, segunda diferença e curvatura por vértice medem o PASSO da amostragem, não a forma. A mesma superfície troca de veredito só refinando. | Toda métrica angular normaliza pelo comprimento da aresta, ou o corpus é reamostrado para densidade comum antes de comparar. |
| Detector que devolve `passa` fora do seu escopo | Aprovação por vacuidade: o gate fica verde porque não tinha o que medir. | Fora de escopo devolve `naoAvaliavel` com motivo. Nunca `passa`. |
| Crítico recebendo só o render | Sem o alvo ao lado, a única pergunta possível é "isso parece um carro?", e a resposta não aponta contra o quê. | Crítico recebe alvo, modelo e sobreposição, nos três caminhos. |
| Alvo inventado pela IA usado como referência | Um número que a IA escolheu vira "medida" na rodada seguinte e ninguém confere. | Alvo sem procedência medida é `não vinculante` no próprio documento. |
| Método diagnóstico aplicado a problema generativo | Sempre acha um defeito, então dá sensação de progresso enquanto a forma não anda. | Sintoma de parada: os achados encolhem e a nota não sobe. Ver `METODO-DIAGNOSTICO-E-SEU-LIMITE.md`. |
| Relação semântica confundida com apoio físico | `pai:` organiza a árvore sem prender nada: nome certo, peça flutuando. Vale para painel no chassi, braço no ombro, cabeçote na coluna. | Apoio, encaixe, folga e eixo são declarados por geometria e validados depois da resolução, nunca pela hierarquia. |
| Blockout tratado como modelo final | Caixas e cilindros provam composição e identidade, e por isso parecem prontos. Produz carroceria-caixa, robô-boneco, máquina sem volumes funcionais. | Blockout só avança identificado como blockout, com etapa de refinamento explícita. |
| Coordenadas soltas sem cadeia de apoio | Cada parte recebe posição independente; nada denuncia que o conjunto não se sustenta. | Declarar cadeia verificável do plano de apoio até a peça, e medir contra ela. |
| Resolução escolhida sem olhar a silhueta | Receita válida e curva facetada: 16 lados passam no teste e aparecem na vista. | Lados escolhidos por raio, curvatura e peso na silhueta; toda curva protagonista inspecionada em ortográfica e em aproximação. |
| Detalhe antes do envelope funcional | Detalhe dá sensação de avanço enquanto a proporção ainda está errada, e depois trava a correção. | Ordem obrigatória: envelope e escala, volumes estruturais, interfaces, só então detalhe. |
| ~~`npm run criar` com receita v3~~ | `criar.mjs` e `visor.html` tentavam `mod.construir` e `mod.meta.tipo` legados, falhando com `Cannot read properties of undefined` em receitas v3 (`export const receita = { PASSOS, ... }`). | **Resolvido**: `criar.mjs` e `visor.html` foram atualizados para desempacotar receitas v3 e carregar a malha via `prototipos/procedural/v3/motor/executor.js`, funcionando de ponta a ponta (núcleo, porteiro e renders de evidência). |
## Pipeline mínimo que vem antes de modelar

1. **Contrato da família.** Declarar os componentes que tornam o objeto
   reconhecível, suas relações e as vistas que revelam cada relação.
2. **Alvo por vista.** Vincular cada referência individual a hash, enquadramento
   e pergunta visual. Não usar uma prancha como evidência.
3. **Crítico visual bloqueante.** Para cada vista, extrair e comparar marcos
   semânticos da referência e do render. O crítico deve emitir `aprovar`,
   `reprovar` ou `indeterminado`; `indeterminado` bloqueia promoção.
4. **Bloco semântico inteiro.** Criar o corpo conectado do objeto, não uma
   coleção de primitivos. Para veículo: carroceria, cabine, quatro rodas dentro
   dos arcos, frente e traseira diferentes. Para humanoide: tronco, pescoço,
   membros e juntas com continuidade espacial. Para peça: volume funcional,
   interfaces e vazios requeridos.
5. **Evidência pareada.** Gerar para cada vista: referência, render, diferença
   e registro textual dos achados. Cada arquivo é aberto individualmente.
6. **Veto e correção localizada.** Um reprovado identifica o marco e a vista
   que falharam; corrige-se esse contrato, não se aplica “suavização” global.
7. **Aprovação humana somente depois.** O usuário valida direção e intenção
   após o crítico automático não encontrar veto. A aprovação não substitui o
   histórico de evidências.
## Crítico visual: responsabilidades e limites

O crítico não tenta decidir se a arte está bonita. Ele bloqueia defeitos
observáveis e incontestáveis antes que contaminem as etapas seguintes.

| Família | Marcos mínimos bloqueantes |
| --- | --- |
| Veículo/carro | quatro rodas associadas aos arcos; cabine integrada; silhueta baixa e larga; frente e traseira distinguíveis; planta não retangular; sem partes flutuantes. |
| Robô humanoide | cabeça ligada ao pescoço/tronco; tórax com volume; ombro–braço–antebraço–mão e quadril–perna–pé em cadeia contínua; simetria declarada quando esperada; sem membros isolados. |
| Peça mecânica | volume principal; interfaces de montagem; vazios/furos funcionais; espessura mínima; eixos e simetrias declarados; sem interseção ou folga não intencional. |

Um avaliador não pode aprovar por “parece razoável” se faltar um marco. Ele
precisa anexar a evidência da vista, os marcos encontrados/ausentes e a razão
do veredito. Métricas de distância, IoU, diedro ou continuidade complementam o
diagnóstico, mas não recebem permissão de promoção.
## Política de parada e rastreabilidade

- Toda rodada começa `em-avaliação`; não existe sucesso implícito por gerar
  arquivos.
- Qualquer veto visual muda a rodada para `reprovada` e bloqueia as etapas
  dependentes.
- A tentativa reprovada permanece rastreável, mas não é reutilizada como base
  geométrica sem uma decisão explícita que identifique o defeito corrigido.
- Um novo gerador ou uma nova família começa com um caso canário pequeno, mas
  completo, e precisa passar os marcos mínimos em vistas individuais antes de
  receber mais detalhe.
- “Sem evidência” e “não foi possível avaliar” significam `indeterminado`, não
  aprovação condicional.
## Registro consolidado de problemas já encontrados

As trinta e oito falhas medidas (V-01 a V-38) moram em
[`../historico/REGISTRO-FALHAS-AUTORIA-V.md`](../historico/REGISTRO-FALHAS-AUTORIA-V.md).
Elas saíram daqui porque eram 15,6 dos 35,8 KB deste documento, que é leitura
obrigatória antes de gerar forma, e a maior parte delas é a arqueologia do
programa de carroceria N6, hoje congelado.

**Vá lá antes de abrir experimento de forma.** Redescobrir por conta própria algo
que aquela tabela já mediu é a falha V-31, e ela custou uma rodada inteira: o
canário N6 chegou a "silhueta não carrega topologia automotiva" construindo um
casco por interseção, quando `prova-secoes-por-medida` já tinha medido isso.

Para modelar uma peça, uma arma ou uma máquina, o que vale está abaixo: a regra
zero, o pipeline mínimo, os limites do crítico e as lições de motor — `loft`
contra `inflate`, furar chapa, as armadilhas de `loft` e a proporção que só a
imagem corrige.
## Checklist antes de aceitar uma receita

Veio do registro de modelagem procedural, escrito a partir de máquinas e
equipamentos. Vale para qualquer objeto: o que reprovou uma prensa reprova uma
carroceria pelo mesmo motivo.

- A origem, os eixos, a escala e o plano de apoio estão explícitos?
- Toda parte estrutural tem apoio, interface ou relação de montagem verificável?
- A hierarquia semântica está separada das transformações físicas?
- O envelope funcional existe antes dos detalhes decorativos?
- A resolução das curvas foi escolhida pela silhueta e pela distância de inspeção?
- A receita usa a operação adequada para a forma, em vez de acumular cubos?
- As vistas críticas mostram continuidade, folga, alinhamento e reconhecimento?
- Os testes verdes cobrem exatamente o que afirmam cobrir?
- O material neutro continua convincente sem depender das cores?
- Cada reprovação aponta uma correção localizada e uma nova evidência?
## O que entregar junto com a forma

Uma autoria concluída entrega, além da receita executável:

1. envelope, escala, eixos e plano de apoio;
2. mapa de partes e relações físicas, separado da hierarquia semântica;
3. intenção ou prior de família para cada volume importante;
4. orçamento de resolução para curvas visíveis;
5. vistas críticas e perguntas de inspeção;
6. resultados estruturais e geométricos, incluindo o que **não** foi avaliado;
7. lista de pendências visuais, sem promover um blockout como final.
## Armadilhas por operação: elas moram na operação

As armadilhas de `loft`, `inflate`, `cilindro`, `arranja` e `furo` deixaram de
viver aqui e passaram a ser os `limites` de cada operação, em
`prototipos/procedural/v3/motor/uso-operacoes.js`. Quem consulta
`descrever_capacidade('loft')` recebe as dela junto com o schema, no momento em
que escolhe a operação — antes vinham num documento lido no começo da sessão, ou
não lido.

O caso completo de cada uma, com a peça que a originou e os números medidos,
está em
[`GOTCHAS-POR-OPERACAO.md`](../referencias/GOTCHAS-POR-OPERACAO.md). O limite
diz o que evitar; o caso diz por que, e é o que faz a lição grudar.

Uma delas estava arquivada errado e vale registrar: a armadilha das tampas do
`cilindro`, que ficam sem parte quando citadas sem `tampa:'fundo'` ou
`tampa:'topo'`, vivia sob o título "armadilhas de `loft`". Quem foi usar
`cilindro` não tinha como chegar nela.

## Proporção: a medida que só a imagem corrige

Contagem, fechamento e orientação o conferente resolve por linha de comando. O
que ele **não** responde é se a coisa lê como o objeto certo — e essa foi a
correção mais repetida desta rodada.

A cabeça da maça saiu duas vezes como bola facetada antes de ler como maça de
abas. A causa era sempre a mesma: a aba tinha quase a mesma extensão na altura e
no raio, e seis delas a 60° preenchiam o espaço entre si. Só quando a altura
ficou bem abaixo do diâmetro da cabeça o vão entre as abas apareceu.

A regra que sobrou: **quando um detalhe repetido tem que ser LIDO como separado,
a folga entre as instâncias precisa ser visível na silhueta**, e silhueta se
confere olhando, com `--cores --modo=isolar --focar` na parte suspeita.
