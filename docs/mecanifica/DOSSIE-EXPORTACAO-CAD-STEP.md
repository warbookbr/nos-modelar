# Dossiê técnico — exportação CAD/STEP

## Decisão

A exportação STEP será uma capacidade derivada da malha neutra, isolada em um
módulo interno. Ela não será uma operação do núcleo procedural e não mudará a
representação usada para autoria, inspeção ou publicação JSON.

O primeiro resultado é deliberadamente facetado: representa em STEP a forma que
o núcleo realmente produziu. Superfícies analíticas exigem outro executor e só
podem nascer em uma continuação específica.

## Fronteiras

```text
src/autoria/executar-receita.js
  produz: neutro { V, F, partes, portas, procedencia }

modulos/exportador-cad/
  consome: dados neutros + opções físicas
  produz: bytes STEP + diagnóstico
  não lê: receitas, catálogo, URL ou sistema de arquivos

tools/mecanifica/exportar-step.mjs
  resolve: argumentos, receita e destino
  executa: receita e escrita atômica
```

Dependências permitidas:

```text
CLI -> executarReceita
CLI -> exportador-cad
exportador-cad -> adaptador do kernel
adaptador do kernel -> biblioteca externa
```

Dependências proibidas:

```text
nucleo -> exportador-cad
receita -> exportador-cad
exportador-cad -> bancada
exportador-cad -> tools/
exportador-cad -> Three.js
```

## Estrutura do módulo

```text
modulos/exportador-cad/
├── package.json
├── README.md
├── src/
│   ├── index.js
│   ├── contrato.js
│   ├── diagnosticos.js
│   ├── validar-malha.js
│   ├── separar-corpos.js
│   ├── triangular-faces.js
│   ├── imprimir-geometria.js
│   └── backends/
│       ├── criar-kernel.js
│       └── step-facetado.js
├── tests/
│   ├── contrato.test.js
│   ├── validar-malha.test.js
│   ├── separar-corpos.test.js
│   ├── step-facetado.test.js
│   └── fixtures/
└── evidencias/                  # somente relatórios pequenos, não STEP gerado
```

`index.js` é a única porta pública. O restante pode mudar sem ampliar a
superfície de compatibilidade.

## API interna

```js
export async function exportarCad({
  nome,
  neutro,
  formato,
  estrategia,
  unidade,
  escala = 1,
  tolerancia,
  metadados = {},
}) {}
```

Contrato inicial:

- `formato`: somente `step`;
- `estrategia`: somente `facetada`;
- `unidade`: `mm` (padrão CAD), `cm` ou `m`;
- `escala`: fator multiplicador positivo (por padrão na CLI, converte o sistema métrico em metros do núcleo procedural para a unidade de saída: 1000 para `mm`, 100 para `cm`, 1 para `m`, com override explícito via `--escala`);
- `tolerancia`: número positivo expresso na unidade de saída;
- `nome`: identidade de produto, não caminho;
- `neutro`: malha já executada, nunca módulo de receita;
- `metadados`: lista branca, sem objetos arbitrários do chamador.

Saída:

```js
{
  formato: 'mecanifica.exportacao-cad@1',
  bytes: Uint8Array,
  extensao: '.step',
  mime: 'model/step',
  diagnostico: {
    backend: { nome, versao },
    estrategia: 'facetada',
    unidade: 'mm',
    escala: 1,
    tolerancia: 0.001,
    vertices,
    facesOriginais,
    triangulos,
    partes: [{ nome, corpos }],
    corpos: [{ nome, parte, fechado, volume, caixa }],
    reparos: [],
    avisos: [],
    impressaoGeometrica,
  },
}
```

## Diagnóstico de erro

Erros de domínio terão código estável e detalhes serializáveis:

```js
{
  codigo: 'aresta-nao-manifold',
  mensagem: 'A aresta pertence a mais de duas faces.',
  parte: 'estrutura',
  corpo: 'estrutura',
  aresta: [120, 145],
  faces: [301, 302, 410],
}
```

Famílias iniciais:

