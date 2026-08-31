# Intenção semântica opcional de peça — v1

Uma receita procedural pode exportar `INTENCAO` para registrar o que a peça
pretende fazer e como outra IA deve avaliá-la. É um contrato de autoria, não é
material, geometria, montagem ou metadado do cliente.

```js
export const INTENCAO = {
  funcao: 'guiar a carga entre duas interfaces',
  familia: 'suporte estrutural',
  eixosLocais: { x: 'largura', y: 'altura', z: 'profundidade' },
  invariantes: ['base permanece apoiada'],
  criteriosVisuais: ['silhueta compacta'],
};
```

Todos os cinco campos são obrigatórios quando `INTENCAO` existe. `funcao` e
`familia` são textos curtos; `eixosLocais` declara exatamente `x`, `y` e `z`;
`invariantes` e `criteriosVisuais` são listas de textos. A entrada é recusada
se tiver chave desconhecida, valor não finito, repetição, caminho, UUID ou
identidade posicional/runtime. Listas são ordenadas por ponto de código para
produzir a mesma entrada, assinatura e diff independentemente da ordem de
declaração.

`normalizarIntencaoPeca()` devolve `null` para ausência. A fronteira de receita
só acrescenta `entrada.INTENCAO` quando há uma intenção válida, preservando as
assinaturas das receitas históricas que não a declaram. O serviço de descrição
expõe `resultado.intencao` e `resultado.descricao.intencao`, ambos `null` quando
ausentes.

Revisões que recebem intenção assinam esse contrato junto com o modelo. O
comparador não relata posições de arrays: usa `funcao`, `familia`, o nome do
`eixo` e conjuntos nomeados de `invariantes` e `criteriosVisuais` adicionados ou
removidos. A intenção não é inserida no formato persistido
`mecanifica.peca-resolvida` v1.
