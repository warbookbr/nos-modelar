# Montagem Persistida v2 — Relações Locais
**Estado:** concluído
**Responsável:** GPT (arquitetura e revisão) e agente local (execução)
**Repositório e base:** `warbookbr/nos-mecanifica`, `main` em `b8007f990f068fdbd5350127c0bb1c62457f3106`

## Problema observado
A Montagem Mínima Persistida v1 já representa composição recursiva, identidade
de instância e pose rígida, mas não persiste intenção mecânica. O backlog afirma
que mapa de dependências/contexto depende de composição e relações persistidas.
Já existem validadores locais executáveis para `encaixaCilindrico` e
`assentaAnular`, porém suas declarações ficam fora do contrato canônico.
Sem relação persistida, um mapa futuro sabe contenção, mas não por que dois
componentes precisam ser revalidados juntos.

## Resultado
Permitir que `mecanifica.montagem` v2 persista relações mecânicas locais entre
portas de instâncias, resolva alvos por caminhos semânticos e execute os
validadores existentes deterministicamente, mantendo a v1 compatível.

## Filtro Agent-First
- **USAR DIRETO:** identidade, pose, composição recursiva e resolução da v1.
- **ENVOLVER:** `interfaces-montagem.js`; seus validadores servem, mas a API atual
  recebe estruturas planas/chaves `instancia.porta`, não caminhos recursivos.
- **REFATORAR:** só extração pura necessária para evitar duplicação comprovada.
- **ADIAR:** mapa global, contexto de trabalho, revalidação automática, solver,
  cinemática, escrita, CLI, MCP e prévia automática de pose.
A IA deve declarar qual relação, quais portas e qual especificação mensurável,
sem conhecer Maps internos, ordem de renderização ou detalhes do motor.

## Versionamento
A v1 é fechada e rejeita chaves desconhecidas; não será alterada silenciosamente.
A nova autoria usa `formato: mecanifica.montagem`, `versao: 2`. A v2 preserva
`id`, `instancias` e pose da v1 e acrescenta `relacoes`. V1 continua legível e
resolvível sem migração. Montagens v1/v2 podem coexistir na mesma árvore.

## Contrato mínimo
`relacoes` é lista canônica por `id`. Cada item possui:
```text
id: texto semântico não vazio e único
tipo: encaixaCilindrico | assentaAnular
referencia: { caminho: [ids de instância...], porta: id-da-porta }
movel:      { caminho: [ids de instância...], porta: id-da-porta }
especificacao: objeto estrito por tipo
```
`caminho` é relativo à montagem que declara a relação, usa apenas IDs semânticos
e termina em instância de peça. Montagens ainda não publicam portas próprias.

Para `encaixaCilindrico`:
```text
folgaRadial: {
  nominal: finito >= 0,
  toleranciaFabricacao: { menos: >= 0, mais: >= 0 }
}
toleranciaNumerica: finito >= 0
```
Para `assentaAnular`:
```text
sobreposicaoRadial: { nominal, toleranciaFabricacao: { menos, mais } }
sobreposicaoAxial:  { nominal, toleranciaFabricacao: { menos, mais } }
toleranciaNumerica: finito >= 0
```
A persistência v2 não adota `{min,max}` legado. O adaptador pode traduzir a forma
canônica para o validador existente.

## Semântica de falha
1. **Declaração/endereçamento inválido:** formato, ID duplicado, tipo não
   suportado, caminho inexistente, endpoint em montagem, porta ausente ou
   especificação malformada falham fechado; nenhum conjunto parcial é válido.
2. **Relação mecanicamente não satisfeita:** a autoria é válida e a montagem
   resolve, mas a validação retorna `satisfeita: false`, medidas e diagnósticos.
   Isso não apaga nem corrompe outras relações válidas.

## Incluído
- suporte explícito às versões 1 e 2;
- `relacoes` canônicas na v2 e IDs estáveis;
- endpoints por caminho semântico relativo + porta;
- resolução de endpoints em árvores recursivas v1/v2;
- adaptação para `validarEncaixeCilindrico` e `validarAssentamentoAnular`;
- resultado estruturado com identidade, endpoints, medidas e diagnósticos;
- determinismo, não mutação e caches existentes preservados;
- fixtures persistidas e prova com peças/portas reais já publicadas.