- `entrada-invalida`;
- `unidade-ausente`;
- `vertice-ausente`;
- `face-degenerada`;
- `face-sem-identidade`;
- `borda-aberta`;
- `orientacao-incoerente`;
- `aresta-nao-manifold`;
- `corpo-nao-fechado`;
- `reparo-acima-da-tolerancia`;
- `kernel-indisponivel`;
- `kernel-falhou`;
- `escrita-falhou`.

A CLI mapeia as famílias para códigos de processo, mas não altera o conteúdo do
erro.

## Validação geométrica

### Normalização

1. ordenar vértices e faces por identidade canônica;
2. aplicar escala em cópia, sem mutar o neutro;
3. conferir números finitos;
4. validar todas as referências de vértice;
5. eliminar somente fechamento repetido explícito do polígono, se permitido
   pelo contrato; nenhuma fusão por proximidade ocorre nessa etapa.

### Faces

Cada face precisa ter pelo menos três vértices distintos e área acima do limite
derivado da tolerância. Faces não triangulares são projetadas no plano local e
trianguladas deterministicamente. Face não planar acima da tolerância não pode
virar um único plano: ela é triangulada ou recusada conforme o desvio medido.

### Arestas e orientação

A chave topológica de aresta é o par ordenado dos IDs de seus vértices. Em cada
componente fechado:

- toda aresta aparece exatamente duas vezes;
- as duas ocorrências percorrem sentidos opostos;
- incidência maior que dois é não-manifold;
- incidência igual a um é borda aberta.

O exportador não fecha buracos automaticamente. Inverter um componente inteiro
pode ser permitido quando volume assinado indicar orientação global invertida;
inverter faces isoladas é reparo e precisa aparecer no diagnóstico.

### Partes e corpos

Faces são agrupadas primeiro por `parte`, depois por conectividade de arestas.
Cada componente conexo fechado vira um sólido. Uma parte com vários componentes
usa nomes determinísticos `parte`, `parte__2`, `parte__3`.

Faces sem parte são recusadas no MVP porque um nome artificial esconderia perda
de identidade. A futura montagem não deve depender desses sufixos: ela terá
identidade de ocorrência própria.

## Construção no kernel

Para cada corpo:

1. criar pontos na unidade final;
2. criar topologia compartilhada de vértices e arestas;
3. criar wire fechado para cada triângulo;
4. criar face planar orientada;
5. costurar faces com tolerância explícita;
6. conferir casca fechada;
7. construir sólido;
8. validar o sólido pelo verificador do kernel;
9. anexar nome semântico;
10. adicionar ao compound do produto.

Todo objeto nativo/WASM com destrutor precisa ser liberado em `finally`. O teste
de repetição mede memória após várias exportações para detectar acúmulo.

## Escolha do backend

OpenCascade em WASM/Node é o candidato preferido porque pode viajar com o
módulo e oferece B-rep e escritor STEP na mesma biblioteca. A preferência só se
confirma após a prova R00.

FreeCAD headless é o segundo candidato e também o verificador independente
preferido. Seu risco é transformar uma instalação global em requisito invisível.

CadQuery é o terceiro candidato. Sua API é conveniente para o backend
paramétrico futuro, mas introduz ambiente Python e distribuição separados.

A prova registra:

- pacote e versão exatos;
- licença do wrapper e do binário/WASM;
- versões de Node e Windows;
- tamanho instalado e carregado;
- inicialização fria e quente;
- memória antes, durante e depois;
- escrita e reimportação;
- estabilidade de nomes;
- determinismo textual e geométrico;
- abertura em ferramenta independente.

## Determinismo

STEP pode carregar timestamp, versão do escritor e IDs transitórios. Portanto há
dois níveis de determinismo:

1. textual, exigido se o backend aceitar metadados fixos;
2. geométrico, sempre exigido após reimportação.

A impressão geométrica ordena produtos e sólidos por nome e registra unidade,
quantidades, conectividade, caixa, área e volume quantizados pela tolerância.
Dois arquivos só são equivalentes quando essa impressão coincide.

