# Ensaio ponta a ponta — dobradiça de porta

**Estado:** concluído

**Responsável:** Codex

**Base:** `warbookbr/nos-mecanifica`, após o fechamento da plataforma procedural R10.

## Objetivo verificável

Validar ponta a ponta a plataforma entregue no plano R00–R10, criando,
exportando, compondo, auditando e inspecionando uma dobradiça didática
confinada. O conjunto terá três peças:
folha da porta, folha do batente e pino/parafuso central. A prova termina com
duas vistas válidas por peça e pelo conjunto, relações declaradas, auditoria de
interseções, descoberta procedural e relatório causal dos limites encontrados.

## Hipótese

Os contratos atuais permitem que uma IA parta do catálogo de capacidades,
escreva receitas, produza artefatos resolvidos, monte identidades semânticas e
revise o conjunto sem ler o núcleo. O ensaio deve revelar qualquer ruptura
entre essas portas sem transformar a fixture em produto ou peça homologada.

## Régua de ganho real

A análise reconstrói o antes/depois da R00–R10 somente para entender o que a
plataforma passou a permitir. O julgamento combina três dimensões:

1. **praticidade:** menos leitura, tentativas, contexto, caminhos manuais e
   conhecimento interno para chegar a uma receita válida;
2. **assertividade:** diagnósticos causais, identidade estável, cobertura
   explícita, reprodução e recusa segura quando a resposta não é conhecida;
3. **elevação do teto:** capacidade genérica nova ou integração que permita à
   IA enfrentar famílias e montagens mais complexas sem especializar o núcleo.

Trade-offs estão liberados quando medidos e compensados por ganho maior nessas
dimensões. Complexidade, tempo, memória, bundle e superfície de contrato devem
ser registrados; abstração nova, documentação maior ou mais ferramentas não
contam como ganho por si mesmas.

**Ganho real** exige melhora observável no ciclo descobrir → planejar → criar →
inspecionar → diagnosticar → corrigir → revalidar, reutilizável fora da
dobradiça. O teto absoluto orienta a direção; a decisão continua baseada no que
o repositório consegue provar hoje.

## Horizonte aberto da 1.0

Este ensaio é a primeira sonda, não uma enumeração do teto. O programa continua
com um supercarro externo como prova de escala e uma armadura humanoide como
prova de generalidade. Além dos atritos já conhecidos, cada sonda procura
ativamente limites em intenção semântica, planejamento paramétrico, restrições,
percepção visual multimodal, autoavaliação e correção iterativa, hierarquia,
instâncias, materiais e LOD, interoperabilidade, transações, observabilidade,
desempenho e memória de evidências. Categorias novas podem ser incorporadas no
momento em que aparecerem; esta lista também não é fechada.

A dobradiça só autoriza mudanças provadas neste recorte. Os ensaios seguintes
terão planos executivos próprios, para que a busca ampla não enfraqueça gates,
responsabilidade nem causalidade.

## Escopo

- receitas privadas para duas folhas e um pino/parafuso;
- registro explícito, catálogo derivado, busca e hipergrafo de capacidades;
- ao menos uma composição procedural reutilizável;
- extensão nativa confinada ou diagnóstico comprovado de ausência;
- artefato neutro e procedência por operação e composição;
- planejamento estrutural e lacuna persistível quando uma capacidade faltar;
- execução e exportação por serviços oficiais;
- montagem persistida v4 com identidades semânticas e encaixe cilíndrico;
- auditoria geométrica dos três pares e expectativas explícitas;
- descoberta e revisão pelo MCP como consumidor externo;
- auditoria das skills `criar-peca`, `auditar-peca` e `auditar-montagem` contra
  os contratos atuais, mantendo-as concisas e sem documentação duplicada;
- inventário das ferramentas/recursos MCP e avaliação de entradas, diagnósticos,
  schemas e ações sugeridas para um agente sem contexto do repositório;
- revisão de acessibilidade Agent-First: descoberta progressiva, tamanho de
  resposta, IDs semânticos, cobertura explícita e próximo passo acionável;
