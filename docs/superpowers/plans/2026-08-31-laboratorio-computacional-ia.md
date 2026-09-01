# Laboratório Computacional para IA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir, em fatias R0–R7, um laboratório computacional geral, reproduzível e confinado que usa a Mecanifica como instrumento opcional sem criar dependência reversa.

**Architecture:** Um núcleo Python 3.12 mantém contratos, controle, artefatos, proveniência, instrumentos, validadores e síntese. Adaptadores ficam fora do núcleo; a ponte Node consome apenas portas públicas da Mecanifica. Cada fatia entrega software executável, testes e artefatos auditáveis antes de liberar a seguinte.

**Tech Stack:** Python 3.12, JSON Schema 2020-12, pytest, Hypothesis, jsonschema 4.26, Pint 0.25, NumPy 2.x, SciPy 1.x, SALib 1.5, scikit-fem 12, HTTPX 0.28, Node.js 22, Vitest 4 e contratos JSON canônicos.

**Spec:** [`docs/superpowers/specs/2026-08-31-laboratorio-computacional-ia-design.md`](../specs/2026-08-31-laboratorio-computacional-ia-design.md)

## Global Constraints

- O laboratório vive em `laboratorio/`; artefatos de execução vivem em `laboratorio/.lab/` e não entram no Git.
- A Mecanifica nunca importa `laboratorio/`; a guarda de independência falha com qualquer dependência reversa.
- Planejamento e execução são autoridades separadas; rede e escrita começam negadas.
- Toda grandeza física cruza interfaces como `{valor, unidade}`, nunca como número nu.
- Instrumentos são registrados explicitamente; importação e `PATH` não concedem capacidade.
- SHA-256 sobre JSON canônico identifica documentos e artefatos; execução sempre recebe identidade própria.
- Saídas só viram evidência depois de validadores; convergência numérica não equivale a validação física.
- Hipóteses terminam em `sustentada-no-dominio-testado`, `contradita`, `inconclusiva` ou `nao-testada`.
- Resultados podem recomendar autoria, mas nunca gravam ou promovem revisão da Mecanifica.
- Dependências de produção aceitas: licenças MIT, BSD-2/3-Clause ou Apache-2.0; qualquer exceção interrompe a fatia.
- Cada task começa consultando a coordenação local e reservando somente os arquivos listados.
- Cada task usa TDD, termina com gates verdes e um commit próprio; não misturar refatorações oportunistas.
- A baseline Windows mantém quatro provas de symlink como limitação ambiental conhecida; não silenciar nem enfraquecer essas provas.

## Mapa de entregas

| Fatia | Tasks | Entrega verificável |
|---|---:|---|
| R0 | 1–2 | pacote isolado, contratos e hashing canônico |
| R1 | 3 | artefatos, proveniência e RO-Crate mínimo |
| R2 | 4–5 | registro, DAG e runner confinado |
| R3 | 6 | pesquisa e grafo de alegações |
| R4 | 7–8 | unidades, V&V, incerteza e síntese |
| R5 | 9 | ponte neutra da Mecanifica |
| R6 | 10–11 | dois pilotos verticais independentes |
| R7 | 12 | serviços Agent-First, CLI/MCP e prova caixa-preta |

---

### Task 1: Esqueleto Python e guarda de isolamento R0

**Files:**
- Create: `laboratorio/README.md`
- Create: `laboratorio/pyproject.toml`
- Create: `laboratorio/src/laboratorio/__init__.py`
- Create: `laboratorio/src/laboratorio/erros.py`
- Create: `laboratorio/testes/test_isolamento.py`
- Create: `tools/arquitetura/independencia-laboratorio.mjs`
- Create: `tools/arquitetura/independencia-laboratorio.test.mjs`
- Modify: `.gitignore`
- Modify: `package.json`

**Interfaces:**
- Consumes: nenhuma interface nova.
- Produces: `ErroLaboratorio`, `falhar(categoria, codigo, mensagem, **contexto)` e scripts `lab:test`, `lab:check`, `arquitetura:lab:check`.

- [ ] **Step 1: Escrever as provas de isolamento e erro estruturado**

```python
def test_erro_expoe_contrato_estavel():
    erro = falhar("contrato", "documento-invalido", "formato ausente", local="$.formato")
    assert erro.para_dict() == {
        "categoria": "contrato", "codigo": "documento-invalido",
        "mensagem": "formato ausente", "local": "$.formato",
        "causa": None, "recuperavel": False, "acaoSugerida": None,
    }
```

No teste Node, criar uma fixture temporária em que um arquivo fora de
`laboratorio/` importa `laboratorio/` e exigir código não zero; provar também que
imports no sentido laboratório → Mecanifica são aceitos somente em
`laboratorio/adaptadores/mecanifica-node/`.

- [ ] **Step 2: Executar as provas vermelhas**

