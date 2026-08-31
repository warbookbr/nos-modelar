# Exportação CAD/STEP modular

**Estado:** concluído

**Decisão:** aprovar

**Responsável:** Codex

**Repositório e base:** cópia local de `nos_mecanica`, `main` em
`bb2e79ab565e4b4d1851dadaf247b0062ac2aa8c`

**Dossiê técnico:**
[`../DOSSIE-EXPORTACAO-CAD-STEP.md`](../DOSSIE-EXPORTACAO-CAD-STEP.md)

## Problema observado

As receitas já produzem uma malha neutra determinística por
`src/autoria/executar-receita.js`, e o exportador atual materializa essa saída
como JSON. Não existe uma fronteira para gerar STEP utilizável em FreeCAD,
SolidWorks ou Inventor.

O requisito real de STEP reabre somente para exportação a condição registrada
no plano histórico do chassi, onde OCCT/B-rep foi rejeitado por falta de demanda
de fabricação. A representação de autoria e o núcleo continuam poligonais.

Converter a malha final em STEP facetado e reexecutar a receita como B-rep
paramétrico são trabalhos diferentes. Este plano entrega apenas o primeiro e
produz evidência para decidir o segundo.

## Resultado

Uma receita válida pode ser exportada por CLI para STEP facetado, com unidade e
tolerância explícitas, sólidos fechados, nomes semânticos e diagnóstico
estruturado, sem alterar núcleo, receitas, bancada ou exportação JSON.

## Arquitetura

```text
receita -> executarReceita() -> malha neutra V/F
        -> módulo exportador-cad -> kernel confinado -> bytes STEP
```

O módulo em `modulos/exportador-cad/` recebe dados e devolve
`{ bytes, extensao, mime, diagnostico }`. Ele não carrega receitas, não grava
arquivos e não conhece a bancada. A CLI em `tools/mecanifica/exportar-step.mjs`
resolve o caminho, executa a receita e grava atomicamente em
`exportacoes/cad/`, ignorado pelo Git.

O STEP contém um compound de sólidos nomeados. Cada parte é separada em
componentes conexos; cada componente fechado vira um sólido. Isso não é ainda
uma montagem STEP AP242.

## Contrato e recusas

Entrada mínima: `nome`, `neutro`, `formato: 'step'`,
`estrategia: 'facetada'`, `unidade` e `tolerancia`.

Unidades iniciais: `mm`, `cm` e `m`. A CLI converte automaticamente as coordenadas em metros do núcleo procedural para a unidade CAD solicitada (fator padrão 1000 para `mm`, 100 para `cm`, 1 para `m`, com override explícito via `--escala`). Faces
poligonais são trianguladas deterministicamente; curvas continuam facetadas.

O módulo recusa, com identidade disponível: malha vazia, vértice ausente, face
degenerada ou sem parte, borda aberta, orientação incoerente, aresta
não-manifold, componente que não fecha, opção física inválida e reparo acima da
tolerância declarada.

## Filtro Agent-First

| Capacidade | Decisão | Motivo |
|---|---|---|
| `executarReceita()` | **USAR DIRETO** | já entrega resultado neutro explícito |
| malha `V/F` | **ENVOLVER** | precisa de unidade e validação de sólido |
| kernel STEP | **ENVOLVER** | sua API não deve vazar para o agente |
| CLI | **ENVOLVER** | expõe intenção e erros estruturados |
| bancada e MCP | **ADIAR** | dependem da capacidade interna aprovada |
| backend paramétrico | **ADIAR** | exige um segundo executor geométrico |

## Incluído

- prova e escolha do kernel no Windows;
- módulo isolado e contrato versionado;
- validação topológica e separação de corpos;
- STEP facetado de peça com nomes semânticos;
- unidade, escala e tolerância explícitas;
- CLI com escrita atômica e proteção de sobrescrita;
- reimportação, comparação geométrica e ensaio em receita real;
- documentação, licença, métricas e diagnóstico JSON.

## Excluído

- alteração do núcleo ou de receitas existentes;
- superfícies analíticas e backend paramétrico;
- montagem AP242, PMI, GD&T e cotas de fabricação;
- IGES, STL, glTF e formatos proprietários;
- botão na bancada, MCP e publicação automática;
- reparo silencioso de malha inválida;
- animação, esqueleto e poses dinâmicas.

## Invariantes

