# Crítica visual — contrato do achado e casos aplicados

Consulta, não leitura de partida. O protocolo que se lê ANTES de julgar forma
está em [`REFERENCIA-E-CRITICA-VISUAL.md`](REFERENCIA-E-CRITICA-VISUAL.md) e no
[`LACO-VISUAL.md`](LACO-VISUAL.md). Aqui ficam as três coisas que só se abrem
quando a tarefa pede: o formato JSON de um achado reexecutável, o caso aplicado
da roda dianteira e a regra de quando um guia vira skill.

Elas saíram do protocolo porque ele é leitura obrigatória antes de gerar forma, e
um esquema de serialização não é coisa que se leia para decidir uma proporção.

## Contrato mínimo de achado reexecutável

`mecanifica.critica-modelagem` continua sendo o formato histórico de crítica
ligado a uma revisão de peça e a um checklist. Para observações que precisam
atravessar peças, montagens e domínios, o mesmo módulo oferece o contrato puro
`mecanifica.achados-critica-visual` (`versao: 1`). Ele não abre a bancada, não
conhece o domínio do alvo e não guarda caminho de arquivo, UUID, índice ou
relógio.

Cada item declara somente:

```json
{
  "alvo": {"tipo": "montagem", "id": "conjunto-neutro"},
  "vista": "direita",
  "severidade": "alta",
  "observacao": "A transição entre os dois volumes perde continuidade visível na vista lateral.",
  "evidencia": {"tipo": "render", "hash": "sha256:..."},
  "decisao": "corrigir",
  "estado": "aberto",
  "vinculo": {"antes": "sha256:...", "depois": null}
}
```

`evidencia` e seu `hash` são opcionais; quando ausente, a validação devolve
`evidencia: null`. O vínculo antes/depois é obrigatório e exige ao menos um
hash SHA-256 do marco comparado — por exemplo, render, imagem ou assinatura de
modelo. Vistas precisam pertencer ao conjunto oficial informado pelo host (as
sete vistas da bancada são o padrão); alvo, decisão, estado, severidade e tipo
de evidência têm vocabulário fechado. Observações vagas, hashes inválidos,
alvos não semânticos, campos extras, duplicatas e vínculos vazios são recusados.

`validarCriticaVisual` canonicaliza todos os objetos e ordena os achados por
alvo, vista e observação. Assim, duas execuções sobre a mesma evidência
produzem o mesmo JSON, mesmo que o agente tenha enviado os itens em ordem
diferente. Os hashes `antes`/`depois` relacionam a crítica a marcos comparáveis
sem transformar uma crítica em autorização automática de alteração.

Instruções ajudam a IA a notar um problema; não substituem uma operação
geométrica que a linguagem ainda não possui. Toda divergência encontrada é
classificada como:

1. **ajuste:** a capacidade existe e bastam parâmetros ou proporções;
2. **remodelagem local:** a capacidade existe, mas a região precisa ser refeita;
3. **capacidade ausente:** a intenção não é expressável de forma editável,
   semântica e determinística no vocabulário atual.

Só a terceira classe pode justificar mudança na linguagem de autoria.
## Aplicação à roda dianteira

As imagens analisadas justificam observar:

- afunilamento e curvatura dos raios;
- transição raio–cubo sem degrau seco;
- transição raio–aro com abertura gradual;
- rebaixos do miolo e assentamentos dos fixadores;
- bordas controladas: nem infinitamente afiadas, nem polidas por inteiro;
- profundidade comprovada nas vistas lateral e perspectiva;
- equivalência entre instâncias radiais.

Isso não autoriza implementar capacidades novas. Arranjo radial, orientação,
furos e revisão visual já têm contratos próprios. Qualquer lacuna restante deve
entrar no backlog com uma prova e um limite explícito.

“Auto polimento” global não é capacidade candidata. Se a prova exigir
acabamento, a hipótese é filete ou bevel **seletivo**, endereçado semanticamente,
para preservar arestas mecânicas e encaixes.
## Quando isso pode virar skill

O briefing de uma roda continua sendo artefato da roda. Um guia só vira skill
depois de o mesmo padrão:

- funcionar em pelo menos duas peças de famílias diferentes;
- ser usado por outra sessão ou agente;
- produzir crítica acionável sem depender do histórico desta conversa;
- separar orientação útil de capacidade geométrica ausente;
- ter comandos, saídas e armadilhas estáveis.

Antes disso, manter o protocolo em documentação evita congelar cedo demais uma
receita específica de objeto.
