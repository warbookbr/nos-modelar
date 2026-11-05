# Esboço pelo núcleo — as opções de forma saem das mesmas operações da peça e se comparam lado a lado na bancada

**Estado:** ativo

**Território:** `modulos/esboco-nucleo/`, `tools/modelar/esboco-nucleo.mjs`, `tools/modelar/variantes.mjs`, `docs/modelar/banco-de-provas/esboco-pelo-nucleo-2026-11-05/`, `tools/modelar/vistas-para-critica.mjs`, cedida pelo plano do braço

**Responsável:** sessão de trabalho do furgão, a pedido da pessoa em 2026-11-05

**Repositório e base:** este repositório, a partir da main de 2026-11-05

## Problema observado

O esboço de hoje (`modulos/esboco/`, 117 arquivos de código) desenha formas por um motor próprio, separado do núcleo. Em 2026-11-05 isso apareceu no farol do furgão: a pessoa escolheu entre opções desenhadas no esboço, a ponta em bico e o topo numa linha só, e a peça não as entregou, porque o vão segue as linhas da gaiola e a subdivisão arredonda os cantos. A pessoa notou que o esboço promete formas que o núcleo não faz, e disse que ele não tem mais serventia como está. Ao mesmo tempo, as escolhas de forma numa peça real (o farol, a lanterna, o encaixe do ombro) eram feitas com desenhos à parte, e não com a peça.

## Resultado

Uma opção de forma se escreve como hoje, por formas simples posicionadas por relação, mas sai das operações do núcleo e aparece na bancada; numa peça real, a receita declara variantes como trocas de valores na `TABELA`, e a bancada mostra todas lado a lado com a mesma câmera, para a pessoa escolher pelo que a peça consegue ser. O módulo antigo sai, com um documento de histórico do que ele era e do que ensinou.

## Filtro Agent-First

- O esboço 2.0: **ENVOLVER** as operações do núcleo (cubo, cilindro, lathe, loft, extrusao, as gaiolas e o sólido por laços) por um tradutor de formas por relação para `PASSOS`, em vez de outro motor de desenho.
- As variantes de uma receita: **USAR DIRETO** a `TABELA` e a bancada, com um comando que roda a receita com cada troca e junta as capturas numa imagem.
- O posicionamento por relação (`sobre`, `ponta`, `desloca`, `rotacao`) e o gate de contato do esboço: **REFATORAR** para o 2.0 só o que as skills e o pacote do crítico usam, medido na fatia 1.
- O módulo antigo: **ADIAR** a remoção para depois da migração, e então remover inteiro, com o histórico.

A fatia 3 acrescenta ao território, ao começar, os arquivos que migra (as skills, o agente esbocista e o pacote do crítico); a ferramenta de vistas do crítico só entra quando o plano do braço a soltar.

## Incluído

- o inventário do que usa o esboço hoje e de quais recursos dele são usados de fato;
- o tradutor de formas por relação para o núcleo e a imagem das opções lado a lado pela bancada;
- as variantes de receita, provadas numa peça do acervo sem mudar a forma aceita dela;
- a migração das três skills (`esbocar-opcoes`, `esboco-detalhado`, `laco-do-esboco`), do agente `esbocista` e do alvo do pacote do crítico;
- a remoção do módulo antigo e o documento de histórico.

## Excluído

- mudar a forma de peça aceita;
- o furgão, que volta pelo plano dele;
- a navegação de receitas grandes, que é plano à parte.

## Gate de saída

1. As opções do farol de 2026-11-05 refeitas pelo 2.0 mostram o que o núcleo faz: a mesma forma que a peça daria, conferida contra a receita.
2. Uma peça do acervo com três variantes declaradas sai em uma imagem lado a lado, com a mesma câmera, e a peça com o valor aceito dá a mesma malha de antes.
3. As skills, o agente e o pacote do crítico rodam sem o módulo antigo, e o retrato do acervo dá as mesmas peças.
4. A pessoa aprova a imagem das opções por imagem.
5. `npm run gates` verde, sem o módulo antigo no repositório.

## Fatias

