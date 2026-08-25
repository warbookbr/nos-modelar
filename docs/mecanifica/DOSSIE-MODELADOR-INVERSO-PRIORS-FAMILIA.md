# Dossiê — modelador inverso com priors por família

## Decisão

O caminho vigente é um **modelador inverso baseado em priors por família**. A
IA não inventa coordenadas, não recebe autoridade automática para aprovar e não
procura uma boa forma dentro de caixas desenhadas sem prova. O sistema começa
de estruturas 3D plausíveis e semanticamente alinhadas da família, ajusta forma
e câmera contra evidência calibrada e só depois expõe edição por intenção.

O produto continua nativo ao repositório. Algoritmos publicados e ativos com
licença compatível podem ser estudados ou ingeridos como fonte com procedência;
nenhum software de modelagem externo vira dependência de execução. O formato
canônico, o compilador, o ajuste, a validação e o MCP pertencem à Mecanifica.

## O que é evidência hoje

- O núcleo procedural possui 32 operações, receitas determinísticas,
  identidade semântica, montagem, revisão, impacto, câmeras, bancada e MCP.
- Não existe implementação nativa de prior deformável por família, grafo de
  superfície semântica, compilador com continuidade explícita, ajuste inverso,
  modelo de preferência ou arquivo de diversidade.
- Seis rotas automotivas produziram formas não reconhecíveis. Aumentar
  polígonos, suavizar, intersectar silhuetas ou reduzir parâmetros não resolveu.
- Três vistas ortográficas não determinam a superfície: a prova V-28 deixou
  82% das estações ocultas e encontrou formas diferentes com as mesmas vistas.
- O alvo N6 veio de ImageGen. Seus recortes têm hashes e perguntas visuais,
  mas não câmeras calibradas, escala 3D, profundidade ou correspondências. Ele é
  **direção estética**, não alvo geométrico exato.
- A suíte completa medida em 2026-08-25 tinha 1.264/1.277 testes passando,
  11 falhas e 2 ignorados. Nove falhas vêm do confinamento `repo://` que compara
  caminho Windows com prefixo `/`; a guarda de `prototipos/fps/v3` e uma prova
  agregada de importação MCP completam a linha de base aberta. Gates estruturais
  separados passaram, mas saúde total não pode ser declarada.
- O antigo plano dizia que a IA era boa ao comparar e, ao mesmo tempo, reservava
  S1 para o teste nunca executado dessa premissa. Isso era hipótese, não medida.

## Por que seleção pura não governa mais

Ordenar candidatos só encontra o que o gerador alcança. Caixas de controle,
linhas fixas e uma única topologia feitas à mão continuam codificando o carro
antes da busca. Um ranqueador não cria capô, cabine, arco ou flanco ausente do
espaço de geração. Treinar um julgador com preferências de uma IA não calibrada
apenas automatizaria o viés. Preferência e diversidade permanecem úteis, mas
somente depois de provar o prior, o alvo e o avaliador.

Compartilhar uma curva também não resolve qualidade de superfície: isso garante
posição comum (`G0`). Tangência e curvatura (`G1/G2`) exigem derivadas
transversais compatíveis, ribbons de fronteira e/ou fairing global.

## Arquitetura

```text
intenção + evidência qualificada
              |
              v
       prior específico da família
              |
              v
 seleção de arquétipo + ajuste inverso de câmera e forma
              |
              v
 grafo de superfície semântica -> compilador/fairing nativo
              |
              v
 receita determinística + identidade + montagem + revisão
              |
              v
 evidência individual por vista + crítico calibrado + veto
```

### Núcleo compartilhado

O núcleo compartilhado guarda o que realmente atravessa famílias: parâmetros
com identidade, receitas determinísticas, grafo de dependência, montagem,
revisão/impacto, câmeras, hashes, procedência, incerteza, estados de gate e
portas MCP. Ele não conhece carro, anatomia ou função de peça.

### Priors separados por família

| Família | Representação inicial | Invariantes próprios |
| --- | --- | --- |
| veículos | vários arquétipos de topologia semântica alinhada + base regional deformável | rodas/arcos, cabine integrada, frente/traseira, aberturas, postura |
| robôs humanoides | esqueleto + volumes corporais/artificiais + juntas + casca de armadura | cadeias conectadas, limites articulares, tórax, apoio e simetria declarada |
| peças mecânicas | árvore de features + gramática de interfaces e vazios funcionais | eixos, contatos, furos, espessura, tolerância e fabricabilidade declarada |

Famílias não dividem um “gerador universal”. Elas reutilizam serviços do núcleo
e têm corpus, prior, perdas e gates próprios. Peças mecânicas devem aproveitar
primeiro o motor procedural já existente; veículos e humanoides exigem camadas
novas de representação.

### Qualificação do alvo

Todo alvo recebe uma destas classes antes de modelar:

- `direcao-estetica`: conceito, prancha gerada ou vistas sem calibração; orienta
  caráter e rejeições, mas não promete correspondência 3D exata;
- `alvo-geometrico`: vistas do mesmo objeto com câmeras, escala,
  correspondências e procedência suficientes para ajuste reproduzível;
- `indeterminado`: faltam dados ou há inconsistência entre vistas; bloqueia
  fitting exato e promoção.

ImageGen pode produzir intenção visual. Não transforma sozinho imagens em
levantamento geométrico. Para um canário exato, o próprio repositório deve gerar
vistas calibradas de uma forma 3D licenciada ou sintética conhecida.

### Prior automotivo

