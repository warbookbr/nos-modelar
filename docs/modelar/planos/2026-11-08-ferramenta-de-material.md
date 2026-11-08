# Ferramenta de material para o agente: ver, compor e reaproveitar materiais sem rodar a peça inteira

**Estado:** rascunho

**Território:** a declarar ao ativar, depois que o plano dos [materiais realistas](2026-11-08-materiais-realistas.md) fechar,
porque divide com ele `src/autoria/material-da-receita.js`, `modulos/textura/` e `src/bancada/`; a captura toca
`tools/modelar/olhar-bancada.mjs`, hoje do furgão.

**Responsável:** Tiago (aprovação por imagem) e a IA da sessão (implementação)

**Repositório e base:** `warbookbr/nos-modelar`, main no fechamento do plano dos materiais realistas.

## Problema observado

Nas fatias 2 e 3 dos materiais realistas (2026-11-08), cada ajuste de material custou uma volta inteira: editar a receita da
peça de prova, rodar a captura da bancada (de 5 a 10 minutos por imagem nesta máquina) e abrir a imagem. Os atritos, nos
relatórios dos agentes:

- A captura não aceita o ambiente pela linha de comando; os agentes usaram um script avulso que injeta `?ambiente=` na URL.
- O nome do arquivo estoura com mais de cinco partes selecionadas, e não há câmera livre nem isométrica de trás.
- Os mapas de relevo só foram vistos por teste ou por uma imagem gerada à mão; não há uma vista do mapa sozinho.
- O material aceita um único `relevo`, e o pneu precisou de dois materiais (banda e letras) e da escolha das faixas do lathe.
- Cada receita repete os números de cada material (verniz, aspereza, transmissão); a mesma tinta em duas peças são duas
  declarações que podem divergir.
- O ambiente saiu de cabeça para baixo na primeira versão e só a imagem mostrou: nada dizia ao agente o material efetivo
  que a bancada montou.

## Resultado

O agente vê um material em segundos, sozinho, nos dois ambientes e com os mapas lado a lado, compõe mais de um relevo
no mesmo material por região, e declara um material como uma base nomeada da biblioteca com poucos ajustes; a bancada diz
o material efetivo de cada parte e de onde veio cada valor.

## Incluído

- **Amostra rápida:** `npm run material:amostra -- <peça>:<material>` (ou um material avulso em JSON) grava uma folha com a
  forma de prova adequada (placa, esfera, cilindro), no estúdio e no céu aberto, e os mapas de cor, relevo e aspereza ao
  lado, em uma imagem, sem montar a peça.
- **Relevo composto:** `relevo` aceita uma lista, cada item com a região (faixa de u ou v da projeção, ou o lado da parte),
  para a banda e as letras do pneu caberem num só material.
- **Biblioteca de materiais:** materiais nomeados por caráter (tinta sólida com verniz, vidro claro, vidro escurecido, metal
  espelhado, aço pintado, borracha, plástico acetinado), sem objeto nem marca, e a receita declara `base` mais o que muda.
- **Material efetivo:** o normalizador devolve, para cada campo, o valor final e a origem (padrão, base ou receita), e a
  bancada e o `descrever` o mostram.
- **Captura:** `--ambiente` na `olhar-bancada.mjs`, nome de arquivo curto com resumo da seleção, e câmera por azimute,
  elevação e distância.

## Excluído

- Material novo ou mudança de aparência de peça do acervo: a biblioteca nasce com os valores já aprovados.
- O pacote do crítico, que segue neutro.

## Gate de saída

1. A amostra de um material sai em menos de 30 s nesta máquina, determinística.
2. O pneu de prova volta a um material só, com a mesma imagem de antes.
3. As peças que adotarem a biblioteca saem com a cena idêntica à de antes.
4. O material efetivo aparece no `descrever` com a origem de cada campo.
5. Um agente de estudo, com só a ficha da capacidade, ajusta um material e mostra a amostra sem ler o código.

## Fatias

1. Material efetivo com origem, e a captura com `--ambiente`, nome curto e câmera.
2. Amostra rápida.
3. Relevo composto, com o pneu de prova num material.
4. Biblioteca de materiais e a adoção nas peças que já declaram material físico.
5. Agente de estudo e fechamento.

## Riscos e parada

Se a amostra não ficar rápida sem a bancada inteira (o navegador por software leva perto de 1 s por quadro), parar e trazer
à pessoa a troca entre resolução menor e tempo. A biblioteca não pode virar paleta nova: se um valor da biblioteca mudar a
aparência de uma peça já aprovada, a adoção para naquela peça.

## Fechamento

Preencher ao concluir ou cancelar.
