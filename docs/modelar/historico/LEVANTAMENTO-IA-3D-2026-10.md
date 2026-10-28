# Levantamento: IAs que geram 3D e o lugar do Mecanifica (2026-10-05)

Levantamento de leitura feito em duas rodadas: a primeira reuniu as fontes e a
segunda abriu cada uma para conferir. Só entra aqui o que a conferência
sustentou. Não governa trabalho novo.

## Confirmado nas fontes originais

| Fonte | O que traz |
|---|---|
| [AssemCAD, arXiv:2607.05123](https://arxiv.org/abs/2607.05123) (06/07/2026) | Benchmark AssemBench com 120 montagens. LLMs gerais escrevem código que compila, mas quase não montam: taxa de montagem preservada (APR) de 0,00% a 0,83% em três modelos e 66,67% em outro. O modelo dedicado, com partes tipadas, portas e encaixes explícitos, chega a 87,50%. |
| [SNAP3D, arXiv:2609.13146](https://arxiv.org/abs/2609.13146) (11/09/2026) | Geradores de partes 3D ficaram entre 0% e 2% de estabilidade sob gravidade. O método do artigo chegou a 95%. |
| [CAD-Coder, arXiv:2505.14646](https://arxiv.org/abs/2505.14646) (20/05/2025) | Gera código CadQuery: 100% de sintaxe válida e IoU 0,675, contra 0,445 a 0,524 de modelos gerais. Só peças isoladas. |

## Corrigido em relação à primeira rodada

- O artigo de CADPrompt e CADCodeVerify é
  [arXiv:2410.05340](https://arxiv.org/abs/2410.05340), não 2410.15684.
- O Hunyuan3D 2.0 é [arXiv:2501.12202](https://arxiv.org/abs/2501.12202), não
  2501.12211.
- O CAD-Recode ([arXiv:2412.14042](https://arxiv.org/abs/2412.14042)) relata
  taxa de código inválido abaixo de 1%, não 7,9% e 21,0%.
- Preços oficiais consultados em 2026-10-05: Tripo grátis com 300 créditos por
  mês, Meshy grátis com 100, Rodin grátis cobrando por download. Mudam com o
  tempo.

## Sem base

Não se achou avaliação de terceiros que meça furos ovalados, roscas ou cotas
ignoradas em Tripo, Meshy ou Luma. É plausível, mas não está comprovado.

## O que isso diz sobre o Mecanifica

- Respaldo: montagem exige partes com portas e relações explícitas, e os
  modelos gerais falham nisso. É a tese do Mecanifica.
- Ressalva: já há pesquisa no mesmo caminho para montagens pequenas (3,4 corpos
  em média no AssemBench). Não há prova de que o Mecanifica a execute melhor; só
  um teste nosso mediria isso.
- A abordagem dominante de texto para CAD usa um kernel maduro (CadQuery sobre
  OpenCASCADE); o Mecanifica tem núcleo geométrico próprio. Vale avaliar.
