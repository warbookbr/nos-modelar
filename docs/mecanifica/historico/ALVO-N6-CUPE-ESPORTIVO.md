# Alvo N6 — cupê esportivo aprovado

**Estado:** direção visual aprovada pelo usuário em 2026-08-24. Este pacote
abre somente a preparação visual de N6; não aprova geometria, superfície ou
reconhecimento do veículo.

## Fonte e identidade

A origem é uma prancha de conceito de cupê esportivo fictício, gerada sem marca
ou modelo existente e aprovada explicitamente pelo usuário. Ela está versionada
em `autoria-assistida/alvos/n6-cupe-esportivo/prancha-origem.png`; o
[`manifesto.json`](../../../autoria-assistida/alvos/n6-cupe-esportivo/manifesto.json)
guarda o hash da origem, a decisão e os hashes dos cinco recortes.

O alvo fixa direção visual e relações de forma, não medidas absolutas em
milímetros. As cotas/landmarks necessários à geometria deverão ser derivados e
declarados numa fatia posterior, nunca inventados para acomodar uma malha.

## Qualificação P0

O manifesto agora declara `mecanifica.qualificacao-alvo@1` como
**`direcao-estetica`**. Isso permite usar o N6 para intenção, caráter e
rejeições visuais, mas bloqueia fitting geométrico quantitativo: a prancha não
fornece câmeras calibradas, escala 3D, profundidade ou correspondências de um
objeto único. Um canário sintético calibrado de P0 prova o fitting sem fingir
que esta imagem é levantamento técnico.

## Regra operacional obrigatória

**Cada render é comparado exclusivamente com a referência individual de mesmo
enquadramento, aberta em tamanho nativo.** A prancha inteira serve apenas para
conferir se as cinco vistas vêm do mesmo conceito; não pode ser usada como
evidência visual nem como entrada de um aceite.

| Vista da peça | Referência | Pergunta de comparação |
|---|---|---|
| frontal | `vistas/frontal.png` | largura, faróis, entradas, para-brisa e arcos batem? |
| lateral direita | `vistas/lateral-direita.png` | postura, cabine, balanços e tomada lateral batem? |
| traseira | `vistas/traseira.png` | ombros, lanternas, difusor e saídas batem? |
| superior | `vistas/superior.png` | planta, cabine, ombros e deck traseiro batem? |
| perspectiva frontal direita | `vistas/perspectiva-frontal-direita.png` | as decisões das quatro ortográficas continuam integradas? |

A perspectiva é auxiliar: ela não compensa falha em nenhuma vista ortográfica.
O revisor registra achado por vista, com hash da referência e hash do render
comparado. Mosaico, miniatura ou memória do autor não são evidência.

## Briefing de forma e rejeições

O alvo pede cupê de motor central, baixo e largo: nariz curto, cabine baixa,
para-lamas dianteiros marcados, tomada lateral atrás da porta, ombros traseiros
largos, deck traseiro ventilado e identidade frontal/traseira distinta.

Reprovar antes de detalhar se houver: partes flutuantes; quatro rodas fora dos
arcos; cabine separada do corpo; planta retangular; frente/traseira
intercambiáveis; ou uma vista aceita por miniatura, sem pareamento individual.

## Próximo gate

N6.1 reabre por **testes regionais sobre uma mesma carroceria contínua**, depois
que a primeira casca por estações foi reprovada. A referência completa continua
sendo a fonte; dela se derivam recortes de dianteira/capô e para-lamas,
cabine/cintura, lateral/entrada e ombros/deck traseiro. Cada recorte preserva
vista, câmera, escala, retângulo de origem e hash da imagem completa.

O recorte não vira uma peça independente: ele delimita a região topológica que
pode ser corrigida na carroceria única. Cada alteração produz (1) referência,
render e sobreposição individuais para a região e (2) as quatro vistas completas
regeneradas para regressão. Reprovar ou `indeterminado` em qualquer região ou
vista completa bloqueia a rodada. Nenhuma superfície livre, receita final ou
montagem de partes ocorre antes de a blocagem integrada ser reconhecível e
aprovada pelo usuário.

O pacote inicial vive em `regioes/`: oito recortes derivados de quatro regiões
e vinculados por `regioes/manifesto-regioes.json` à vista completa de origem,
ao retângulo de recorte e aos hashes dos dois arquivos. O gerador
`tools/mecanifica/recortar-regioes-n6.mjs` é determinístico: regenerar as
referências não permite trocar carro, enquadramento ou escala silenciosamente.
As três faixas de sobreposição declaradas no manifesto são gates próprios:
dianteira↔cabine, cabine↔entrada lateral e entrada↔ombros/deck precisam
continuar coerentes antes de uma região poder ser dada como corrigida.