- registro separado de defeitos de código e melhorias genéricas encontradas;
- duas vistas não cortadas de cada peça e duas do conjunto;
- relatório com acertos, falhas, cobertura e decisão final.

## Invariantes

- nenhuma peça entra em `prototipos/procedural/v3/pecas/` ou no catálogo público;
- nenhuma geometria é homologada nem apresentada como engenharia real;
- núcleo não recebe domínio de dobradiça, Three.js, MCP ou filesystem;
- identidade persistida é semântica; não usa UUID, índice ou posição de passo;
- falha não publica estado parcial e não é escondida para fazer a prova passar;
- câmera, materiais, solver e operações só mudam com evidência e recorte explícito.

## Fora

Cinemática, torque, rosca helicoidal, resistência, tolerância de fabricação,
colisão em movimento e união topológica geral. O pino pode representar um
parafuso funcionalmente, mas o ensaio não promete rosca geométrica.

## Rodadas

1. **R00 — contrato e baseline:** mapear cada entrega R00–R10 para uma prova executável.
2. **R01 — autoria:** criar e exportar as três receitas privadas sem órfãos.
3. **R02 — montagem:** declarar portas, poses, encaixes e expectativas v4.
4. **R03 — revisão:** medir, auditar e capturar duas vistas por alvo.
5. **R04 — caixa-preta:** repetir descoberta e revisão pelo MCP sem ler o núcleo.
6. **R05 — fechamento:** rodar gates completos, comparar cobertura e decidir.

## Gates

1. Três receitas executam e exportam deterministicamente, com faces nomeadas.
2. Registro, catálogo, hipergrafo e busca derivam da mesma configuração.
3. Subgrafo e extensão preservam identidade, tipos, orçamento e procedência.
4. Planejador explica cadeia ou lacuna sem promover capacidade automaticamente.
5. A montagem resolve três identidades e o encaixe cilíndrico declarado.
6. Auditoria cobre 3/3 pares sem inconclusivo não explicado.
7. Cada alvo possui duas capturas PNG válidas, distintas e não cortadas.
8. MCP descobre capacidades e revisa a montagem pelos mesmos serviços puros.
9. Skills e referência gerada concordam com catálogo, schemas e comandos atuais.
10. Ferramentas/recursos MCP permitem descoberta progressiva, diagnóstico e ação
    sem exigir caminhos locais, leitura do núcleo ou respostas excessivas.
11. Toda melhoria aceita generaliza para outras peças/montagens e recebe teste.
12. Remover módulo/extensão gera diagnóstico e zero publicação parcial.
13. Gates completos do `INDEX.md` e `git diff --check` passam.
14. O fechamento compara antes/depois, custo e ganho nas três dimensões da régua.

## Parada e decisão

Parar se a prova exigir alterar geometria pública, inventar solver/cinemática ou
contornar uma recusa do núcleo. O fechamento será `aprovar`, `corrigir` ou
`cancelar`, com evidência reproduzível e próximos recortes separados.

## Fechamento

**Decisão: aprovar.** As três receitas privadas executam, descrevem, exportam e
reabrem pelas portas oficiais; a montagem v4 satisfaz 3/3 relações cilíndricas,
a auditoria cobre 3/3 pares e oito vistas passam. A sonda corrigiu a propagação
oficial de composições e transformou as 32 operações em contratos de uso
descobríveis e executáveis, com paginação MCP, saídas tipadas e diagnósticos
seguros. A baseline R00 permaneceu byte-idêntica.

O custo aceito foi +22,98 kB minificado/+7,70 kB gzip no build; catálogo,
hipergrafo, busca e plano padrão ficaram menores. A suíte integral passou em 83
arquivos: 1.040 testes aprovados, dois ignorados previstos e zero falha. O
relatório causal está em `../RELATORIO-ENSAIO-DOBRADICA-1-0.md`.

A continuidade foi aberta no plano de sonda do supercarro 1.0. Ele testa escala
e apresentação sem reabrir este recorte nem publicar as peças da dobradiça.
