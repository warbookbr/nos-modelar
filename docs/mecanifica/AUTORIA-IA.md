# Autoria para IA

## Objetivo

A linguagem de autoria deve permitir que humano e IA criem, compreendam e
refinem uma peça sem conhecer detalhes internos do renderizador.

O problema principal não é gerar triângulos. É preservar intenção:

- qual peça é o disco;
- qual superfície é a pista de frenagem;
- onde a pastilha encosta;
- o que pode ser alterado sem reconstruir o conjunto;
- como uma referência continua válida após inserções e refinamentos.

## Estado herdado

O NÓS já provou seleções por origem, aliases, partes nomeadas e peças sem
referências literais a IDs globais. O drone herdado foi criado e refinado com
zero IDs literais.

Isso ainda não encerrou o problema:

- blocos internos continuam ligados à posição do passo;
- algumas operações ainda exigem referências numéricas;
- nomes podem esconder seleções incompletas;
- faltam relações espaciais como alinhar, centralizar e encostar;
- faltam expressões gerais entre parâmetros.

Portanto, o formato atual é entrada experimental, não contrato definitivo.

## Regras do novo contrato

1. Identidade persistente é semântica e escolhida pelo autor.
2. IDs de runtime, índices de arrays e posição de passos não são persistidos.
3. Partes formam uma hierarquia navegável.
4. Relações espaciais são declarativas e gerais.
5. Parâmetros podem derivar de outros parâmetros por expressões validadas.
6. Referência ausente, ambígua ou incompatível falha antes de renderizar.
7. Toda operação informa quais identidades cria, preserva, deriva ou remove.
8. O documento possui versão e migração explícita.
9. O resultado é determinístico para a mesma entrada.
10. O estado pode ser descrito e testado sem navegador.

## Vocabulário pretendido

Exemplo ilustrativo, ainda não implementado:

```js
export const FORMATO = { tipo: 'conjunto', versao: 1 };

export const PARAMS = {
  discoRaio: 0.14,
  discoEspessura: 0.022,
  pastilhaNova: 0.012,
};

export const PARTES = {
  freio: { tipo: 'conjunto' },
  disco: { pai: 'freio', tipo: 'disco' },
  pinca: { pai: 'freio', tipo: 'pinca' },
  'pastilha-interna': { pai: 'pinca', tipo: 'pastilha' },
};

export const PASSOS = [
  ['criarDisco', { parte: 'disco', raio: '$discoRaio', espessura: '$discoEspessura' }],
  ['criarPastilha', { parte: 'pastilha-interna', espessura: '$pastilhaNova' }],
  ['alinhar', { parte: 'pastilha-interna', eixo: 'disco.eixo' }],
  ['encostar', { de: 'pastilha-interna.face-atrito', em: 'disco.pista-interna' }],
];
```

`disco.eixo`, `pastilha-interna.face-atrito` e `disco.pista-interna` são portas
semânticas publicadas pelos geradores. Elas não são listas de faces disfarçadas.

## Operações gerais antes de operações automotivas

O domínio pode oferecer geradores convenientes como `criarDisco`, desde que o
núcleo permaneça geral. Capacidades estruturais devem servir a outros projetos:

- `alinhar`;
- `centralizar`;
- `encostar`;
- `distanciar`;
- `espelhar`;
- `repetir`;
- `agrupar`;
- `derivarParametro`;
- `publicarPorta`.

Uma operação específica só entra quando representa conhecimento real de domínio,
não quando contorna uma limitação geométrica.

## Prova contra chuva de IDs

Uma peça só passa quando:

- não contém referências persistidas a IDs internos;
- sobrevive à inserção de um passo anterior;
- permite mudar um parâmetro sem renomear partes;
- permite apagar uma parte e produz erro claro nas relações dependentes;
- pode ser refinada por outro agente sem regeneração integral;
- produz descrição semântica útil em modo headless.