O primeiro prior usa mais de um arquétipo de cupê, com landmarks e regiões
semânticas correspondentes. A base deformável separa movimentos globais
(proporção/postura) de movimentos regionais (nariz, cabine, ombro, flanco,
arcos e traseira). Um arquétipo de holdout testa se a representação generaliza;
reconstruir apenas os exemplos usados para formar a base não basta.

Ativos entram por manifesto de licença, origem, hash, transformação e cobertura.
O runtime consome uma representação canônica interna, nunca uma aplicação
externa. Se não houver corpus legal e geometricamente compatível, a fase para:
não se substitui dado ausente por coordenadas inventadas.

### Grafo e compilador de superfície

O artefato autoral é `superficie-semantica`: regiões, fronteiras, landmarks,
continuidade requerida e procedência. A implementação pode combinar patches,
SubD, curvas, FFD ou deformação preservadora de detalhes, mas isso é detalhe do
compilador. A identidade está nas entidades semânticas, não nos vértices da
malha compilada.

O compilador precisa provar `G0`, `G1` e, onde requerido, `G2` num corpus
sintético normalizado por comprimento físico. Métrica dependente da densidade
da malha é inválida. Fronteira comum sem derivada transversal não recebe crédito
de continuidade.

### Ajuste inverso

O ajuste escolhe primeiro entre arquétipos discretos e depois otimiza variáveis
contínuas. Câmera e forma são ajustadas conjuntamente contra landmarks,
silhueta, correspondências e regularizadores do prior. Perdas determinísticas e
interpretáveis vêm antes de qualquer julgamento subjetivo.

O resultado precisa vencer baselines simples: alinhamento rígido do arquétipo,
vizinho mais próximo e busca aleatória com o mesmo orçamento. Se não vencer em
holdout, o plano para no estágio correspondente; não abre detalhe nem MCP de
edição.

### Avaliador e papel da IA

A IA pode extrair intenção e landmarks com confiança, escolher entre hipóteses,
explicar regiões divergentes e comparar candidatos. Ela não escreve coordenadas
brutas, não aprova o próprio trabalho e não converte ausência de achado em
sucesso.

Antes de usar preferência, o avaliador passa por corpus conhecido com pares
repetidos, ordem embaralhada, empates, casos indeterminados e controles de
defeito grosseiro. O crítico de promoção recebe contexto frio e vê, para cada
vista, arquivos individuais grandes de referência, render e diferença na mesma
câmera. Mosaico é índice, nunca evidência.

A memória persistente é o repositório: decisões, exemplos, pesos, hashes,
versões e contraexemplos. Memória conversacional do modelo não é estado do
sistema.

### Preferência e diversidade, depois

Otimização preferencial ativa pode reduzir avaliações subjetivas; um arquivo de
Quality Diversity pode impedir colapso para um único estilo. Ambos só abrem se:

1. o prior representar um holdout reconhecível;
2. o fitting vencer os baselines;
3. o avaliador mostrar repetibilidade fora da amostra;
4. nenhum controle grosseiramente defeituoso for promovido.

## Rastreabilidade e parada

Cada fase produz manifesto de entrada, versões de algoritmo e dados, seed,
configuração, métricas, imagens individuais, veredito e hash. Plataforma e
artefato são julgados separadamente. Os gates são cumulativos: uma fase não
apaga reprovação anterior.

Parada obrigatória ocorre se o alvo for geometricamente indeterminado, a licença
ou a origem do prior não estiver clara, o holdout ficar fora do espaço
alcançável, o avaliador não for repetível, o ajuste não superar baselines ou o
objeto inteiro falhar em reconhecimento cego. “Mais rodadas” não é correção.

## Base técnica consultada

- [ApolloCar3D — CADs e landmarks automotivos](https://openaccess.thecvf.com/content_CVPR_2019/html/Song_ApolloCar3D_A_Large_3D_Car_Instance_Understanding_Benchmark_for_Autonomous_CVPR_2019_paper.html)
- [Category-Specific Mesh Reconstruction — forma média e deformação por instância](https://openaccess.thecvf.com/content_ECCV_2018/html/Angjoo_Kanazawa_Learning_Category-Specific_Mesh_ECCV_2018_paper.html)
- [SMPL — template humano, forma, pose e juntas](https://is.mpg.de/publications/smpl-2015)
- [Soft Rasterizer — renderização diferenciável](https://openaccess.thecvf.com/content_ICCV_2019/html/Liu_Soft_Rasterizer_A_Differentiable_Renderer_for_Image-Based_3D_Reasoning_ICCV_2019_paper.html)
- [Differentiable Stereopsis — forma e câmera multivista](https://openaccess.thecvf.com/content/CVPR2022/html/Goel_Differentiable_Stereopsis_Meshes_From_Multiple_Views_Using_Differentiable_Rendering_CVPR_2022_paper.html)
- [Malleable Curve Networks — curvas restritas/livres e fairing](https://vdel.me.cmu.edu/vdelresource/publications/2012cgv36/paper.pdf)
- [Ribbon-based transfinite surfaces — derivadas de fronteira e continuidade](https://www.sciencedirect.com/science/article/pii/S0167839614000648)
- [Preferential Bayesian Optimization](https://proceedings.mlr.press/v70/gonzalez17a.html)
- [Quality Diversity](https://arxiv.org/abs/1708.09251)

Essas fontes sustentam mecanismos a testar, não declaram a implementação pronta
nem autorizam copiar código, modelos ou dados sem conferir licença.
