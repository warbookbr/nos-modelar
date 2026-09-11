# Dossiê — motor nativo de superfícies semânticas

## Papel

Este dossiê define o teto e as perguntas da capacidade de superfície prevista
no [plano mestre](../planos/encerrados/2026-08-23-arquitetura-hibrida-familias-modelagem-ia.md).
Ele orienta N2–N5; a representação final só é promovida depois das provas.

## Problema a resolver

`loft`, volumes inflados e caixas são úteis, mas não controlam simultaneamente
silhueta, seção, caráter, aberturas e transições de uma carroceria ou cobertura
humanoide. Uma cage única também não é solução universal por decreto. A IA
precisa manipular regiões e intenções, obter feedback local e recompilar uma
superfície contínua sem editar milhares de vértices sem significado.

## Unidade autoral proposta

`mecanifica.superficie-semantica@1` deve representar um grafo editável com:

- eixos, unidade, simetria e envelope;
- landmarks e curvas de silhueta/seção/característica;
- regiões e fronteiras nomeadas;
- controles, alças e vizinhanças semânticas;
- continuidade desejada por fronteira: separada, G0, G1 ou G2;
- vincos, raios-alvo e zonas rígidas/flexíveis;
- loops internos para aberturas e painéis;
- interfaces com outras superfícies e peças;
- níveis de avaliação e malha neutra compilada;
- proveniência de faces e vértices derivados até a fonte.

Curva, patch, cage quad e seção são mecanismos internos possíveis. Nenhum é
obrigado a resolver sozinho todas as formas.

## Operações mínimas para a IA

- criar e mover landmark, curva, região e controle;
- impor ou remover simetria local;
- ajustar largura, altura, seção, tensão e volume por região;
- declarar continuidade ou vinco numa fronteira;
- inserir/remover loop ou controle preservando IDs existentes quando possível;
- abrir loop interno e derivar borda semântica;
- conformar uma placa a uma base com distância declarada;
- engrossar cobertura quando o artefato exigir casca;
- consultar influência antes de aplicar uma alteração;
- compilar em resolução de trabalho ou revisão;
- comparar duas revisões por região e por vista.

Operações de escultura livre, pintura, UV e textura não entram antes de um gate
demonstrar que são essenciais à forma.

## Compilação

1. validar schema, referências, loops e orientação;
2. resolver parâmetros e simetria sem destruir quiralidade declarada;
3. construir o grafo topológico e detectar regiões degeneradas;
4. avaliar curvas, patches ou subdivisão na resolução solicitada;
5. reconciliar fronteiras conforme continuidade contratada;
6. gerar malha neutra, normais e procedência;
7. medir envelope, curvatura, espessura e qualidade de elementos;
8. emitir diagnósticos e mapa de influência fonte→produto;
9. assinar fonte, compilador, parâmetros e produto.

A compilação deve ser pura para a mesma entrada. Resolução muda densidade do
produto, não a identidade da fonte.

## Qualidade geométrica

Validadores determinísticos devem cobrir:

- malha fechada quando o contrato pedir sólido;
- não-manifold, faces invertidas, degeneração e auto-interseção;
- aspecto, área e distribuição de elementos;
- normais e descontinuidade inesperada;
- erro de aproximação por região entre níveis de avaliação;
- continuidade G0/G1/G2 e raio mínimo declarado;
- ondulação, inversões e concentração de curvatura;
- simetria global e exceções quirais;
- espessura, distância à base e penetração de placas;
- preservação de landmarks, loops, regiões e procedência.

Esses testes detectam defeitos técnicos. Não decidem se a forma parece carro,
capacete ou tórax.

## Controle visual por alvo

Cada superfície de qualidade possui um pacote de alvo com vistas, landmarks,
silhuetas, regiões de caráter, incertezas e condições de rejeição. O comparador
projeta modelo e alvo na mesma câmera e unidade, mede por região e produz
sobreposição. Média global nunca esconde um máximo regional ou uma rejeição.

O crítico visual recebe alvo, modelo e sobreposição, sem narrativa de autoria.
O usuário fecha reconhecimento e caráter nos marcos do plano.

## Prova veicular

A prova mínima usa carro inteiro bruto, não um quarto isolado. Deve controlar:

- rodas e postura; capô, cabine, cintura e traseira;
- largura por estação e altura por região;
- ombros e para-lamas distintos do volume central;
- vidro e arco como loops internos coerentes;
- transições de capô/para-brisa/teto e cabine/traseira;
- edição local que não deforme região distante sem impacto declarado.

Passar medidas sem leitura cega de carro reprova a representação.

## Prova humanoide

A prova mínima usa corpo-base completo e uma cobertura pequena. Deve controlar:

- caixa torácica, cintura escapular, cintura, pelve e volumes dos membros;
- planos frontal/lateral do capacete, mandíbula e transição de pescoço;
- placa conformada, afastamento e bordas conectadas à base;
- continuidade visual entre tronco e membro sem fundir peças articuláveis;
- simetria com quiralidade explícita;
- ausência de faceteamento incompatível com o alvo.

## Estratégia de escolha interna

N3 compara, numa mesma tarefa e orçamento, pelo menos duas composições internas
plausíveis — por exemplo patches paramétricos e cage quad/subdivisão — ou
justifica por evidência por que uma é inviável antes da prova. Critérios:
controlabilidade semântica, qualidade, edição local, aberturas, estabilidade,
custo e simplicidade do compilador.

Pode haver composição: curvas definem fronteiras, patches resolvem regiões e
subdivisão avalia partes específicas. A decisão é por evidência, não por
preferência histórica.

## Níveis de resultado

- **blocagem:** baixa densidade, proporção e reconhecimento;
- **estrutura:** regiões, aberturas e interfaces estáveis;
- **superfície:** continuidade, vincos e transições aprovados;
- **produção interna:** malha derivada validada e revisável;
- **detalhe:** somente após os níveis anteriores.

Falha em um nível retorna ao mesmo nível; detalhe não compensa blocagem.

## Limite do subsistema

O motor não é editor humano geral, renderizador, CAD de fabricação ou pacote de
animação. Ele implementa as capacidades necessárias à autoria autônoma dos
objetos-alvo. Nova capacidade entra por caso, prova e contrato, podendo alcançar
sofisticação alta sem importar a superfície inteira de outro software.