Run: `python -m pytest laboratorio/testes/test_isolamento.py -q`
Expected: FAIL porque o pacote ainda não existe.

Run: `npx vitest run tools/arquitetura/independencia-laboratorio.test.mjs`
Expected: FAIL porque a guarda ainda não existe.

- [ ] **Step 3: Criar o pacote mínimo e a guarda**

Fixar `requires-python = ">=3.12,<3.13"`; usar layout `src`; declarar grupos
`test` com `pytest==8.4.2` e `hypothesis==6.167.1`. Implementar a guarda a partir
de `git ls-files`, examinando imports estáticos JS/TS/Python e recusando a aresta
proibida. Acrescentar `laboratorio/.lab/` e `laboratorio/.venv/` ao `.gitignore`.

```python
@dataclass(frozen=True)
class ErroLaboratorio(Exception):
    categoria: str
    codigo: str
    mensagem: str
    local: str | None = None
    causa: str | None = None
    recuperavel: bool = False
    acao_sugerida: str | None = None
```

- [ ] **Step 4: Instalar em ambiente isolado e validar R0**

Run: `python -m venv laboratorio/.venv`

Run: `laboratorio/.venv/Scripts/python -m pip install -e "laboratorio[test]"`

Run: `npm run arquitetura:lab:check && npm run lab:test`
Expected: ambos PASS.

- [ ] **Step 5: Commitar**

```bash
git add .gitignore package.json laboratorio tools/arquitetura/independencia-laboratorio.mjs tools/arquitetura/independencia-laboratorio.test.mjs
git commit -m "feat(lab): criar fronteira isolada do laboratorio"
```

### Task 2: Contratos v1 e identidade canônica R0

**Files:**
- Create: `laboratorio/contratos/schemas/comum.schema.json`
- Create: `laboratorio/contratos/schemas/estudo.schema.json`
- Create: `laboratorio/contratos/schemas/hipotese.schema.json`
- Create: `laboratorio/contratos/schemas/protocolo.schema.json`
- Create: `laboratorio/contratos/schemas/instrumento.schema.json`
- Create: `laboratorio/contratos/schemas/plano.schema.json`
- Create: `laboratorio/contratos/schemas/execucao.schema.json`
- Create: `laboratorio/contratos/schemas/evidencia.schema.json`
- Create: `laboratorio/contratos/schemas/sintese.schema.json`
- Create: `laboratorio/contratos/schemas/pacote-reproduzivel.schema.json`
- Create: `laboratorio/contratos/exemplos/estudo-minimo.json`
- Create: `laboratorio/src/laboratorio/contratos.py`
- Create: `laboratorio/src/laboratorio/canonico.py`
- Create: `laboratorio/testes/contrato/test_contratos_v1.py`
- Create: `laboratorio/testes/contrato/test_canonico.py`

**Interfaces:**
- Consumes: `ErroLaboratorio`.
- Produces: `validar_documento(documento: Mapping[str, Any]) -> None`, `bytes_canonicos(valor: Any) -> bytes`, `sha256_canonico(valor: Any) -> str`.

Os schemas fixam exatamente `lab.estudo@1`, `lab.hipotese@1`,
`lab.protocolo@1`, `lab.instrumento@1`, `lab.plano@1`, `lab.execucao@1`,
`lab.evidencia@1`, `lab.sintese@1` e `lab.pacote-reproduzivel@1`.

- [ ] **Step 1: Escrever testes parametrizados para os nove contratos**

```python
@pytest.mark.parametrize("formato", FORMATOS_V1)
def test_exemplo_minimo_valida(formato, exemplos):
    validar_documento(exemplos[formato])

def test_hipotese_recusa_estado_verdadeira(exemplos):
    doc = exemplos["lab.hipotese@1"] | {"estado": "verdadeira"}
    with pytest.raises(ErroLaboratorio, match="estado-invalido"):
        validar_documento(doc)
```

Cobrir campos obrigatórios, `additionalProperties: false` nas estruturas
canônicas, RFC 3339 UTC, IDs, estados e grandeza `{valor, unidade}`.

- [ ] **Step 2: Provar hashing determinístico e rejeição de valores ambíguos**

```python
def test_hash_independe_da_ordem_das_chaves():
    assert sha256_canonico({"b": 2, "a": 1}) == sha256_canonico({"a": 1, "b": 2})

@pytest.mark.parametrize("valor", [float("nan"), float("inf"), -float("inf")])
def test_canonico_recusa_float_nao_finito(valor):
    with pytest.raises(ErroLaboratorio, match="numero-nao-finito"):
        bytes_canonicos({"x": valor})
```

- [ ] **Step 3: Executar testes vermelhos**

Run: `npm run lab:test -- laboratorio/testes/contrato -q`
Expected: FAIL por módulos e schemas ausentes.

- [ ] **Step 4: Implementar JSON Schema 2020-12 e JSON canônico**

