# Ferramentas de conferência e de vista: o agente mede e vê sozinho o que hoje só a pessoa acha

**Estado:** ativo

**Território:** `src/autoria/dobras-aceitas.js`, `tools/modelar/vinco-oculto.mjs`, `tools/modelar/dobra-da-superficie.mjs`, `tools/modelar/descrever-peca.mjs`, `tools/modelar/olhar-bancada.mjs`, `tools/modelar/olhar-bancada.test.mjs`, `tools/modelar/analise-da-peca.mjs`, `tools/modelar/assinatura-da-malha.mjs`, `tools/modelar/etapas-da-montagem.mjs`, `src/autoria/plano-de-modelagem.js`, `src/autoria/plano-de-modelagem.test.js`, `modulos/esboco-nucleo/`, `tools/modelar/esboco-nucleo.mjs`, `tools/modelar/linhas-do-modelo.mjs`, `tools/modelar/vista-rapida.mjs`, `tools/modelar/leitura-por-regioes.mjs`, `tools/modelar/casamento-da-vista.mjs`, `tools/modelar/conferir-vistas.mjs`

**Responsável:** a IA da sessão do furgão, com as decisões técnicas delegadas pela pessoa em 2026-11-09; a pessoa é a
crítica por imagem, com um resumo curto do que olhar.

**Repositório e base:** `warbookbr/nos-modelar`, main de 2026-11-09.

Em 2026-11-09 a pessoa passou a este plano `etapas-da-montagem.mjs`, que era do plano do
[braço](encerrados/2026-09-26-as-partes-do-braco.md), para o registro de etapas parar de se regravar; ele volta ao braço quando este
fechar. A câmera por ponto e o nome curto da captura saem do rascunho da [ferramenta de material](2026-11-08-ferramenta-de-material.md).

## Problema observado

Nas rodadas de 2026-11-08 e 2026-11-09 do furgão e do braço, a pessoa achou na imagem o que as ferramentas não mostraram ao
agente, e os agentes gastaram horas em scripts próprios para ver ou medir:

- as rugas no canto de cima da coluna do para-brisa passaram porque a crista da coluna estava em `PLANO.dobrasAceitas`, e a
  régua testa a região só no centro da cadeia; a ruga na ponta da cadeia some junto, e o `descrever` não imprime as pontas;
- a bancada não tem câmera que mire uma coordenada em mm, a isométrica de trás falta, o `--focar` no modo contexto enquadra a
  peça inteira, e os closes saíram de recortes de capturas de 3.200 px, de 4 a 15 min cada;
- a `--analise` recarrega a peça a cada vista (31 a 33 min no furgão), e o `--zoom` aceita uma caixa em pixel de uma vista só;
- provar "malha idêntica" exigiu um script de hash em cada rodada;
- o limite de 240 caracteres dos campos do PLANO só aparece no `descrever`, de 3 min, e o `guarda:acervo` não o acusa;
- no esboço do núcleo a cor de cada forma é ignorada, e o esboço não roda na cópia isolada do agente sem copiar o `manifold-3d`;
- o `etapas-da-montagem` regrava o `montagem.etapas.json` ao só ler o estado, e o arquivo aparece modificado no git.

## Resultado

O agente confere uma dobra aceita pela cadeia inteira, mira a câmera num ponto da peça, tira as vistas da análise numa carga
só, prova malha idêntica com um comando, vê o limite do PLANO na guarda e roda o esboço com cor na cópia isolada; nada disso
pede script fora do repositório.

## Filtro Agent-First

Cada ferramenta nasce de um atrito relatado, com o comando que o reproduz, e é provada refazendo aquele caso.

## Incluído

- a região de `dobrasAceitas` valendo pela extensão da cadeia (a cadeia inteira dentro da caixa), com as pontas no texto do
  `descrever` e as declarações do acervo revistas;
- `olhar-bancada`: `--mirar=x,y,z` em mm com distância, e a isométrica de trás; a `--analise` numa carga só da página, e o
  `--zoom` por caixa em mm;
