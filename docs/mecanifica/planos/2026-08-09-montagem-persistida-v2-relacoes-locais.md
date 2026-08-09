# Montagem Persistida v2 — Relações Locais

**Estado:** ativo

**Responsável:** GPT (arquitetura e revisão) e agente local (execução)

**Repositório e base:** `warbookbr/nos-mecanifica`, a partir de `main` em `b8007f990f068fdbd5350127c0bb1c62457f3106`

## Problema observado

A Montagem Mínima Persistida v1 já representa composição recursiva, identidade
de instância e pose rígida, mas não persiste intenção mecânica entre componentes.
O backlog estabelece que mapa de dependências e contexto dependem de composição
e relações persistidas. Hoje já existem validadores locais executáveis para
`encaixaCilindrico` e `assentaAnular`, porém suas declarações vivem fora do
contrato canônico de montagem.

Sem uma relação persistida, um mapa futuro pode dizer que duas peças estão na
mesma árvore, mas não pode afirmar por que devem ser revalidadas juntas.

## Resultado

Permitir que `mecanifica.montagem` versão 2 persista relações mecânicas locais
entre portas de instâncias, resolva seus alvos por caminhos semânticos e execute
os validadores locais existentes de forma determinística, mantendo leitura e
comportamento da versão 1 compatíveis.

## Filtro Agent-First

- **USAR DIRETO:** identidade, pose, composição recursiva e resolução de peças da
  montagem v1. Já são determinísticas, semânticas e independentes de Three.js.
- **ENVOLVER:** `interfaces-montagem.js`. Os validadores locais são úteis, mas a
  interface atual usa estruturas planas e chaves como `instancia.porta`; a nova
  camada deve receber caminhos semânticos recursivos e adaptar para esses
  validadores sem duplicar sua matemática.
- **REFATORAR:** somente se for necessário extrair uma função pura já existente
  para evitar duplicação real. Nenhuma reescrita ampla do módulo é autorizada.
- **ADIAR:** mapa global de dependências, contexto de trabalho, revalidação
  automática, solver, cinemática, escrita, CLI, MCP e prévia automática de pose.

A interface persistida deve ser pequena: a IA declara **qual relação**, **quais
portas** e **qual especificação mensurável**, sem precisar conhecer Maps internos,
ordem de renderização ou detalhes do motor.

## Decisão de versionamento

A versão 1 é fechada e rejeita chaves desconhecidas. Ela não será alterada para
aceitar relações silenciosamente.

A nova autoria usa:

```text
formato: mecanifica.montagem
versao: 2
```

A versão 2 preserva `id`, `instancias` e pose da v1 e acrescenta `relacoes`.
Leitura e resolução de arquivos v1 continuam suportadas sem migração obrigatória.
Montagens v1 e v2 podem coexistir na mesma árvore recursiva.

## Contrato mínimo de relação

`relacoes` é uma lista canônica ordenada por `id`. Cada relação possui:

```text
id: texto semântico não vazio e único na montagem
tipo: encaixaCilindrico | assentaAnular
referencia: { caminho: [ids de instância...], porta: id-da-porta }
movel:      { caminho: [ids de instância...], porta: id-da-porta }
especificacao: objeto estrito dependente do tipo
```

`caminho` é relativo à montagem que declara a relação, usa apenas IDs semânticos
de instância e deve terminar em uma instância de peça. Assemblies ainda não
publicam portas próprias neste recorte.

Para `encaixaCilindrico`, `especificacao` contém:

```text
folgaRadial: {
  nominal: número finito >= 0,
  toleranciaFabricacao: { menos: >= 0, mais: >= 0 }
}
toleranciaNumerica: número finito >= 0
```

Para `assentaAnular`, `especificacao` contém:

```text
sobreposicaoRadial: { nominal, toleranciaFabricacao: { menos, mais } }
sobreposicaoAxial:  { nominal, toleranciaFabricacao: { menos, mais } }
toleranciaNumerica: número finito >= 0
```

A persistência v2 não adota o formato legado `{min,max}`. O adaptador pode
traduzir a forma canônica v2 para o validador existente.

## Semântica de falha

Separar duas classes de erro:

1. **declaração/endereçamento inválido:** formato, relação duplicada, tipo não
   suportado, caminho inexistente, caminho que termina em montagem, porta ausente
   ou especificação malformada falham fechado; não há resultado de validação
   parcial considerado válido;
2. **relação mecanicamente não satisfeita:** a declaração é válida e a montagem
   resolve, mas a validação retorna `satisfeita: false`, medidas e diagnósticos.
   Isso não corrompe nem apaga outras relações válidas.

Essa separação é necessária para futura revalidação de dependentes: “estado
inválido de autoria” não pode ser confundido com “compromisso mecânico medido e
reprovado”.

## Incluído