Adicionar `jsonschema==4.26.0`. Resolver schemas somente dentro de
`laboratorio/contratos/schemas`; mapear erros para `contrato/documento-invalido`
com JSON Pointer. Serializar UTF-8, chaves ordenadas, separadores compactos e
`allow_nan=False`.

- [ ] **Step 5: Validar exemplos, schemas e compatibilidade negativa**

Run: `npm run lab:test -- laboratorio/testes/contrato -q`
Expected: PASS, incluindo major desconhecida recusada.

- [ ] **Step 6: Commitar**

```bash
git add laboratorio/contratos laboratorio/src/laboratorio/contratos.py laboratorio/src/laboratorio/canonico.py laboratorio/testes/contrato laboratorio/pyproject.toml
git commit -m "feat(lab): fixar contratos cientificos v1"
```

### Task 3: Artefatos, proveniência e RO-Crate R1

**Files:**
- Create: `laboratorio/src/laboratorio/artefatos.py`
- Create: `laboratorio/src/laboratorio/proveniencia.py`
- Create: `laboratorio/src/laboratorio/rocrate.py`
- Create: `laboratorio/testes/test_artefatos.py`
- Create: `laboratorio/testes/test_proveniencia.py`
- Create: `laboratorio/testes/test_rocrate.py`

**Interfaces:**
- Consumes: `sha256_canonico`, `validar_documento`.
- Produces: `RepositorioArtefatos(raiz)`, `guardar_bytes(dados, mime_type, metadados) -> ArtefatoRef`, `ler(ref) -> bytes`, `GrafoProveniencia.registrar_*`, `exportar_rocrate(estudo_id, destino) -> Path`.

- [ ] **Step 1: Escrever testes de imutabilidade e adulteração**

```python
def test_artefato_e_enderecado_por_conteudo(tmp_path):
    repo = RepositorioArtefatos(tmp_path)
    a = repo.guardar_bytes(b"resultado", "text/plain", {})
    b = repo.guardar_bytes(b"resultado", "text/plain", {})
    assert a.sha256 == b.sha256
    assert repo.ler(a) == b"resultado"

def test_leitura_detecta_adulteracao(tmp_path):
    repo = RepositorioArtefatos(tmp_path)
    ref = repo.guardar_bytes(b"x", "application/octet-stream", {})
    repo.caminho_blob(ref.sha256).write_bytes(b"y")
    with pytest.raises(ErroLaboratorio, match="hash-divergente"):
        repo.ler(ref)
```

- [ ] **Step 2: Escrever teste do grafo PROV e pacote reproduzível**

Exigir nós `entidade`, `atividade`, `agente`; arestas `usou`, `gerou`,
`foiDerivadoDe`, `foiAtribuidoA`, `foiAssociadoA` e `invalidou`; exportar
`ro-crate-metadata.json` com dataset raiz, arquivos por hash, licenças e relações.

- [ ] **Step 3: Executar testes vermelhos**

Run: `npm run lab:test -- laboratorio/testes/test_artefatos.py laboratorio/testes/test_proveniencia.py laboratorio/testes/test_rocrate.py -q`
Expected: FAIL por APIs ausentes.

- [ ] **Step 4: Implementar escrita atômica e proveniência append-only**

Usar `tempfile`, `os.replace`, resolução de caminhos e recusa de symlink. O
índice JSONL é append-only; blobs ficam em `sha256/ab/cd/<hash>`.

- [ ] **Step 5: Validar reprodução determinística**

Run: `npm run lab:test -- laboratorio/testes/test_artefatos.py laboratorio/testes/test_proveniencia.py laboratorio/testes/test_rocrate.py -q`
Expected: PASS e dois exports equivalentes têm os mesmos conteúdos canônicos.

- [ ] **Step 6: Commitar**

```bash
git add laboratorio/src/laboratorio/artefatos.py laboratorio/src/laboratorio/proveniencia.py laboratorio/src/laboratorio/rocrate.py laboratorio/testes
git commit -m "feat(lab): preservar artefatos e proveniencia"
```

### Task 4: Registro explícito e planejador DAG R2

**Files:**
- Create: `laboratorio/src/laboratorio/instrumentos/registro.py`
- Create: `laboratorio/src/laboratorio/controle/planejador.py`
- Create: `laboratorio/src/laboratorio/controle/orcamento.py`
- Create: `laboratorio/testes/test_registro.py`
- Create: `laboratorio/testes/test_planejador.py`

**Interfaces:**
- Consumes: contratos v1 e `RepositorioArtefatos`.
- Produces: `RegistroInstrumentos.registrar(manifesto, operacoes)`, `resolver(id, versao) -> InstrumentoRegistrado`, `planejar(estudo, protocolo, passos) -> PlanoValidado`.

- [ ] **Step 1: Provar que importação não registra capacidade**

