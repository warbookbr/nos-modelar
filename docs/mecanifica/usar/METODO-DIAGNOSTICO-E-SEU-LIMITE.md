# Método diagnóstico, e onde ele para

Este documento fixa o método de investigação da Mecanifica **e a fronteira dele**.
Ele existe porque o método funcionou perfeitamente e, ainda assim, doze rodadas
de carroceria terminaram reprovadas — e entender por quê vale mais que o método.

## O método

> problema → observar → decompor → identificar o que se sabe → **identificar o
> que falta** → **levantar hipóteses** → testar → medir → eliminar hipóteses →
> corrigir → validar

Ele produziu, só na investigação do chassi: o zigue-zague de período 2 causado
por nitidez fracionária de vinco; normais invertidas em cinco regiões; o capô em
calha; o nariz aberto de 600 × 370 mm; o flanco sem volume; quatro detectores
que mediam a coisa errada; a ferramenta de captura entregando imagem comprimida;
os 82% de estações sem informação de seção nas três vistas ortográficas; e o
erro de 321 mm entre o nariz inventado e o nariz medido.

Todos achados reais, todos por eliminação. O método é excelente.

## Onde ele para

Ele serve para **eliminar o errado**. Não serve para **escolher entre muitos
não-errados**.

Ele pressupõe três coisas:

1. existe um defeito;
2. as hipóteses são enumeráveis;
3. a medida discrimina entre elas.

Para *"por que esta crista está serrilhando?"* as três valem. Para *"como deve
ser este para-lama?"* nenhuma vale: não há defeito, o espaço é contínuo e
infinito, e medida não ordena beleza.

| | problema diagnóstico | problema generativo |
|---|---|---|
| pergunta | por que está errado? | como deveria ser? |
| hipóteses | poucas, enumeráveis | contínuas, infinitas |
| medida | discrimina | não ordena |
| método | este | solver, busca e referência |

## O modo de falha, quando se aplica ao problema errado

Doze rodadas de correções **todas certas**, num objeto que nunca estava indo
para lugar nenhum. Cada conserto era legítimo e verificável; o conjunto seguiu
reprovado. O método dá sensação de progresso porque sempre acha alguma coisa.

O sintoma de que isto está acontecendo: **os achados encolhem e a nota não
sobe.** Dez condições de rejeição verdes e crítico cego em 3/10 não é
coincidência — é a assinatura de método diagnóstico rodando sobre um problema
generativo.

Quando esse sintoma aparecer, a saída não é achar o décimo primeiro defeito. É
trocar de método: ver
[`planos/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md`](../planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md).

## Os dois passos que a IA pula, e não pode pular

Os dois estão em negrito no método por medida, não por estilo.

### Identificar o que falta

É o passo que carrega o peso e o que mais some. Ele teria pego dois buracos que
ficaram abertos por rodadas inteiras:

- o desenho de referência do P0 existia desde a primeira rodada e **nunca foi
  aberto**; o crítico visual recebia sempre o render sozinho, então a única
  pergunta que ele podia responder era "isso parece um carro?";
- **não existia mecanismo generativo nenhum** no plano: todas as operações do
  dossiê de superfícies terminavam em "ajustar valor".

Nenhum dos dois é um defeito no artefato. Por isso "observar → corrigir" nunca
ia encontrá-los, e por isso este passo é obrigatório e explícito.

### Levantar hipóteses, no plural, antes de testar

Ir de observação direto a conserto custa rodadas e produz conserto errado com
cara de certo. O serrilhado da crista foi atribuído ao renderizador **duas
vezes**, com duas "correções" na ordem de pintura, antes de alguém rastrear o
loop pela subdivisão — porque a lista de alternativas nunca foi escrita.

Regra: escrever as hipóteses candidatas antes de tocar em código, e dizer qual
medida separa cada uma das outras. Hipótese que nenhuma medida distingue não é
hipótese, é preferência.

## Como usar aqui

- **use** para defeito, regressão, contradição entre medida e imagem, e para a
  meta-pergunta "por que esta abordagem não funciona";
- **use** no gate de calibração do canal de percepção: separar artefato
  reprovado de superfície sã é pergunta diagnóstica pura;
- **não use** para decidir forma, proporção ou caráter. Aí valem referência
  medida, restrição declarada, solver e busca;
- **pare** quando os achados encolherem e a nota não subir.