- suporte explícito a versões 1 e 2 do mesmo formato;
- `relacoes` canônicas na versão 2;
- IDs de relação estáveis e duplicidade fail-closed;
- endpoints por caminho semântico relativo + porta;
- resolução de endpoints em árvores recursivas v1/v2;
- adaptação para `validarEncaixeCilindrico` e `validarAssentamentoAnular`;
- resultados estruturados com identidade, endpoints, medidas e diagnósticos;
- determinismo, ausência de mutação e cache já existente preservados;
- fixtures persistidas e pelo menos uma prova com peças/portas reais já
  publicadas, sem alterar essas peças.

## Excluído

- novos tipos genéricos de relação;
- relação entre portas publicadas por uma montagem;
- solver ou correção automática de pose;
- persistir prévia de pose;
- colisão de malha ou espaço varrido;
- mapa global de dependências ou impacto indireto;
- contexto de trabalho da IA;
- revalidação automática após edição;
- writer/transação de montagem;
- CLI, MCP ou API de autoria;
- alterações no motor procedural ou nas peças publicadas.

## Invariantes

- a v1 continua legível e com comportamento compatível;
- relação nunca usa índice, UUID, câmera ou ordem de carregamento como identidade;
- relação não copia geometria, portas ou autoria das peças para a montagem;
- endpoints são resolvidos a partir da composição e das portas publicadas;
- validadores locais existentes continuam sendo a fonte da matemática de
  `encaixaCilindrico` e `assentaAnular`;
- validação não muta montagem, peça, porta ou pose;
- mesma autoria + mesmas definições produz mesmo resultado;
- uma relação reprovada não altera outras relações;
- erro estrutural não retorna conjunto parcial como válido.

## Provas obrigatórias

### A — compatibilidade v1

Fixtures v1 atuais continuam lendo e resolvendo como antes. Nenhuma relação é
inventada e nenhum consumidor precisa migrar para abrir uma montagem v1.

### B — encaixe cilíndrico persistido

Uma montagem v2 real declara `encaixaCilindrico` entre duas portas publicadas.
Provar resolução semântica dos endpoints, medidas determinísticas e estados
`satisfeita: true` e `false` sem alterar as peças.

### C — assentamento anular persistido

Uma montagem v2 declara `assentaAnular` e produz medidas/diagnósticos pelo
validador existente, sem matemática duplicada na nova camada.

### D — caminho recursivo

Uma relação declarada na raiz referencia pelo menos uma peça dentro de montagem
filha usando caminho de IDs. O endereço continua estável e sem índices.

### E — recusa estrutural

Cobrir ao menos: versão desconhecida, ID de relação duplicado, tipo não suportado,
caminho inexistente, endpoint em montagem, porta inexistente, especificação
malformada/não finita. Cada caso falha fechado.

### F — determinismo e isolamento

Resolver/validar duas vezes produz resultado canônico equivalente; entradas não
são mutadas e uma relação mecanicamente reprovada não impede relatar outra
relação estruturalmente válida.

## Gate de saída

1. v1 permanece compatível e v2 é versionada/documentada;
2. relações são endereçadas somente por identidade semântica;
3. os dois validadores locais existentes são reutilizados, não reimplementados;
4. Provas A–F passam em fixtures persistidas;
5. nenhuma peça publicada nem contrato do motor é alterado;
6. resultados distinguem erro estrutural de relação mecanicamente reprovada;
7. testes focados e regressões proporcionais ao risco passam;
8. documentação, mapa, links, índices e `planos:check` ficam verdes;
9. decisão Agent-First do recorte fica registrada;
10. fechamento devolve mapa de dependências/contexto/revalidação ao backlog sem
    autorizá-los automaticamente.

## Fatias

1. R00 — abertura documental e baseline de versionamento/validadores;
2. R01 — leitor v1/v2 + validação estrutural de relações;
3. R02 — resolução recursiva de endpoints semânticos;
4. R03 — adaptação/execução de `encaixaCilindrico`;
5. R04 — adaptação/execução de `assentaAnular`;
6. R05 — provas A–F, documentação e regressões;
7. R06 — fechamento.

## Riscos e parada

Parar e registrar antes de ampliar escopo se a relação exigir mudar o motor,
criar identidade posicional/runtime, duplicar matemática dos validadores, usar
Three.js para resolver endpoints, introduzir solver, ou exigir mapa global apenas
para localizar uma relação local. Esses casos pedem revisão de fronteira, não
expansão improvisada.

## Fechamento

Preencher somente ao concluir ou cancelar: estado final, versão adotada, fixtures,
provas, testes, commit/PR, limites encontrados e itens devolvidos ao backlog. O
mapa de composição/dependências só pode ser reconsiderado depois que este plano
provar relações persistidas; não é autorizado automaticamente.