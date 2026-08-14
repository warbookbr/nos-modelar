# Contexto visual, revalidação e catálogo de montagem

## Capacidades

O contexto estrutural de uma montagem resolvida agora possui três consumidores
neutros e separados:

- `adaptarMontagemThree` compõe as peças em poses mundo e mantém caminhos
  semânticos no grafo visual;
- `derivarRoteiroRevalidacao` classifica relações diretas, indiretas,
  executáveis e pendências fora de cobertura;
- `derivarCatalogoMontagens` indexa usos e relações somente nas raízes
  explicitamente recebidas.

Nenhuma saída afirma colisão ou validade global. O catálogo não varre disco nem
infere dependência por proximidade.

A leitura de montagens por MCP expõe essas capacidades por IDs semânticos. A
configuração confiável do servidor declara as raízes; o agente não fornece nem
recebe caminhos locais. A autoria de montagem foi aprovada em perfil MCP opt-in,
mas permanece separada do perfil de leitura e reutiliza o serviço transacional.

## MCP somente leitura

O host habilita montagens com a variável
`MECANIFICA_CATALOGO_MONTAGENS`, apontando para um JSON local absoluto. Sem ela,
o servidor continua funcional para peças e anuncia catálogo de montagens vazio.
O arquivo de configuração usa este contrato:

```json
{
  "formato": "mecanifica.catalogo-mcp-montagens",
  "versao": 1,
  "raizMontagens": "montagens",
  "raizPecas": "pecas-resolvidas",
  "raizes": [
    { "id": "conjunto-dianteiro", "ref": "conjunto" }
  ]
}
```

Os dois diretórios resolvem relativamente ao arquivo de configuração. `ref` é
usado somente pelo host; o cliente descobre apenas `id` em
`mecanifica://montagens` e chama:

- `descrever_montagem` para contexto inteiro ou recorte semântico;
- `planejar_revalidacao_montagem` para relações e pendências do alvo;
- `catalogar_montagens` para usos entre as raízes escolhidas;
- `renderizar_montagem` para uma a quatro vistas em memória.

As ferramentas não aceitam caminhos locais e mantêm as anotações MCP de leitura
sem efeito destrutivo. O contrato público é `mecanifica.mcp.revisao.v3`.

## Captura confinada

```bash
npm run olhar:montagem -- \
  --arquivo=montagens/conjunto.json \
  --raiz-montagens=montagens \
  --raiz-pecas=pecas-resolvidas \
  --saida=tools/bancadas/out/revisao-conjunto \
  --caminho=freio/disco \
  --vistas=isometrica,direita
```

`olhar-montagem.mjs` usa um visor privado servido somente durante a captura. A
bancada publicada não muda e continua sendo a única aplicação do repositório.
Saída existente não é sobrescrita. Os metadados registram montagem, vista,
instâncias visíveis e caminhos relativos das imagens.

Uma imagem é evidência para leitura do agente; não substitui relações
mensuráveis, roteiro de revalidação ou diagnóstico estrutural.

## Escrita interna

O armazenamento escolhido está em
[`ESCRITA-TRANSACIONAL-MONTAGEM.md`](ESCRITA-TRANSACIONAL-MONTAGEM.md). Revisões
são imutáveis, conteúdo e commits usam SHA-256, e o commit é a fronteira de
visibilidade. Concorrência produz conflito explícito. O perfil MCP de autoria e
a materialização de montagem foram aprovados no repositório autorizado pelo
host; API, Git remoto, receita e filesystem de rede continuam fora.