## Excluído
- novos tipos genéricos de relação ou portas publicadas por montagem;
- solver, correção automática ou persistência de prévia de pose;
- colisão de malha, movimento ou espaço varrido;
- mapa global, impacto indireto, contexto de trabalho ou revalidação automática;
- writer/transação, CLI, MCP ou API de autoria;
- mudanças no motor procedural ou nas peças publicadas.

## Invariantes
- v1 continua legível e com comportamento compatível;
- identidade nunca usa índice, UUID, câmera ou ordem de carregamento;
- relação não copia geometria, portas ou autoria da peça;
- endpoints derivam da composição e das portas publicadas;
- validadores existentes continuam sendo a fonte da matemática;
- validação não muta montagem, peça, porta ou pose;
- mesma autoria + mesmas definições produz mesmo resultado;
- relação reprovada não altera outra relação;
- erro estrutural não retorna conjunto parcial como válido.

## Provas obrigatórias
### A — compatibilidade v1
Fixtures v1 atuais continuam lendo/resolvendo como antes; nenhuma relação é
inventada e nenhum consumidor precisa migrar para abrir v1.

### B — encaixe cilíndrico
Montagem v2 real declara `encaixaCilindrico` entre portas publicadas. Provar
endpoints semânticos, medidas determinísticas e estados `true`/`false` sem
alterar peças.

### C — assentamento anular
Montagem v2 declara `assentaAnular` e produz medidas/diagnósticos pelo validador
existente, sem matemática duplicada.

### D — caminho recursivo
Relação da raiz referencia ao menos uma peça em montagem filha por caminho de IDs,
estável e sem índices.

### E — recusa estrutural
Cobrir versão desconhecida, ID duplicado, tipo não suportado, caminho inexistente,
endpoint em montagem, porta inexistente e especificação malformada/não finita.
Cada caso falha fechado.

### F — determinismo e isolamento
Duas execuções produzem saída canônica equivalente; entradas não são mutadas e
uma relação mecanicamente reprovada não impede relatar outra relação válida.

## Gate de saída
1. v1 permanece compatível e v2 fica versionada/documentada;
2. relações usam só identidade semântica;
3. os dois validadores existentes são reutilizados, não reimplementados;
4. Provas A–F passam em fixtures persistidas;
5. nenhuma peça publicada nem contrato do motor muda;
6. erro estrutural é distinto de relação mecanicamente reprovada;
7. testes focados e regressões proporcionais passam;
8. documentação, mapa, links, índices e `planos:check` ficam verdes;
9. decisão Agent-First fica registrada;
10. mapa/contexto/revalidação voltam ao backlog sem autorização automática.

## Fatias
1. R00 — abertura documental e baseline de versionamento/validadores;
2. R01 — leitor v1/v2 + validação estrutural de relações;
3. R02 — resolução recursiva de endpoints semânticos;
4. R03 — adaptação/execução de `encaixaCilindrico`;
5. R04 — adaptação/execução de `assentaAnular`;
6. R05 — provas A–F, documentação e regressões;
7. R06 — fechamento.

## Riscos e parada
Parar antes de ampliar escopo se for preciso mudar o motor, criar identidade
posicional/runtime, duplicar matemática dos validadores, usar Three.js para
endpoints, introduzir solver ou exigir mapa global para localizar relação local.

## Fechamento
- **Estado final:** concluído no R06.
- **Versão e contrato:** `mecanifica.montagem` v2, documentado em
  `docs/mecanifica/MONTAGEM-PERSISTIDA-V2.md`, preservando a compatibilidade v1.
- **Fixtures:** `ciclo-a.json`, `ciclo-b.json`,
  `v2-relacoes-reais.json` e `v2-relacoes-isolamento.json` em
  `tools/mecanifica/fixtures/montagens-persistidas/`.
- **Provas e testes:** provas A–F concluídas; suíte registrada no fechamento
  com 1126 testes aprovados e 1 ignorado, além dos gates documentais,
  tipagem, exportação, mapa e links.
- **Integração:** PR #41 mergeado na `main` no commit `e7b80ac`.
- **Limites preservados:** solver, mapa global, contexto de trabalho,
  revalidação automática, writer, CLI, MCP, API de autoria, alterações no
  motor e alterações nas peças publicadas continuam fora.
- **Próximo estado:** o mapa de composição/dependências volta ao backlog e não
  autoriza implementação automática; um novo recorte exige decisão e plano
  executivo explícitos.
