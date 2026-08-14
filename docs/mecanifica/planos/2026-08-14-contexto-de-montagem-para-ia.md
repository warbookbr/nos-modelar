# Contexto de montagem persistida para IA

**Estado:** ativo
**Responsável:** GPT (arquitetura e revisão) e agente local (execução)

**Repositório e base:** `warbookbr/nos-mecanifica`; `main` em `5c5f1aa`, PR #42;
diagnóstico em `2bbb739`.

## Baseline R00
O resolvedor v2 é puro e falha com código/campo, mas sua árvore interna contém
`Map` e referências de instância: não é contrato JSON público. A CLI aceita só
quatro pilotos e devolve texto. O estudo ad hoc mede 8.597 bytes completo e 926
bytes resumido, sem caixa/partes/portas serializadas, consulta ou cobertura
formal. R00 decide **ENVOLVER** o resolvedor sem refatorá-lo; seus erros de
estrutura e referência permanecem a fonte das recusas anteriores ao descritor.

## Problema observado

O [estudo de campo](../RELATORIO-ESTUDO-CAMPO-CONJUNTO-DIANTEIRO.md) provou que
a IA cria e audita peças isoladas e que relações locais persistidas são
determinísticas. Porém não existe uma porta genérica que transforme montagem
persistida arbitrária em contexto compacto e consultável. A CLI
`descrever:montagem` enumera quatro pilotos; a bancada aceita peça, não árvore.

Na R002, o disco invadiu a ponte da pinça em 5 mm e as quatro relações
declaradas permaneceram satisfeitas. Isso está correto para o contrato atual,
mas resumir o caso como “montagem válida” seria falso. A descrição deve separar
o que foi verificado do que ainda não possui contrato.

## Resultado

Uma IA fornece montagem v1/v2 e carregadores explícitos e recebe JSON
determinístico, sem geometria bruta, contendo:

- árvore de peças/submontagens, poses locais/mundiais e caixas espaciais;
- contagens, partes e portas por instância;
- relações, endpoints, especificações, medidas e diagnósticos;
- cobertura e limitações da verificação;
- consulta reduzida por caminho semântico.

O serviço puro alimenta uma CLI local. A fatia não renderiza nem publica MCP.

## Contrato mínimo de saída

```text
formato: mecanifica.contexto-montagem
versao: 1
raiz: { id }
totais: { pecas, montagens, relacoesDeclaradas, satisfeitas, reprovadas }
instancias: [{
  caminho, id, alvo, poseLocal, poseMundo, caixaMundo,
  geometria: { vertices, faces, partes },
  portas: [{ id, rotulo, interfaceDisponivel }]
}]
relacoes: [{
  montagem, id, tipo, referencia, movel, especificacao,
  satisfeita, medidas, diagnosticos
}]
cobertura: {
  relacoesLocaisExecutadas,
  colisaoGlobalVerificada: false,
  dependenciasIndiretasVerificadas: false,
  limitacoes
}
```

Identidades usam IDs/caminhos semânticos. A saída não leva `Map`, alias de
objeto, índice, UUID, `V`, `F`, Three.js ou caminho absoluto. Instâncias são
ordenadas por caminho; relações, por caminho da montagem + ID.

`caixaMundo` deriva de vértices e pose rígida, mas não prova colisão, distância
mínima ou folga. Hierarquia de partes não transportada aparece em `limitacoes`;
nunca é inventada.

## Consulta reduzida

Entradas opcionais: `caminho`, `profundidade` não negativa e
`incluirRelacionados`. A consulta preserva trilha ancestral, informa omissões e
pode incluir endpoints externos tocados por relações da seleção. Filtrar nunca
muda medidas ou satisfação. Caminho ausente falha com código, campo e ação.

## Filtro Agent-First

- **USAR DIRETO:** leitor v1/v2, resolvedor, poses, caminhos e validadores.
- **ENVOLVER:** árvore resolvida com descritor puro; depois, CLI fina.
- **REFATORAR:** só extração comprovadamente necessária para remover alias ou
  `Map` privado; a CLI de pilotos permanece compatível.
- **ADIAR:** render, colisão, relação de folga, mapa global, revalidação, MCP,
  escrita, solver e transporte de hierarquia.

O contexto reduz custo por omitir malha e permitir subárvore; melhora
diagnóstico por separar erro estrutural, relação reprovada e verificação
inexistente; preserva identidade sem posição de array ou runtime.

## Incluído

- descritor puro de montagem resolvida, caixas e contagens sem Three.js;
- resumo serializável de partes, portas, relações e cobertura;
- consulta semântica reduzida;
- CLI nova com raízes explícitas e carregamento confinado;
- fixture v2 e prova end-to-end no conjunto dianteiro;
- contrato aceito, testes, exemplos e documentação Agent-First.