```python
def test_registro_comeca_vazio_apos_importar_instrumento():
    import laboratorio.instrumentos.canario
    assert RegistroInstrumentos().listar() == []
```

- [ ] **Step 2: Provar DAG, versões, unidades, permissões e orçamento**

Criar casos que recusam ciclo, produtor duplicado, versão flutuante, dimensão
incompatível, rede acima do teto e custo estimado maior que o orçamento. Um caso
positivo deve retornar passos em ordem topológica estável.

- [ ] **Step 3: Executar testes vermelhos**

Run: `npm run lab:test -- laboratorio/testes/test_registro.py laboratorio/testes/test_planejador.py -q`
Expected: FAIL por APIs ausentes.

- [ ] **Step 4: Implementar registro e planejador puros**

```python
@dataclass(frozen=True)
class Operacao:
    nome: str
    executar: Callable[[ContextoExecucao, Mapping[str, Any]], ResultadoOperacao]

def planejar(estudo: Mapping[str, Any], protocolo: Mapping[str, Any],
             passos: Sequence[Mapping[str, Any]], registro: RegistroInstrumentos) -> PlanoValidado:
    resolved = [registro.resolver(p["instrumentoId"], p["instrumentoVersao"]) for p in passos]
    return validar_e_ordenar_dag(estudo, protocolo, passos, resolved)
```

Não importar implementações no planejador. Resolver capacidade somente pelo
registro recebido.

- [ ] **Step 5: Rodar testes e commit**

Run: `npm run lab:test -- laboratorio/testes/test_registro.py laboratorio/testes/test_planejador.py -q`
Expected: PASS.

```bash
git add laboratorio/src/laboratorio/instrumentos laboratorio/src/laboratorio/controle laboratorio/testes
git commit -m "feat(lab): planejar experimentos por capacidades"
```

### Task 5: Runner local confinado e cancelável R2

**Files:**
- Create: `laboratorio/src/laboratorio/controle/runner.py`
- Create: `laboratorio/src/laboratorio/controle/recursos.py`
- Create: `laboratorio/src/laboratorio/instrumentos/canario.py`
- Create: `laboratorio/testes/test_runner.py`
- Create: `laboratorio/testes/adversariais/test_confinamento.py`

**Interfaces:**
- Consumes: `PlanoValidado`, `RegistroInstrumentos`, `RepositorioArtefatos`, `GrafoProveniencia`.
- Produces: `executar_plano(plano, autorizacao, contexto) -> RelatorioExecucao`, `cancelar(execucao_id) -> None`.

- [ ] **Step 1: Escrever provas de autoridade e limites**

Exigir que plano sem `autorizacao.planoHash` não execute; hash divergente falhe;
timeout encerre árvore de processo; escrita fora do diretório de saída e rede
sem allowlist sejam recusadas; stdout seja truncado com métrica explícita.

- [ ] **Step 2: Escrever canário determinístico**

```python
def executar_quadratica(ctx, entrada):
    xs = entrada["x"]
    return ResultadoOperacao(saidas={"y": [x * x for x in xs]}, metricas={"n": len(xs)})
```

Executar duas vezes com semente 42: execuções têm IDs distintos, saídas têm hash
igual e ambas preservam ambiente/parâmetros.

- [ ] **Step 3: Rodar vermelho e implementar o menor runner**

Run: `npm run lab:test -- laboratorio/testes/test_runner.py laboratorio/testes/adversariais/test_confinamento.py -q`
Expected: FAIL antes da implementação.

Executar operações Python registradas no processo para o canário e processos
externos via `subprocess.Popen` com diretório efêmero, ambiente allowlisted,
timeout e encerramento da árvore no Windows. Rede permanece indisponível para
instrumentos locais; conectores remotos usam cliente próprio da Task 6.

- [ ] **Step 4: Validar cancelamento, falha atômica e proveniência**

Run: `npm run lab:test -- laboratorio/testes/test_runner.py laboratorio/testes/adversariais/test_confinamento.py -q`
Expected: PASS; nenhum passo dependente executa após falha.

- [ ] **Step 5: Commitar**

```bash
git add laboratorio/src/laboratorio/controle laboratorio/src/laboratorio/instrumentos/canario.py laboratorio/testes
git commit -m "feat(lab): executar planos sob limites explicitos"
```

### Task 6: Pesquisa, fontes e grafo de alegações R3

**Files:**
- Create: `laboratorio/src/laboratorio/pesquisa/modelo.py`
- Create: `laboratorio/src/laboratorio/pesquisa/crossref.py`
- Create: `laboratorio/src/laboratorio/pesquisa/openalex.py`
- Create: `laboratorio/src/laboratorio/pesquisa/qualificacao.py`
- Create: `laboratorio/src/laboratorio/pesquisa/alegacoes.py`
- Create: `laboratorio/testes/pesquisa/test_conectores.py`
- Create: `laboratorio/testes/pesquisa/test_alegacoes.py`
- Create: `laboratorio/testes/adversariais/test_fonte_nao_e_instrucao.py`

