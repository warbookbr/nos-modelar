# Alvo N6 — cupê esportivo aprovado

**Estado:** direção visual aprovada pelo usuário em 2026-08-24. Este pacote
abre somente a preparação visual de N6; não aprova geometria, superfície ou
reconhecimento do veículo.

## Fonte e identidade

A origem é uma prancha de conceito de cupê esportivo fictício, gerada sem marca
ou modelo existente e aprovada explicitamente pelo usuário. Ela está versionada
em `autoria-assistida/alvos/n6-cupe-esportivo/prancha-origem.png`; o
[`manifesto.json`](../../autoria-assistida/alvos/n6-cupe-esportivo/manifesto.json)
guarda o hash da origem, a decisão e os hashes dos cinco recortes.

O alvo fixa direção visual e relações de forma, não medidas absolutas em
milímetros. As cotas/landmarks necessários à geometria deverão ser derivados e
declarados numa fatia posterior, nunca inventados para acomodar uma malha.

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

N6.1 começa por uma blocagem inteira e sem detalhe contra estas quatro vistas
ortográficas. Cada rodada gera sobreposição por vista e passa por crítica cega
de legibilidade. Nenhuma tentativa de superfície livre ou receita final ocorre
antes de a blocagem ser reconhecível e aprovada pelo usuário.
