# Receitas com material e textura — tradução sem perdas do projeto externo e geração de textura em Node

**Estado:** ativo

**Responsável:** Claude, com a pessoa aprovando forma e textura

**Repositório e base:** `warbookbr/nos-mecanifica`, ramo `claude/revisar-plano-ativo-cyj8c3`. O plano [aparelhos de caixa](encerrados/2026-10-16-aparelhos-de-caixa.md) fechou em 2026-10-19; este foi ativado pela pessoa no mesmo dia.

## Problema observado

A pessoa remodelou em 3D objetos do projeto externo e guardou as receitas em `repositorio-externo` (`externo`). A
[sonda de 2026-10-19](../banco-de-provas/receitas-origem-2026-10-19/README.md) traduziu essas receitas para o esboço: 1.179 das 1.394 peças (85%) viram forma do
esboço, e os sete objetos conferidos ficam reconhecíveis. Duas coisas impedem que o formato de lá e o do Mecanifica sejam um só.

A primeira é que o tradutor descarta o bloco `realista.materiais` da receita (tipo, cor, desgaste, veio de cada material), então o objeto não
volta ao formato de origem sem perda. A segunda é que a textura de lá é feita por redes de nós do Blender e assada por `bpy`, e o acordo do
repositório deixava material, cor e textura de fora. A pessoa decidiu em 2026-10-19 mudar o acordo, quer um formato universal (o objeto e a
textura abrem no Blender sem problema, e o formato atual entra no Mecanifica sem refazer nada) e quer a textura em módulo próprio, com a
escolha de material de cada peça guardada junto da receita.

## Resultado

Um módulo de tradução que lê e escreve a receita do projeto externo e o esboço do Mecanifica sem perder o bloco de materiais, um módulo de
textura que gera em Node a imagem de cor de cada material e exporta o objeto com textura para o Blender, e o acordo do repositório mudado
para admitir material e textura nessa forma.

## Filtro Agent-First

- **Importadores de OpenSCAD, STEP e STL:** USAR DIRETO o padrão deles (núcleo puro que recebe bytes e devolve esboço e relato, linha de
  comando à parte). O tradutor segue o mesmo molde.
- **Exportador de OBJ:** REFATORAR. Ele passa a escrever `.mtl` com `map_Kd` e coordenadas de textura quando o objeto traz material; sem
  material, escreve como hoje. A tolerância de 1 mm que rejeita triângulos pequenos (achado dos aparelhos) é corrigida aqui.
- **Redes de nós do Blender (`materiais.py`):** ADIAR a cópia. Servem de referência de aparência, e o módulo de textura é reescrito em
  JavaScript, sem Blender.
- **Acordo do repositório (`roteiros.json`, invariante de materiais):** REFATORAR, na fatia 1, para dizer o que passa a valer.

## Incluído

- o bloco de materiais como campo declarado do esboço, guardado sem interpretar (tipo, cor, desgaste, veio e o que mais a receita trouxer);
- o tradutor nos dois sentidos, receita do projeto externo para esboço e esboço para receita do projeto externo, com a prova da volta (converter, voltar e
  comparar com a original) e as peças giradas (`rot`), que respondem por 200 das 215 peças que a sonda recusou;
- o módulo de textura com os quatro tipos de material (madeira, metal, tecido, liso), desgaste e UV de caixa e cilindro, determinístico;
- a exportação para OBJ com `.mtl` e imagem, aberta no Blender;
- uma prova de aparência: a madeira da cadeira gerada em Node ao lado da gerada no Blender, para a pessoa julgar;
- a mudança do acordo e o registro em `UPSTREAM-NOS.md` se algo geral puder voltar ao NÓS.

## Excluído

- adaptar os objetos do projeto externo como receita de peça ou família do Mecanifica (asset, primitiva 2.0): é o plano seguinte, apontado no
  fechamento;
- PBR completo (rugosidade, normal, metálico), transparência real do vidro e animação;
- imagem de referência de projeto externo com marca ou nome de fabricante;
- rodar o Blender nos gates ou no CI.

## Invariantes

Conteúdo salvo determinístico, versionado e reexecutável: a receita guarda a escolha de material e a imagem é sempre regerada, sem arquivo de
imagem versionado junto da peça. O núcleo continua sem Three.js. Quem aprova forma e aparência é a pessoa. IDs internos não são identidade.

## Gate de saída

1. a volta sem perdas provada em todas as receitas do projeto externo que o tradutor aceita, e as recusas listadas com o motivo;
2. a textura da madeira, do metal, do tecido e do liso aprovada pela pessoa em imagem, ao lado da referência do Blender;
3. o objeto exportado abre no Blender com a textura aplicada (conferido por renderização);
4. o acordo mudado no `roteiros.json` e `CLAUDE.md` regerado;
5. `npm run gates` verde, e `--completo` antes do envio à main.

## Fatias

1. **Acordo e bloco de materiais.** Mudar o acordo, declarar o campo de materiais no esboço e fazer o tradutor passá-lo intacto, com a
   prova da volta nos sete objetos já conferidos.
2. **Tradutor completo.** As peças giradas e as demais recusas, os dois sentidos e a prova da volta em todas as receitas.
3. **Textura.** O módulo com os quatro tipos de material, o desgaste e o UV, e a prova de aparência da madeira para a pessoa julgar antes
   de seguir com os outros três tipos.
4. **Exportação.** O OBJ com `.mtl` e imagem, a tolerância do exportador corrigida e a conferência no Blender.
5. **Fechamento.** Custos, achados e o plano seguinte apontado.

## Riscos e parada

Para e volta à pessoa se a madeira em Node não chegar perto da do Blender depois de duas rodadas (então a textura fica como ferramenta
externa e o plano encerra com a tradução); se a volta sem perdas exigir mudar o formato de origem; ou se a exportação precisar do Blender
instalado para funcionar.

## Fechamento

O plano seguinte, a adaptação dos objetos do projeto externo como receita de peça e família do Mecanifica, está no [backlog](BACKLOG.md) e só abre
com o sim da pessoa. Os aparelhos e os móveis dos 41 objetos que o tradutor já aceita por inteiro são os candidatos naturais a perfis das famílias
`aparelho-de-caixa` e `movel-de-caixa`.