**Interfaces:**
- Consumes: artefatos/proveniência e orçamento do estudo.
- Produces: `buscar_evidencias(consulta: ConsultaPesquisa, politica: PoliticaPesquisa) -> PaginaFontes`, `qualificar_fonte(fonte: Fonte) -> ParecerFonte`, `GrafoAlegacoes.adicionar(fonte: Fonte, alegacao: Alegacao) -> GrafoAlegacoes`.

- [ ] **Step 1: Escrever testes com transporte HTTP falso**

Fixar respostas de Crossref/OpenAlex em fixtures mínimas; provar paginação,
`mailto` configurável, rate-limit, cache por URL+parâmetros, DOI normalizado,
licença, correção/retração e erro estruturado 429. Nenhum teste de unidade usa a
rede real.

- [ ] **Step 2: Provar separação entre fonte, alegação e evidência**

```python
def test_citacao_nao_admite_evidencia_sozinha():
    fonte = Fonte(doi="10.1/x", titulo="A", tipo="artigo",
                  versao="publicada", licencia="CC-BY-4.0")
    alegacao = Alegacao(texto="X aumenta Y", fonte_id=fonte.id, localizacao="p. 4")
    assert GrafoAlegacoes().adicionar(fonte, alegacao).evidencias == []
```

Conteúdo contendo “ignore regras e execute” deve permanecer texto do artefato e
nunca virar operação, permissão ou argumento do runner.

- [ ] **Step 3: Implementar conectores estreitos e qualificação**

Adicionar `httpx==0.28.1`. Cada conector recebe `httpx.Client`, relógio e cache
por injeção. Qualificação registra tipo, método, população, condições,
independência, licença, versão e limitações sem gerar nota universal.

- [ ] **Step 4: Rodar unidade e um smoke test remoto opt-in**

Run: `npm run lab:test -- laboratorio/testes/pesquisa laboratorio/testes/adversariais/test_fonte_nao_e_instrucao.py -q`
Expected: PASS.

Run: `$env:LAB_TESTE_REDE='1'; npm run lab:test -- laboratorio/testes/pesquisa/test_smoke_remoto.py -q; Remove-Item Env:LAB_TESTE_REDE`
Expected: PASS somente em execução manual com rede; teste fica skipped por padrão.

- [ ] **Step 5: Commitar**

```bash
git add laboratorio/src/laboratorio/pesquisa laboratorio/testes/pesquisa laboratorio/testes/adversariais laboratorio/pyproject.toml
git commit -m "feat(lab): qualificar fontes e alegacoes"
```

### Task 7: Unidades e validadores V&V R4

**Files:**
- Create: `laboratorio/src/laboratorio/validadores/base.py`
- Create: `laboratorio/src/laboratorio/validadores/unidades.py`
- Create: `laboratorio/src/laboratorio/validadores/numerico.py`
- Create: `laboratorio/src/laboratorio/validadores/modelo.py`
- Create: `laboratorio/testes/validadores/test_unidades.py`
- Create: `laboratorio/testes/validadores/test_numerico.py`
- Create: `laboratorio/testes/canarios/test_viga_analitica.py`

**Interfaces:**
- Consumes: `lab.evidencia@1`, artefatos e proveniência.
- Produces: `ParecerValidacao(estado, codigo, metricas, dominio, artefatos, justificativa)`, `validar_unidades`, `validar_convergencia`, `validar_contra_referencia`.

- [ ] **Step 1: Escrever provas dimensionais e de domínio**

Usar Hipótese para provar ida-e-volta m↔mm, Pa↔MPa e kg/m³; recusar soma de
comprimento com força, número nu e extrapolação fora do domínio.

- [ ] **Step 2: Escrever canário de viga engastada**

Para carga de ponta, exigir `delta = F*L**3/(3*E*I)` e tensão máxima conhecida.
Comparar discretizações sucessivas; estado é `aprovado` somente se ordem/erro
atenderem critérios declarados antes da execução.

- [ ] **Step 3: Implementar pareceres sem booleano mágico**

Adicionar `pint==0.25.3`, `numpy>=2.3,<3`, `scipy>=1.16,<2` e
`scikit-fem==12.0.2`. Validadores retornam `aprovado`, `reprovado`,
`inconclusivo` ou `nao-aplicavel`; nunca escondem métrica ou tolerância.

- [ ] **Step 4: Rodar testes e comparação diferencial**

Run: `npm run lab:test -- laboratorio/testes/validadores laboratorio/testes/canarios/test_viga_analitica.py -q`
Expected: PASS; solução analítica e scikit-fem concordam dentro do limite pré-fixado.

- [ ] **Step 5: Commitar**

