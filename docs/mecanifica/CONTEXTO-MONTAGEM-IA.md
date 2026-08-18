# Contexto de montagem para IA

Este contrato transforma uma árvore já resolvida de `mecanifica.montagem` v1,
v2, v3 ou v4 em JSON compacto, determinístico e consultável. Ele permite que a IA
compreenda composição, poses, caixas, partes, portas e relações sem receber a
malha bruta nem objetos internos de runtime.

## Serviço puro

`src/autoria/descrever-montagem-resolvida.js` exporta:

```js
descreverMontagemResolvida(montagemResolvida, {
  caminho: ['freio', 'disco'],
  profundidade: 1,
  incluirRelacionados: true,
})
```

As opções são facultativas. Sem elas, o serviço descreve a árvore completa. A
consulta reduzida preserva ancestrais, seleciona descendentes até a profundidade
pedida e pode incluir somente os endpoints externos das relações tocadas. Ela
não expande relações transitivamente.

A saída usa `formato: mecanifica.contexto-montagem`, `versao: 1` e contém:

- raiz e totais de peças, submontagens e relações;
- instâncias ordenadas por caminho semântico;
- poses locais e mundiais;
- caixas mundiais, contagens geométricas, partes e portas;
- relações ordenadas, endpoints absolutos, medidas e diagnósticos;
- cobertura explícita e, em consultas, contagens de omissões.

Não aparecem `V`, `F`, `Map`, definição interna, referência de instância,
índice, UUID, Three.js ou caminho absoluto.

## Cobertura honesta

Uma relação local satisfeita não torna a montagem globalmente válida. A saída
declara sempre os limites atuais:

```json
{
  "relacoesLocaisExecutadas": true,
  "colisaoGlobalVerificada": false,
  "dependenciasIndiretasVerificadas": false
}
```

`caixaMundo` serve para enquadramento e contexto espacial. Ela não prova
colisão, distância mínima, contato ou folga. A hierarquia interna de partes
também ainda não é transportada pela peça resolvida.

## CLI local confinada

```bash
npm run descrever:montagem:persistida -- \
  --arquivo=montagens/conjunto.json \
  --raiz-montagens=montagens \
  --raiz-pecas=pecas-resolvidas \
  --caminho=freio/disco \
  --incluir-relacionados
```

O arquivo raiz precisa ficar dentro de `--raiz-montagens`. Referências de
montagem resolvem somente para `<raiz-montagens>/<ref>.json`; peças, para
`<raiz-pecas>/<ref>.json`. Traversal, symlink ou junction, JSON inválido,
referência ausente e opção ambígua falham sem saída parcial. `stdout` contém
somente o JSON; diagnóstico acionável fica em `stderr`.

A CLI de quatro pilotos `descrever:montagem` permanece compatível e separada.
O novo comando não executa receitas, shell, renderizador ou escrita.

## Evidência aceita

No estudo do conjunto dianteiro, a descrição completa contém 6 peças, 2
submontagens e 5 relações em 18.611 bytes. A consulta `freio/disco` com seus
relacionados diretos usa 9.002 bytes. Ambas ficam abaixo do limite de 64 KiB.

Na R002, as quatro relações v2 permanecem satisfeitas e a relação v3 mede
`−0,005 m` de separação direcional, sendo a única reprovada. O contexto nega
explicitamente que colisão global ou dependências indiretas tenham sido
verificadas; não publica um campo de “montagem válida”.

## Limites e próximos consumidores

Este contrato, quando produzido por `descrever_montagem`, não renderiza montagem,
calcula colisão, escreve autoria nem publica MCP. A v3 oferece separação
direcional e um serviço separado deriva impacto local. A auditoria só é executada
por `revisar_montagem`, que transporta um resultado separado; contexto visual,
revalidação automática e portas externas continuam sujeitos aos seus próprios
limites.