- o núcleo não importa CAD, OCCT, Three.js ou sistema de arquivos;
- receitas e malha neutra mantêm o resultado atual;
- exportação JSON e leitor do produto não mudam;
- o kernel fica atrás de um adaptador substituível;
- unidade nunca é presumida;
- falha não deixa arquivo parcial;
- identidade deriva de parte/corpo, não da ordem do kernel;
- STEP facetado nunca é anunciado como paramétrico;
- arquivos gerados não entram no Git por padrão.

## Fatias

### R00 — kernel e distribuição

Comparar OpenCascade em WASM/Node, FreeCAD headless e CadQuery. Para cada
candidato: criar, escrever e reimportar cubo e sólido costurado; preservar nome;
medir instalação, inicialização, tempo, memória e determinismo; registrar
licença e abrir o arquivo em verificador independente.

**Gate:** escolher um backend suportado no Windows/Node do projeto ou concluir
`interromper`. Nenhuma dependência reprovada permanece.

### R01 — contrato e validação pura

Criar `mecanifica.exportacao-cad@1`; validar opções e topologia; separar partes
e componentes; ordenar diagnósticos. Cobrir sólido, aberto, não-manifold,
degenerado, multipartes, multicorpos e entrada embaralhada.

**Gate:** entradas equivalentes produzem diagnóstico idêntico sem carregar o
kernel.

### R02 — backend STEP facetado

Triangular faces, compartilhar topologia, costurar cascas, criar sólidos,
nomear corpos e escrever bytes. Liberar recursos nativos mesmo após exceção e
traduzir falhas do kernel para o contrato do módulo.

**Gate:** cubo, prisma, cilindro facetado e multipartes reimportam com quantidade
de sólidos, caixa, área e volume dentro da tolerância.

### R03 — CLI e escrita segura

Criar `npm run exportar:step`; confinar caminho da receita; recusar órfãos;
validar destino; impedir sobrescrita implícita; escrever temporário e renomear;
emitir saída humana ou `--diagnostico=json`; ignorar `exportacoes/cad/`.

**Gate:** sucesso deixa um STEP; qualquer falha deixa zero arquivo parcial.

### R04 — ida e volta e campo

Executar corpus com cubo, cilindro, multipartes, multicorpos, aberto,
não-manifold e uma receita mecânica real sem adaptação favorável. Medir tempo,
memória, tamanho, nomes, corpos, caixa, área, volume e desvio após reimportação.

**Gate:** válidos abrem no backend e em verificador independente; inválidos
falham antes da publicação; a receita original permanece intacta.

### R05 — operação e fechamento

Documentar módulo e CLI, registrar licença e métricas, atualizar índice e mapa,
e decidir `aprovar`, `corrigir` ou `interromper`.

**Gate:** uma sessão nova descobre o comando, exporta a fixture e entende uma
recusa de malha aberta sem ler a implementação.

## Riscos e parada

Parar se: nenhum backend reler o STEP; licença for incompatível; for necessário alterar o núcleo; costura aceitar corpo aberto; tolerância deformar além do declarado; ou o arquivo só abrir no próprio backend. Se o STEP for menos útil que STL, a decisão é `interromper`.

## Continuidade condicionada

Montagens STEP e backend paramétrico abrem em planos próprios após o MVP. Não haverá fallback silencioso para facetado.

## Gate de saída

1. módulo removível sem alterar núcleo, receita ou bancada;
2. dependência confinada, licenciada e suportada;
3. unidade e tolerância explícitas no diagnóstico;
4. peça válida vira STEP reimportável com sólidos e nomes;
5. peça inválida falha antes do destino final;
6. repetição preserva a impressão geométrica reimportada;
7. receita real passa sem tratamento especial;
8. build, arquitetura, testes, mapa, links e `git diff --check` passam;
9. montagem e backend paramétrico permanecem fora ou ganham planos próprios.

## Ativação e fechamento

Ativado em 2026-08-28 e encerrado com decisão **aprovar**.

### Registro de Encerramento (R05)

- **Decisão:** `aprovar` | **Backend:** `occt-wasm@4.3.2` (MIT / LGPL-2.1).
- **Entregas:** `modulos/exportador-cad/` (contrato `mecanifica.exportacao-cad@1`, validação topológica, costura e compound XCAF multi-sólidos) e CLI `tools/mecanifica/exportar-step.mjs` (`npm run exportar:step` com escrita atômica e conversão automática para milímetros).
- **Validação de campo:** `prensa-progressiva/montagem.js` (20 sólidos nomeados, 1.87 MB) validada e renderizada no Siemens Plant Simulation 3D.
- **Gates:** 23 testes em `exportador-cad` e `exportar-step.test.mjs`, `mapa:check`, `docs:links:check`, `docs:toc:check`, `planos:check` e `typecheck` 100% aprovados.