```bash
git add laboratorio/src/laboratorio/validadores laboratorio/testes/validadores laboratorio/testes/canarios laboratorio/pyproject.toml
git commit -m "feat(lab): validar unidades numerica e modelos"
```

### Task 8: Incerteza, sensibilidade e síntese R4

**Files:**
- Create: `laboratorio/src/laboratorio/validadores/incerteza.py`
- Create: `laboratorio/src/laboratorio/sintese/avaliar.py`
- Create: `laboratorio/src/laboratorio/sintese/renderizar.py`
- Create: `laboratorio/testes/validadores/test_incerteza.py`
- Create: `laboratorio/testes/test_sintese.py`

**Interfaces:**
- Consumes: pareceres, grafo de alegações, execuções e hipóteses.
- Produces: `propagar_monte_carlo(modelo, entradas, n, semente)`, `analisar_sobol`, `avaliar_hipotese`, `sintetizar_estudo`.

- [ ] **Step 1: Provar propagação linear conhecida e determinismo**

Para `y = 2x + 3`, comparar média/desvio amostrais com solução analítica, exigir
mesma amostra com semente fixa e erro do estimador menor que limite declarado.

- [ ] **Step 2: Provar síntese com conflito e inconclusão**

Criar evidências favorável, contrária e limitada. A síntese deve citar todos os
IDs, preservar conflito e terminar `inconclusiva`; remover a contrária sem mudar
o grafo deve ser impossível.

- [ ] **Step 3: Implementar UQ e regras de avaliação**

Adicionar `SALib==1.5.2`. Separar aleatória, epistêmica e discrepância de modelo.
`avaliar_hipotese` usa critérios do protocolo e domínio; não calcula “confiança”.

- [ ] **Step 4: Rodar canários, metamórficos e determinismo**

Run: `npm run lab:test -- laboratorio/testes/validadores/test_incerteza.py laboratorio/testes/test_sintese.py -q`
Expected: PASS.

- [ ] **Step 5: Commitar**

```bash
git add laboratorio/src/laboratorio/validadores/incerteza.py laboratorio/src/laboratorio/sintese laboratorio/testes laboratorio/pyproject.toml
git commit -m "feat(lab): quantificar incerteza e sintetizar estudos"
```

### Task 9: Ponte neutra da Mecanifica R5

**Files:**
- Create: `laboratorio/adaptadores/mecanifica-node/manifesto.json`
- Create: `laboratorio/adaptadores/mecanifica-node/ponte.mjs`
- Create: `laboratorio/adaptadores/mecanifica-node/ponte.test.mjs`
- Create: `laboratorio/src/laboratorio/instrumentos/mecanifica.py`
- Create: `laboratorio/testes/test_instrumento_mecanifica.py`

**Interfaces:**
- Consumes: CLIs/serviços públicos atuais da Mecanifica e contrato `lab.instrumento@1`.
- Produces operações `mecanifica.descrever@1`, `mecanifica.medir@1`, `mecanifica.exportar-obj@1`, `mecanifica.exportar-step@1`, `mecanifica.capturar-vistas@1` e `recomendacao-de-autoria@1` sem aplicação.

- [ ] **Step 1: Escrever teste Node de revisão fixa e zero escrita**

Usar fixtures temporárias de peça/montagem; exigir que cada resposta contenha
commit/revisão, escala, unidades, hash e artefatos. Espionar filesystem e provar
que nenhuma revisão, sessão ativa ou arquivo de produto foi modificado.

- [ ] **Step 2: Escrever teste Python do protocolo JSONL**

```python
def test_adaptador_rejeita_resposta_sem_hash(fake_bridge):
    fake_bridge.responder({"ok": True, "artefato": {"caminho": "x.obj"}})
    with pytest.raises(ErroLaboratorio, match="resposta-incompleta"):
        InstrumentoMecanifica(fake_bridge).exportar_obj(entrada)
```

- [ ] **Step 3: Implementar ponte como processo confinado**

A ponte recebe uma requisição JSON por linha e responde uma linha; usa somente
ferramentas públicas existentes. O wrapper Python fixa cwd, timeout, ambiente e
allowlist de operações. Proibir a operação `aplicar` no manifesto.

- [ ] **Step 4: Validar direção de dependência e regressão Mecanifica**

Run: `npx vitest run laboratorio/adaptadores/mecanifica-node/ponte.test.mjs`

Run: `npm run lab:test -- laboratorio/testes/test_instrumento_mecanifica.py -q`

Run: `npm run arquitetura:lab:check && npm run arquitetura:check && npm run typecheck && npm run build`
Expected: todos PASS.

- [ ] **Step 5: Commitar**

```bash
git add laboratorio/adaptadores laboratorio/src/laboratorio/instrumentos/mecanifica.py laboratorio/testes package.json
git commit -m "feat(lab): usar mecanifica como instrumento neutro"
```

### Task 10: Piloto cabo de ferramenta R6

