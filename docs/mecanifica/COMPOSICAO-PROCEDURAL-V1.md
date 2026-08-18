# Composição procedural v1

## Papel

`mecanifica.composicao-procedural@1` é um subgrafo declarativo reutilizável de
operações do motor. Ele reduz repetição dentro de receitas; não é uma peça
publicada, não é montagem e não cria uma camada de execução paralela.

O chamador expande a composição para `passos` e entrega esses passos ao núcleo
existente. Assim, a mesma validação, geometria, canônico e procedência do motor
continuam valendo.

## Forma

```json
{
  "formato": "mecanifica.composicao-procedural@1",
  "id": "mecanifica.composicao.base-quadrada",
  "versao": "1.0.0",
  "parametros": {
    "origem": { "tipo": "inteiro" },
    "lado": { "tipo": "numero", "padrao": 1 }
  },
  "artefatos": {
    "entra": [],
    "sai": ["mecanifica.malha-poligonal@1"]
  },
  "nos": [
    {
      "id": "bloco",
      "operacao": "cubo",
      "argumentos": {
        "origemId": { "parametro": "origem" },
        "lado": { "parametro": "lado" }
      }
    }
  ]
}
```

Cada nó tem um `id` semântico e exatamente um alvo: `operacao` registrada ou
`composicao` registrada. `argumentos` aceita somente dados JSON; a referência
`{"parametro":"nome"}` é substituída pelo valor recebido na chamada.

Parâmetros são `numero`, `inteiro`, `texto` ou `vetor3`. Sem `padrao`, são
obrigatórios. Valores extras, não finitos, funções e referências a parâmetro
ausente falham antes de qualquer expansão.

## Tipos, recursão e orçamento

`artefatos.entra` declara o que já precisa existir; `artefatos.sai` declara o
que a composição disponibiliza. O registro percorre os nós em ordem e recusa
operação ou subcomposição que exija artefato ainda indisponível. Isso não tenta
validar a estética ou a geometria concreta: essa responsabilidade permanece no
executor do núcleo.

Subcomposições podem chamar outras subcomposições. O registro recusa ciclo com
o caminho completo. A expansão ainda recebe orçamento explícito:

- `maxPassos` limita operações expandidas, padrão 2048;
- `maxProfundidade` limita chamadas aninhadas, padrão 32.

Erro de ciclo, tipo, parâmetro ou orçamento não retorna lista parcial de
passos.

## Identidade e procedência

O autor da receita escolhe a identidade externa, por exemplo passando
`origemId` como parâmetro. A composição não gera UUID, não desloca IDs e não
usa a posição de um nó como identidade persistida.

A expansão retorna `procedencia.nos` com caminho semântico, composição, nó e
operação. O campo `passo` serve apenas para ligar o evento à execução resultante;
o caminho semântico é a referência estável para auditoria.

## API pura

`criarRegistroComposicoes` recebe todas as composições e um resolvedor explícito
das operações. `expandirComposicao` expande uma chamada; para uma receita com
várias chamadas, use `expandirChamadasDeComposicao`. Nenhuma dessas funções lê
arquivos, importa Three.js, inicia MCP ou muta registro global.

As três composições neutras de prova vivem apenas no teste R06; o catálogo de
peças publicado continua vazio. Elas demonstram reutilização sem transformar
fixture em receita homologada.

## Portas oficiais

Uma receita pode exportar `PASSOS` ou `CHAMADAS_COMPOSICOES`, nunca os dois.
No segundo caso, o chamador fornece `registroComposicoes` explicitamente a
`executarReceita`, `descreverPecaReutilizavel` ou `exportarPeca`. As três portas
expandem antes de executar e preservam o orçamento recebido. A entrada canônica
registra a assinatura do registro e as chamadas; assim a impressão da receita
exportada muda quando a composição ou sua configuração muda.

Ausência do registro, envelope ambíguo e falha de expansão são recusados antes
de o núcleo publicar geometria. O catálogo público não é consultado nem mutado.