## Excluído

- mudar formato v1/v2, validadores, motor ou peças publicadas;
- novo tipo de relação, colisão ou inferência por proximidade;
- renderização, câmera, material ou publicação das receitas experimentais;
- MCP, API remota, escrita, solver ou promoção de tentativa rejeitada;
- corrigir vista naturalmente fina ou transporte de hierarquia.

## Superfícies previstas

| Superfície candidata | Papel |
|---|---|
| `src/autoria/descrever-montagem-resolvida.js` | serviço puro |
| `tools/mecanifica/descrever-montagem-persistida.mjs` | CLI confinada |
| testes focados de contexto | contrato, recusa e determinismo |
| experimento do conjunto dianteiro | prova sem publicação |

O resolvedor só muda se uma prova revelar acoplamento e a extração preservar
seu contrato. MCP, bancada e motor não entram.

## Semântica da CLI

```text
npm run descrever:montagem:persistida -- \
  --arquivo=<raiz.json> --raiz-montagens=<dir> --raiz-pecas=<dir> \
  [--caminho=freio/disco] [--profundidade=1] [--incluir-relacionados]
```

Refs resolvem apenas para `<raiz>/<ref>.json`. Traversal, symlink externo,
arquivo ausente e JSON inválido falham fechado. `stdout` contém somente JSON
canônico; uso/diagnóstico fica em `stderr`. A CLI não replica regra do serviço.

## Provas obrigatórias

1. **Descrição:** fixture v2 produz árvore, poses, caixas, portas e relações sem
   malha, runtime ou caminho absoluto.
2. **Cobertura:** estudo relata 6 peças, 2 montagens e 4 relações satisfeitas,
   mas nega colisão global/dependências; R002 não vira “válida”.
3. **Consulta:** caminho do freio mantém trilha, descendentes e relações; opção
   de relacionados inclui somente endpoints necessários e explica a inclusão.
4. **Determinismo:** duas execuções são byte-idênticas; reordenar listas sem
   mudar identidade/conteúdo preserva saída; entradas não são mutadas.
5. **Recusa:** caminho/profundidade inválidos, referência ausente, traversal,
   symlink externo e JSON inválido falham acionavelmente e sem parcial.
6. **Economia:** estudo completo fica abaixo de 64 KiB; consulta é menor e
   nenhuma delas contém vértices/faces.
7. **Compatibilidade:** CLIs, fixtures e testes v1/v2 atuais não mudam de
   comportamento ou expectativa.

## Gate de saída

1. serviço puro recebe somente árvore resolvida + opções explícitas;
2. contrato não expõe malha nem identidade de runtime;
3. cobertura distingue satisfação de ausência de verificação;
4. consulta reduz contexto sem perder relações necessárias;
5. CLI é fina, confinada e compatível com a CLI de pilotos;
6. provas 1–7, suíte, typecheck, build, mapa, links e planos passam;
7. nenhuma peça, câmera, material, motor ou contrato v1/v2 muda;
8. saída pública e decisão Agent-First ficam documentadas.

## Fatias

1. R00 — concluído: baseline, contrato, bytes, ausências e erros;
2. R01 — concluído: árvore, poses, caixas, portas, relações e cobertura;
3. R02 — concluído: caminho, profundidade e relacionados;
4. R03 — concluído: CLI confinada e diagnóstico;
5. R04 — concluído: repetir R001/R002 e medir contexto;
6. R05 — documentação, gates, decisão e fechamento.

Cada R termina verde e em commit próprio; falha não antecipa render ou MCP.

## Sequência posterior

| Ordem | Candidato | Dependência |
|---:|---|---|
| 1 | contexto visual de conjunto/par/subárvore | este descritor |
| 2 | relação neutra de folga e mapa de dependentes | contexto estável |
| 3 | MCP somente leitura para montagem | serviços descritivo/visual aprovados |
| 4 | comparação de tentativas rejeitadas | contrato de tentativa |
| 5 | autoria transacional | dependentes, revalidação e commit seguro |

Correções independentes usam planos curtos: enquadramento de objetos finos;
sintaxe/documentação de `comparar:revisao`; hierarquia somente quando houver
consumidor real.

## Riscos e parada

- parar se for preciso mudar v2 ou tratar caixa como colisão/folga;
- parar se consulta depender de índice, ordem ou objeto de runtime;
- parar se a CLI precisar executar código/shell ou escapar das raízes;
- reduzir o contrato antes de ampliar se o estudo exceder 64 KiB;
- não incluir renderização ou MCP para contornar uma prova falha.

## Fechamento

Registrar estado, base, commits/PR, saída aceita, bytes completo/reduzido,
provas, gates, limitações e decisão sobre abrir ou não a fatia visual.