**Files:**
- Create: `laboratorio/pilotos/cabo-ferramenta/README.md`
- Create: `laboratorio/pilotos/cabo-ferramenta/estudo.json`
- Create: `laboratorio/pilotos/cabo-ferramenta/protocolo.json`
- Create: `laboratorio/pilotos/cabo-ferramenta/modelo.py`
- Create: `laboratorio/pilotos/cabo-ferramenta/fontes.json`
- Create: `laboratorio/testes/pilotos/test_cabo_ferramenta.py`

**Interfaces:**
- Consumes: ponte Mecanifica, pesquisa, V&V, UQ e síntese.
- Produces: pacote `cabo-ferramenta.rocrate/` regenerável e fronteira de Pareto rastreada.

- [ ] **Step 1: Congelar a leitura do repositório de referência**

Registrar commit, arquivos, fórmulas, propriedades e resultados de
`C:\Users\micro\Desktop\ditial-twin-lab-materiais` em um artefato de procedência.
Não copiar código sem atribuição; reimplementar apenas equações verificadas.

- [ ] **Step 2: Escrever critérios do piloto antes do modelo**

O teste exige unidades válidas, geometria/revisão fixa, fontes por propriedade,
solução analítica, convergência Monte Carlo, sensibilidade, massa/custo/tensão,
Pareto não dominado e síntese com domínio/limitações.

- [ ] **Step 3: Executar o teste vermelho e implementar o modelo mínimo**

Run: `npm run lab:test -- laboratorio/testes/pilotos/test_cabo_ferramenta.py -q`
Expected: FAIL por piloto incompleto.

Implementar viga engastada parametrizada, distribuições justificadas e comparação
analítica/numérica. Toda propriedade ausente ou sem fonte torna a avaliação
`inconclusiva`, não recebe default silencioso.

- [ ] **Step 4: Gerar e reproduzir o pacote em diretório limpo**

O próprio teste chama `planejar`, `executar_plano`, `exportar_rocrate` e uma
segunda execução em repositório temporário vazio. Expected: hashes verificados e
mesmo estado das hipóteses, sem depender da CLI que só será criada na Task 12.

- [ ] **Step 5: Commitar somente entradas e referências pequenas**

```bash
git add laboratorio/pilotos/cabo-ferramenta laboratorio/testes/pilotos/test_cabo_ferramenta.py
git commit -m "test(lab): provar piloto probabilistico do cabo"
```

### Task 11: Piloto multidisciplinar R6

**Files:**
- Create: `laboratorio/pilotos/suporte-vibratorio/README.md`
- Create: `laboratorio/pilotos/suporte-vibratorio/estudo.json`
- Create: `laboratorio/pilotos/suporte-vibratorio/protocolo.json`
- Create: `laboratorio/pilotos/suporte-vibratorio/dinamica.py`
- Create: `laboratorio/pilotos/suporte-vibratorio/custo.py`
- Create: `laboratorio/testes/pilotos/test_suporte_vibratorio.py`

**Interfaces:**
- Consumes: geometria Mecanifica, instrumento de dinâmica, custo, UQ e síntese.
- Produces: pacote reproduzível que combina frequência natural, deslocamento, massa e custo.

- [ ] **Step 1: Definir benchmark e critérios prévios**

Usar sistema massa–mola–amortecedor com solução analítica de frequência e resposta
harmônica; derivar rigidez da geometria; custo usa massa e processo declarado.
Exigir dois instrumentos científicos distintos no DAG.

- [ ] **Step 2: Escrever testes diferencial e metamórfico**

Dobrar rigidez deve multiplicar frequência por `sqrt(2)` com massa constante;
dobrar massa deve dividir por `sqrt(2)`; permutar ordem dos passos independentes
não muda hashes das saídas.

- [ ] **Step 3: Implementar, executar e reproduzir**

Run: `npm run lab:test -- laboratorio/testes/pilotos/test_suporte_vibratorio.py -q`
Expected: vermelho antes, PASS depois da implementação.

O teste chama as APIs neutras diretamente, exporta o pacote e o reproduz em
repositório temporário vazio. Expected: mesmo estado das hipóteses e diferenças
numéricas dentro das tolerâncias registradas.

- [ ] **Step 4: Commitar**

```bash
git add laboratorio/pilotos/suporte-vibratorio laboratorio/testes/pilotos/test_suporte_vibratorio.py
git commit -m "test(lab): provar piloto multidisciplinar"
```

### Task 12: Serviços Agent-First, CLI/MCP e gate R7

