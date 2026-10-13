# Desenho sem referência

**Estado:** rascunho

**Responsável:** um agente em Opus 5.5 conduzido por Claude, com o aceite da pessoa

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo próprio do plano, isolado do ramo do plano anterior até a pessoa decidir

## Problema observado

Todo o caminho de forma da Mecanifica parte de uma imagem que existe: o contorno
da imagem tira as partes de uma referência, a prancha cota esses contornos, e o
esboço e o crítico comparam o modelo com ela. Quando o objeto não tem imagem, a IA
fica sem o que traçar, e o que ela desenha não tem prancha, cota nem alvo que o
crítico possa usar. O plano [o que o avião pede](2026-10-11-o-que-o-aviao-pede.md)
mostrou também o custo de traçar sobre imagem pequena, com a borda em escadinha e
rodadas do crítico gastas nela.

A pessoa propôs em 2026-10-13 um módulo à parte em que a IA desenha um objeto a
partir de uma descrição, sem imagem de referência, com foco em praticidade,
acerto e controle.

## Resultado

A IA desenha a vista de um objeto descrito em texto, com medidas e partes
nomeadas, num formato que a prancha cota e o crítico julga, e o desenho de um
objeto simples é aprovado pela pessoa sem imagem de referência.

## Filtro Agent-First

A pesquisa da fatia 1 decide, para cada peça do caminho atual, se o módulo novo a
usa direto, a envolve ou a adia: as famílias e os perfis, o esboço com medidas, a
prancha dos contornos, o crítico cego e a calibração. Ferramenta, biblioteca, skill
ou plugin de fora só entra versionado no repositório e coberto pelos testes, porque
o conteúdo salvo é determinístico e reexecutável.

## Incluído

- o levantamento do que a Mecanifica já tem e serve ao desenho sem imagem, e do
  que existe pronto fora (bibliotecas de desenho vetorial, de restrição
  geométrica e de traçado, skills e plugins), com a recomendação;
- o desenho do módulo, isolado do núcleo de autoria e independente de Three.js;
- um protótipo mínimo que desenhe um objeto simples a partir de uma descrição, com
  teste e julgado pelo crítico;
- a decisão da pessoa sobre continuar.

## Excluído

- mudar o contorno da imagem, a prancha ou o esboço para este fim antes de a
  fatia 1 apontar o que falta;
- levar o módulo ao produto.

## Gate de saída

1. o levantamento escrito, com a recomendação e o que a pessoa escolheu;
2. o protótipo com teste, determinístico, e a vista de um objeto simples aprovada
   pela pessoa;
3. `npm run gates --completo` verde no ramo do plano.

## Fatias

1. **Levantamento.** O agente em Opus 5.5 lê o que a Mecanifica tem e pesquisa o
   que existe pronto, e propõe o módulo.
2. **Protótipo.** O menor módulo que desenha um objeto simples a partir de uma
   descrição, provado por teste e pelo crítico.
3. **Decisão.** A pessoa decide se o módulo segue, muda ou para.

## Riscos e parada

Se a fatia 1 mostrar que o desenho sem imagem precisa mudar o contrato de família,
de esboço ou de prancha, o plano para e a pessoa decide antes de ampliar.

## Candidatos de sucessão

Os objetos levantados em 2026-10-11 para o mesmo exercício do avião, cada um
forçando uma falta diferente: a bicicleta (corrente, engrenagem e transmissão, com
a roda 2.0), a empilhadeira (mastro telescópico com trilho e corrente e várias
articulações, com o
[alinhamento](../banco-de-provas/empilhadeira-2026-10-09/ALINHAMENTO.md) já
começado), a cadeira de escritório (estofado e espuma, base em estrela, pistão a
gás e rodízio) e um objeto de esteira, como robô de esteira ou escavadeira (o elo
articulado). E os que o plano [as ferramentas de
modelagem](encerrados/2026-10-07-as-ferramentas-de-modelagem.md) deixou: o carrinho
de mão como família de objeto, a bacia em casca como primitiva, a dobradiça de
caneco e as ressalvas do fechamento dele. Junto deles, o teste do Potrace no
contorno da imagem, combinado com a pessoa em 2026-10-13.

## Fechamento

Preencher ao concluir ou cancelar.