O hash da entrada inclui malha canônica, unidade, escala, tolerância, estratégia
e versão do backend. Ele não substitui a comparação da geometria reimportada.

## CLI e Servidor MCP

### Ferramenta MCP (`exportar_step`)

Clientes MCP (como agentes de IA) exportam arquivos STEP sob demanda explícita:

- **Nome da Tool:** `exportar_step`
- **Parâmetros:**
  - `arquivo` (string, obrigatório): Caminho do arquivo `.js` da receita relativo à raiz do repositório.
  - `saida` (string, obrigatório): Caminho do arquivo `.step` ou `.stp` de destino.
  - `unidade` (enum: `'mm'`, `'m'`, `'cm'`, `'in'`, opcional, padrão: `'mm'`).
  - `escala` (número, opcional, padrão: 1000 para conversão de metros para milímetros).
  - `tolerancia` (número, opcional, padrão: 0.001).
  - `sobrescrever` (booleano, opcional, padrão: false).

### CLI

```powershell
npm run exportar:step -- `
  --arquivo=prototipos/procedural/v3/pecas/suporte-eixo.js `
  --unidade=mm `
  --tolerancia=0.001 `
  --saida=exportacoes/cad/suporte-eixo.step
```

Opções iniciais:

- `--arquivo` — receita dentro do repositório;
- `--saida` — `.step` ou `.stp`;
- `--unidade` — obrigatória;
- `--escala` — padrão `1`, registrada;
- `--tolerancia` — obrigatória até R04 justificar padrão;
- `--sobrescrever` — opt-in;
- `--diagnostico=json` — saída estruturada;
- `--somente-validar` — executa até a validação, sem carregar o kernel.

A receita é resolvida por caminho real e precisa permanecer dentro do
repositório. O destino pode ser escolhido pelo operador, mas a CLI e a tool MCP nunca apagam
nem sobrescrevem arquivo existente implicitamente.

A escrita cria temporário no mesmo diretório, fecha e valida o arquivo, e só
então renomeia. Em falha, remove somente o temporário criado pela própria
execução.

## Corpus de prova

| Caso | O que prova |
|---|---|
| cubo conhecido | unidade, caixa, área e volume |
| prisma não cúbico | orientação e dimensões por eixo |
| cilindro segmentado | expectativa facetada explícita |
| duas partes | nomes e compound |
| dois corpos numa parte | conectividade e sufixos estáveis |
| malha aberta | recusa antes do kernel |
| aresta com três faces | diagnóstico não-manifold |
| face degenerada | identidade no erro |
| ordem embaralhada | determinismo da saída geométrica |
| receita mecânica real | utilidade sem fixture favorável |

O caso real não pode ser modificado para passar. Se falhar, o relatório separa
defeito da receita, limite da estratégia facetada e defeito do exportador.

## Continuação paramétrica

O backend paramétrico não consome a malha final como fonte principal. Ele
consome os passos expandidos e mapeia cada operação para uma feature B-rep.

Antes de implementar, um plano próprio gera uma matriz:

```text
operação | feature CAD | exatidão | identidade preservada | suporte
```

Primitivas, transformações, extrusão, revolução, furo e filete são candidatas.
Edição direta de vértices/faces, cage subdividida, pintura e operações sem
semântica analítica não têm conversão automática garantida.

Ao pedir `parametrica`, qualquer operação sem suporte precisa ser listada e a
exportação recusada. Fallback silencioso para facetado faria um arquivo parecer
mais editável do que realmente é.

## Continuação para montagens

Uma montagem STEP precisa preservar definição, ocorrência, pose e repetição. Um
compound posicionado é mais simples, mas não equivale necessariamente a uma
assembly AP242. Essa escolha depende do consumidor e será provada em plano
separado após o exportador de peça.

## Critério de sucesso

O módulo está correto quando uma receita válida produz STEP que abre e
reimporta com os sólidos, nomes e medidas esperados; uma receita inválida falha
antes de publicar; o núcleo e as receitas permanecem intactos; e remover o
módulo elimina toda dependência CAD sem afetar a bancada ou a exportação JSON.