1. Inventário: o que usa o esboço, quais recursos e quais tipos de forma, contados nos esboços guardados; a decisão do que o 2.0 precisa ter. Feita em 2026-11-05.
2. O esboço 2.0 e as variantes de receita, com os gates 1 e 2. Feita em 2026-11-05.
3. A migração das skills, do agente e do pacote do crítico.
4. A remoção do módulo antigo, o histórico e o fechamento.

## Riscos e parada

Se o inventário mostrar que uma peça aceita depende do esboço para reproduzir a forma, para e volta à pessoa antes de remover. Se o pacote do crítico precisar mudar enquanto o plano do braço ainda o tiver no território, espera ou pede à pessoa que mude o território.

## Andamento

Fatia 1, em 2026-11-05, com o [inventário](../banco-de-provas/esboco-pelo-nucleo-2026-11-05/README.md) e as contagens reexecutáveis em `contar.mjs` ao lado dele. Nenhuma peça aceita depende do esboço para reproduzir a forma: nenhuma receita está no fecho de import do módulo, e o andaime do avião é um arquivo guardado. Dependem dele a conferência e o crítico: 39 arquivos o importam direto e 62 por outro, 6 gates entre eles; as sete partes do avião com `REFINA.esboco` medem a forma contra o sólido do esboço e têm o alvo do crítico gerado por ele; e todo veredito carrega o módulo pelo comparador de contornos, que o braço usa. Dos 86 esboços guardados, os 13 feitos depois de 2026-10-19 são opções de forma de peça, só com caixa, cilindro, anel, loft, extrusão e cone em tronco, posicionados por `centro`, `sobre`, `ponta` e `desloca`, sem Condutor, contato, componente nem âncora. O 2.0 mínimo cobre esse subconjunto pelo `cubo`, `chamferBox`, `cilindro`, `extrusao`, `lathe` e `loft` do núcleo, com rotação, revolução, recorte, espelho e parâmetros por custo baixo; a seção inclinada do loft fica sem equivalente, e a tampa plana do loft e a extrusão côncava se medem na fatia 2. Antes da remoção, a pessoa decide entre gravar as formas resolvidas do avião como dado e tirar a conferência delas, e o destino do conjunto de calibração do crítico, e o território precisa crescer para o comparador de contornos, o pacote do crítico, a calibração e o tradutor de receitas externas.

Fatia 2, em 2026-11-05, com as decisões da pessoa do mesmo dia: o esboço 2.0 não é limitado, cada opção é uma pequena receita do núcleo com tudo o que ele oferece (o catálogo, as gaiolas, `gaiolaPorLacos`, `aberturaPorContorno` e as famílias), e por cima um atalho que posiciona formas simples por `centro`, `sobre`, `ponta`, `desloca` e `rotacao`, resolvido pela caixa da malha que o núcleo gerou; os `.esboco.json` de opções de forma abrem no 2.0 sem reescrita, por um leitor dos seis tipos que eles usam, e o que o núcleo não faz é recusado com o motivo; e as formas resolvidas das sete partes do avião com `REFINA.esboco` se gravam uma vez no formato `mecanifica.formas-resolvidas@1`, com a composta guardada como alvo, na fatia 3. Entraram o módulo [`modulos/esboco-nucleo/`](../../../modulos/esboco-nucleo/README.md), `npm run esboco:nucleo` e `npm run variantes`, com a captura na bancada pela mesma câmera ortográfica em todas as opções, e as [provas](../banco-de-provas/esboco-pelo-nucleo-2026-11-05/README.md). O leitor abre as 13 opções de forma guardadas sem recusa, com as 220 formas conferidas contra a medida declarada, e dos 86 esboços versionados abre 21 e recusa 65 com o motivo, todos do esboço detalhado, dos testes do módulo antigo e das fixtures. Gate 1: as três opções do farol numa chapa curva, com o vão por `aberturaPorContorno`, saem com a borda a 0,000 mm do desenho e o bico com o ângulo desenhado (61,31 graus em A, 60,32 em B); o pisca aberto na lente fica a até 0,003 mm. Gate 2: a cópia de prova da mesa quadrada escura com três espessuras de tampo sai lado a lado, e a variante aceita dá o mesmo hash do neutroCanonico da receita do acervo, que não mudou. A pessoa ainda aprova a imagem das opções (gate 4).

## Fechamento

Preencher ao concluir ou cancelar.