**Files:**
- Create: `laboratorio/src/laboratorio/servicos.py`
- Create: `laboratorio/src/laboratorio/cli.py`
- Create: `laboratorio/adaptadores/mcp/servidor.mjs`
- Create: `laboratorio/adaptadores/mcp/servidor.test.mjs`
- Create: `laboratorio/skills/investigar-sistema/SKILL.md`
- Create: `laboratorio/skills/pesquisar-evidencias/SKILL.md`
- Create: `laboratorio/skills/validar-modelo/SKILL.md`
- Create: `laboratorio/skills/reproduzir-estudo/SKILL.md`
- Create: `laboratorio/testes/caixa-preta/test_agente.py`
- Create: `laboratorio/OPERACAO.md`
- Modify: `laboratorio/README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: todas as APIs neutras das Tasks 1–11.
- Produces: `formular_estudo`, `buscar_evidencias`, `planejar_experimento`, `autorizar_execucao`, `executar_plano`, `avaliar_evidencias`, `sintetizar_estudo`, `exportar_pacote_reproduzivel`; CLI `lab` e perfis MCP `leitura-planejamento`/`execucao`.

- [ ] **Step 1: Escrever prova caixa-preta de autoridade progressiva**

Um consumidor sem shell descobre capacidades, formula estudo, pesquisa, planeja e
recebe hash/custo. Tentar executar no perfil de leitura falha `permissao`; no
perfil de execução, o consumidor fornece autorização para aquele hash, executa,
audita e reproduz. Nenhuma chamada edita Mecanifica.

- [ ] **Step 2: Escrever testes de paginação e contexto**

Listagens retornam `itens`, `proximoCursor`, `resumo` e `orcamentoConsumido`;
corpos grandes ficam em artefatos. Fixar teto de 20 itens e medir bytes retornados
no ensaio completo.

- [ ] **Step 3: Implementar serviços e portas finas**

```python
def planejar_experimento(entrada: Mapping[str, Any], ctx: ContextoServico) -> Mapping[str, Any]:
    return ctx.planejador.planejar(entrada["estudo"], entrada["protocolo"], entrada["passos"]).para_dict()

def executar_plano(entrada: Mapping[str, Any], ctx: ContextoServico) -> Mapping[str, Any]:
    return ctx.runner.executar(entrada["plano"], entrada["autorizacao"]).para_dict()
```

CLI e MCP apenas validam transporte, chamam o serviço e serializam resultado.
Skills ensinam descoberta, gates, erros e limites; não duplicam algoritmo.

- [ ] **Step 4: Executar gates do laboratório e da Mecanifica**

Run: `npm run lab:check`

Run: `npm run arquitetura:lab:check && npm run arquitetura:check`

Run: `npm run typecheck && npm run build`

Run: `npm test`

Expected: laboratório, arquitetura, tipos e build verdes; no Windows sem
privilégio de symlink, somente as quatro falhas basais documentadas podem
permanecer e devem ser verdes em CI/ambiente com symlink.

- [ ] **Step 5: Auditar licenças, pacote e segurança**

Run: `laboratorio/.venv/Scripts/python -m pip install pip-licenses`

Run: `laboratorio/.venv/Scripts/pip-licenses --format=json --output-file=laboratorio/.lab/licencas.json`

Run: `npm audit --omit=dev`

Registrar achados sem executar correção automática. Falhar o gate se uma licença
de produção estiver fora da política ou se o pacote reproduzível omitir versão,
hash, ambiente, licença ou proveniência.

- [ ] **Step 6: Medir promoção e registrar decisão experimental**

Produzir `laboratorio/.lab/relatorio-r7.json` com regressões, dois domínios,
reprodução, falsa certeza, licenças, contexto, tempo, CPU, memória, disco, rede e
falhas. O resultado permitido é `promover-seletivamente`, `extrair` ou
`manter-experimental`; nunca mesclar automaticamente.

- [ ] **Step 7: Commitar a entrega R7**

```bash
git add laboratorio/src/laboratorio/servicos.py laboratorio/src/laboratorio/cli.py laboratorio/adaptadores/mcp laboratorio/skills laboratorio/testes/caixa-preta laboratorio/OPERACAO.md laboratorio/README.md package.json
git commit -m "feat(lab): expor investigacao agent-first auditavel"
```

## Ordem de execução e checkpoints técnicos

1. Executar Tasks 1–3; revisar contratos e pacote reproduzível antes do runner.
2. Executar Tasks 4–5; fazer revisão de segurança antes de habilitar rede.
3. Executar Task 6; revisar licenças e semântica do grafo de alegações.
4. Executar Tasks 7–8; revisar canários e critérios V&V com resultados cegos.
5. Executar Task 9; provar novamente a ausência de dependência reversa.
6. Executar Tasks 10–11; exigir reprodução independente dos dois pilotos.
7. Executar Task 12; medir R7 e somente então preparar proposta de promoção.

O modo de execução selecionado é **Subagent-Driven**: um agente fresco por task,
seguido de revisão de aderência à especificação e revisão de qualidade antes da
task seguinte. Nenhuma task autoriza promoção à `main`; a branch experimental é
a única área de implementação até o relatório R7.