- `tools/modelar/assinatura-da-malha.mjs`: a assinatura de cada parte e da peça, e a comparação de duas rodadas;
- o limite de texto do PLANO conferido no normalizador, onde o `guarda:acervo` já passa;
- a cor por forma no esboço, e o esboço rodando na cópia isolada sem cópia manual;
- o `etapas-da-montagem` gravando os campos sempre na mesma ordem e só quando o conteúdo muda.
- uma régua da regularidade de uma crista ao longo dela, que ache o nó onde uma coluna da gaiola morre: no canto de cima da
  coluna do para-brisa do furgão (2026-11-09) o realce faz um gancho que a pessoa vê, e a `vinco-oculto`, que dá só posição e
  ângulo médio da cadeia inteira, não o acusa; e uma vista de perto só da chapa, sem rodar a receita inteira.
- um aviso no `descrever` para cada `aberturaPorContorno` que cai na booleana da chapa inteira, com o motivo do registro
  (`vizinhanca.motivo`) e o tempo do passo: a janela da cabine do furgão (2026-11-09) pôs quatro vãos nesse caminho, a
  receita foi de 118 s a 207 s, e só o CI acusou, depois do envio, pelos tetos de tempo.
- as ferramentas da empilhadeira (`linhas:modelo`, `vista:rapida`, `leitura:regioes`, `casamento:vista`, `conferir:vistas`)
  abrindo receita de peça, e não só esboço, e recortando a região pedida em mm: no furgão (2026-11-11) a vista rápida da cabine
  saiu em 11 s contra 4 a 15 min da bancada e as linhas da malha mostraram o degrau da porta, mas foi preciso um adaptador fora do
  repositório para rodar a receita, e a leitura por regiões só cortou certo com o painel passado à mão;
- a recusa silenciosa no `descrever` e no `guarda:acervo`: um passo que deixa `neutro.orfaos` (uma `aberturaPorContorno` cujo
  contorno cruza a fresta de uma porta, no furgão em 2026-11-11) esvazia a chapa e o resto da cadeia, e o `descrever` só diz que a
  peça não tem a parte; ele passa a imprimir cada órfão com o passo e o motivo, e a guarda a reprovar;
- a bancada: o `--focar` com vista de lado põe a câmera dentro da peça quando as partes escolhidas são pequenas (a cabine do
  furgão, 2026-11-12), a captura não diz em que passo está durante os minutos de carga, e uma captura recusada deixa o processo
  antigo segurando a porta do servidor até o prazo dele; o `descrever` e o `guarda:acervo` também passam de dois minutos sem saída.
- pedido da sessão do furgão (2026-11-12): o teto de tempo do furgão no `acervo-real.test.mjs` medido contra uma peça de
  referência na mesma bateria, e não por número fixo; a mesma receita levou 104 s, 188 s e 368 s no CI em três baterias do
  mesmo dia, e o teto fixo reprovou ao acaso duas vezes.

Caso de teste da régua da crista, pedido pela sessão do núcleo: a ruga no alto das duas colunas do para-brisa do furgão está
presente no envio `fee4b88c` (main de 2026-11-12) e no envio seguinte, o dos retrovisores, que não toca a coluna; a correção da
ruga vem num envio próprio depois deles.

## Excluído

- o material (amostra, biblioteca, relevo composto), que segue no rascunho da ferramenta de material;
- mudar receita de peça, salvo a região de uma dobra aceita que a régua nova pedir rever.

## Gate de saída

1. A ruga do canto da coluna do furgão, num estado antes da correção dela, é acusada pela régua com a região aceita de antes.
2. Cada ferramenta tem teste e refaz o caso que a motivou, sem script de fora, com o tempo medido.
3. Ler o estado das etapas não muda o `montagem.etapas.json`.
4. O acervo inteiro passa com as declarações revistas.

## Fatias

1. A dobra aceita pela cadeia inteira, com as pontas no `descrever`, e a revisão das declarações do acervo.
2. A câmera que mira um ponto, a isométrica de trás e a assinatura da malha.
3. A análise numa carga só e o zoom em mm.
4. O limite do PLANO na guarda, a cor e a cópia isolada no esboço, e o registro de etapas estável.
5. Fechamento.

## Riscos e parada

Se a régua pela cadeia inteira acusar no acervo feições aprovadas pela pessoa, a declaração é revista com região justa e a
mesma intenção; se a feição não couber em região nenhuma, ela vai à pessoa com a imagem antes de mudar a régua.

## Fechamento

Preencher ao concluir ou cancelar.
