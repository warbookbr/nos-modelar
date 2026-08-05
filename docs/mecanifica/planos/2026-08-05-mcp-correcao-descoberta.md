# MCP — correção de descoberta de pacotes e revisões

**Estado:** ativo

**Responsável:** GPT (coordenação e revisão) e Claude/brigsd (implementação e prova)

**Repositório e base:** `warbookbr/nos-mecanifica`, `ddfe96de77958d75b390e03be78acd7cdad3716b`

**Programa:** `docs/mecanifica/planos/mcp/INDEX.md`

**Canal de evidências:** [issue #18](https://github.com/warbookbr/nos-mecanifica/issues/18)

**Achado de origem:** `AVAL-01`, diagnosticado na rodada R02.

**Arquivos reservados:** este plano,
`docs/mecanifica/planos/2026-08-05-mcp-avaliacao-consolidada.md`,
`docs/mecanifica/planos/README.md`, `docs/mecanifica/planos/mcp/INDEX.md`,
`tools/mcp/servidor.mjs`, `tools/mcp/contratos.mjs`,
`tools/mcp/perfis/revisao.mjs`, `tools/modelagem/formato-pacote.mjs`,
`tools/modelagem/validar-pacote.mjs`, `tools/mcp/mcp.test.mjs` e
`docs/uso/MAPA.md` quando regenerado. Outros arquivos exigem decisão explícita.

## Problema observado

As ferramentas `validar_pacote` e `comparar_revisoes` exigem um `id` de pacote;
a segunda também exige duas revisões. Os schemas informam apenas o formato dos
valores, e os dois recursos atuais não publicam quais pacotes e revisões existem.
Como o namespace de pacote não deriva do nome da peça, um consumidor novo só
consegue prosseguir por adivinhação ou leitura direta do repositório.

## Resultado

Adicionar uma única fonte oficial, somente leitura e determinística, que permita
a um consumidor MCP descobrir pacotes e revisões utilizáveis e então chamar as
duas ferramentas existentes sem fallback, tentativa combinatória ou acesso
direto aos arquivos.

## Hipótese

Um terceiro recurso MCP, aditivo e consultado sob demanda, resolve `AVAL-01`
sem alterar os quatro schemas de ferramentas, sem introduzir um quinto tool e
sem modificar serviços de modelagem ou renderização.

## Contrato aprovado

Registrar o recurso `mecanifica://pacotes`, com conteúdo `application/json` e
corpo canônico:

```json
{
  "formato": "mecanifica.catalogo-pacotes",
  "versao": 1,
  "pacotes": [
    {
      "id": "homologacao-mancal",
      "revisoes": ["r001", "r002"]
    }
  ]
}
```

Regras:

- `pacotes` é ordenado por `id` em ordem lexicográfica;
- `revisoes` é ordenado lexicograficamente e aceita apenas nomes `^r[0-9]+$`;
- cada pacote publicado precisa corresponder a uma pasta confinada em
  `RAIZ_PACOTES`, com `briefing.json` e `referencias.json` oficiais;
- cada revisão publicada precisa conter `revisao.json` legível como JSON na rota
  oficial que `comparar_revisoes` já consome;
- entradas inválidas, symlinks ou caminhos fora da raiz são ignorados de modo
  fail-closed, sem vazar caminhos absolutos;
- a saída não inclui conteúdo dos briefings, referências ou revisões;
- as quatro ferramentas e seus `inputSchema`/`outputSchema` permanecem iguais;
- o contrato global `mecanifica.mcp.revisao.v2` não recebe bump, pois a mudança é
  aditiva; o novo recurso possui seu próprio formato versionado.

## Implementação incluída

- extrair ou criar uma função reutilizável para listar o catálogo oficial sem
  duplicar regras de confinamento e rotas;
- registrar `mecanifica://pacotes` no servidor;
- atualizar a capacidade publicada para indicar descoberta de pacotes/revisões;
- testar ordenação, filtragem, confinamento e conteúdo mínimo;
- provar por cliente MCP real o fluxo recurso → `validar_pacote` →
  `comparar_revisoes`;
- atualizar documentação e mapa gerado estritamente quando exigido pelos gates.

## Excluído

- alterar assinatura ou semântica das quatro ferramentas atuais;
- criar `listar_pacotes` como nova ferramenta;
- autoria, escrita, materiais, Git, HTTP, autenticação ou múltiplos clientes;
- corrigir pacotes ou revisões existentes;
- expor conteúdo interno, caminhos locais, hashes não necessários ou metadados
  além de `id` e revisões;
- qualquer mudança no motor de renderização.

## Invariantes

- o recurso é somente leitura e não cria, modifica ou normaliza arquivos;
- nenhuma descoberta depende de nomes conhecidos codificados no servidor;
- a lista é derivada da raiz oficial em cada leitura ou por mecanismo igualmente
  consistente com mudanças no disco;
- resultados são determinísticos para o mesmo estado do repositório;
- erros internos não revelam caminhos absolutos;
- clientes que ignoram o novo recurso continuam funcionando;
- nenhuma etapa de autoria abre automaticamente após esta correção.

## Gates

1. `resources/list` anuncia exatamente três recursos, incluindo
   `mecanifica://pacotes`;
2. a leitura retorna `formato`, `versao` e `pacotes` no contrato aprovado;
3. pacotes e revisões aparecem em ordem determinística;
4. fixtures inválidas, caminhos escapando da raiz e revisões sem JSON oficial não
   aparecem no catálogo;
5. um teste MCP real descobre um pacote pelo recurso e executa
   `validar_pacote` sem adivinhar;
6. o mesmo teste descobre duas revisões do mesmo pacote e executa
   `comparar_revisoes` sem ler o repositório diretamente;
7. as quatro ferramentas continuam anunciadas com schemas inalterados;
8. testes unitários, integração MCP, mapa, índices, links e `planos:check` passam;
9. nenhum arquivo de pacote, revisão ou imagem é escrito pelo teste;
10. Claude registra a prova na issue #18 como rodada pareada, com chamadas,
    resultados, fallback, escrita e atritos.

## Parada

Parar e registrar `[BLOQUEIO]` se a solução exigir alterar schemas existentes,
expor conteúdo sensível, criar escrita, aceitar caminhos não confinados, mudar os
serviços subjacentes ou ampliar o escopo além de descoberta.

Falhas encontradas fora de `AVAL-01` não são corrigidas nesta branch; recebem
achado e decisão separados.

## Fechamento

Depois do merge e da prova caixa-preta, registrar decisão explícita de `aprovar`,
`corrigir` ou `interromper`. Atualizar este plano, README e painel. Somente uma
decisão positiva sobre o Módulo 1 pode permitir discutir a etapa seguinte; ela
não fica autorizada por implicação.
