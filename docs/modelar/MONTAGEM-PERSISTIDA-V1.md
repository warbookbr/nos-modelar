# Montagem persistida v1

Contrato executável para compor instâncias semanticamente identificadas de
peças e montagens, sem copiar autoria geométrica para o arquivo persistido.

## Exemplo mínimo

```json
{
  "formato": "mecanifica.montagem",
  "versao": 1,
  "id": "conjunto",
  "instancias": [
    {
      "id": "freio",
      "alvo": { "tipo": "peca", "ref": "freio-disco" },
      "pose": {
        "rotacao": [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
        "deslocamento": [0, 0, 0]
      }
    }
  ]
}
```

`id` da montagem e de cada instância é texto não vazio; IDs de instância são
únicos dentro da montagem. `alvo.tipo` é `peca` ou `montagem`, e `alvo.ref` é
texto não vazio persistível. `instancias` é ordenada por ID na forma canônica.

`pose` é opcional e, quando omitida, vale identidade. Sua forma persistida é
somente uma rotação rígida 3x3 própria e um deslocamento finito. Escala não
pertence à persistência v1.

## Resultado resolvido

O resolvedor devolve instâncias na ordem canônica, cada uma com `id`,
`caminho` como array de IDs, `alvo`, `poseLocal` e `poseMundo`. Instâncias de
peça também têm `definicao: { ref, neutro }`; instâncias de montagem têm
`montagem: { id, instancias }` resolvida recursivamente. Montagens reutilizadas
geram ocorrências independentes; dentro de uma resolução, definições da mesma
`ref` são cacheadas e compartilhadas.

`carregarPeca(ref)` fornece o artefato bruto da peça publicada e
`carregarMontagem(ref)` fornece o JSON persistido da montagem. Os carregadores
são injetados no resolvedor e não conhecem o contrato de produção.

Falhas são fail-closed: não há árvore válida parcial. Códigos principais
incluem `formato-desconhecido`, `versao-nao-suportada`, `estrutura-invalida`,
`pose-invalida`, `carregador-invalido`, `referencia-ausente`, `peca-invalida`,
`montagem-invalida` e `ciclo`.

O contrato executável está em
[`src/autoria/ler-montagem-persistida.js`](../../src/autoria/ler-montagem-persistida.js)
e [`src/autoria/resolver-montagem-persistida.js`](../../src/autoria/resolver-montagem-persistida.js).

Limites v1: sem autoria geométrica copiada, Three.js, writer, CLI, MCP,
relações, solver, cinemática ou mapa global de dependências.
