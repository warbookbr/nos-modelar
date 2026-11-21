# Conformação sobre a casca e sobreposição ortográfica 3D: peças coladas à curvatura da lataria e desvio 3D medido desde a rodada 1

**Estado:** ativo

**Território:** `procedural/nucleo/conformar-na-chapa.js`, `procedural/nucleo/conformar-na-chapa.test.mjs`, `tools/modelar/modelo-sobrepor.mjs`, `tools/modelar/modelo-sobrepor.test.mjs`, `tools/fixtures/conformacao-e-sobreposicao-3d/`, `docs/modelar/banco-de-provas/conformacao-e-sobreposicao-3d-2026-11-20/`

Ativado pela pessoa em 2026-11-20, em conjunto com o plano ativado de [rebaixo por contorno](2026-11-10-rebaixo-por-contorno.md), a partir dos atritos práticos da modelagem do carro quadrado.

**Responsável:** a IA da sessão implementa, testa e mede; a pessoa julga o resultado na bancada e nas sobreposições.

**Repositório e base:** `warbookbr/nos-modelar`, main `630f3c3c`.

## Problema observado

Ao modelar veículos com lataria subdividida (`furgao-realista`, `sedan-chassi-e-lataria`, `carro-fastback` e `carro-quadrado`), dois gargalos concentram a maior parte das rodadas de retrabalho. O primeiro é o encaixe de peças externas e recuadas sobre a casca curva: para-choques envolventes, frisos laterais, molduras de arco, vidros e lentes de faróis e lanternas exigem coordenadas `[x, y, z]` digitadas à mão e se desalinham (flutuando ou invadindo a chapa) sempre que a lataria muda numa rodada. O segundo é a conferência visual do 3D contra a referência: hoje `prancha:sobrepor` cobre apenas a prancha 2D, e desvios grandes da malha 3D (como teto estreito ou frente arredondada) só aparecem quando a pessoa compara prints da bancada com as fotos.

O processo não pega nenhum dos dois sozinho: não existe ajudante geral no núcleo que amostre a superfície limite da chapa para gerar um perfil ou lâmina conformada com deslocamento em milímetros, nem comando que projete as quatro vistas ortográficas da malha 3D diretamente sobre a prancha e a foto calibrada com medida de desvio.

## Resultado

Com `conformarNaChapa`, uma receita declara um contorno ou trilho numa vista, uma seção ou espessura e um deslocamento em milímetros em relação à pele real da chapa (saliência positiva para para-choques e frisos, recuo negativo para vidros e lentes), e o núcleo gera a geometria já colada na curvatura exata da lataria, acompanhando automaticamente futuras alterações da casca. Com `npm run modelo:sobrepor`, um comando projeta as quatro vistas ortográficas da malha 3D (lateral, frontal, traseira e superior) sobre a prancha e sobre a foto calibrada em alto contraste, montando o quadro 2×2 e imprimindo o desvio em milímetros por trecho.

## Filtro Agent-First

- `conformarNaChapa`: CRIAR em `procedural/nucleo/conformar-na-chapa.js` como ajudante declarativo que ENVOLVE amostragem de superfície (`ponto-na-malha.js` / `normal-da-gaiola.js`) e geradores existentes (`gaiolaVarrida`, `laminaSobreASuperficie`, `subdivisao`). A receita declara a chapa-alvo, vista, trilho ou contorno 2D, deslocamento em mm e espessura/seção; o ajudante devolve os passos já conformados.
- `modelo:sobrepor`: CRIAR em `tools/modelar/modelo-sobrepor.mjs`, ENVOLVENDO o executor de receita + projeção ortográfica da silhueta 3D e reutilizando o mapeador de `tools/modelar/prancha/prancha-sobrepor.mjs` e `referencia-grade.mjs`. Não altera `prancha.mjs` nem o núcleo.
- Rebaixo fechado (placa, concha de maçaneta, tomadas do capô): tratado no plano complementar já ativo [2026-11-10-rebaixo-por-contorno.md](2026-11-10-rebaixo-por-contorno.md), sem duplicar território.

## Incluído

- ajudante `conformarNaChapa` no núcleo para trilho aberto (friso lateral, para-choque envolvente) e região fechada (vidro, lente, moldura), com testes em chapa curva sintética provando aderência à superfície (< 1 mm de fresta ou invasão) mesmo após deformar a chapa;
- comando `npm run modelo:sobrepor` (modos contra prancha e contra foto calibrada, quadro 2×2 e relatório de desvio em mm), com testes em fixture sintética de deslocamento conhecido (< 2 mm de erro);
- prova prática na lataria e nos para-choques/frisos do carro quadrado registrada em `docs/modelar/banco-de-provas/conformacao-e-sobreposicao-3d-2026-11-20/`.

## Excluído

- alteração de `subdivisao.js`, `booleanas.js`, `abertura-por-contorno.js` ou `gaiola-por-rede.js` (territórios de outros planos ativos);
- solver geral de encaixe ou cinemática entre peças móveis;
- versionamento de imagens raster de referência.

## Invariantes

- O núcleo continua sem conhecer veículo nem outro domínio específico (`conformarNaChapa` trabalha sobre qualquer chapa ou malha).
- Nenhuma peça existente do acervo muda de malha sem usar o novo ajudante.
- Todos os gates existentes e `npm run gates` permanecem verdes.

## Gate de saída

1. Em chapa curva sintética, `conformarNaChapa` gera friso/para-choque em trilho aberto e lente/vidro em contorno fechado com folga/invasão abaixo de 1 mm, e mantém a aderência automaticamente quando a curvatura da chapa muda, por teste.
2. `npm run modelo:sobrepor` projeta as quatro vistas ortográficas de uma fixture 3D sobre prancha e imagem calibrada e mede deslocamento conhecido com erro abaixo de 2 mm, por teste.
3. Prova prática no carro quadrado mostrando a sobreposição 3D e ao menos um acessório (para-choque ou friso) conformado diretamente na lataria, com revisão adversarial no ajudante do núcleo e `npm run gates` verde.

## Fatias

1. `modelo:sobrepor` (projeção ortográfica 3D sobre prancha e foto calibrada, quadro 2×2 e medida de desvio), com testes em fixture sintética.
2. `conformarNaChapa` para trilho aberto (para-choque envolvente e friso lateral sobre chapa curva) e contorno fechado (vidro e lente recuada), com testes e revisão adversarial.
3. Prova prática no carro quadrado, nota de uso nas skills/catálogo e fechamento.

## Riscos e parada

Se a amostragem de normal em cantos vivos da chapa subdividida gerar auto-interseção na seção do para-choque, `conformarNaChapa` suaviza a normal ao longo do trilho ou recusa explicitamente o raio menor que a meia seção com o ponto exato, em vez de emitir malha virada.

## Fechamento

A preencher.
