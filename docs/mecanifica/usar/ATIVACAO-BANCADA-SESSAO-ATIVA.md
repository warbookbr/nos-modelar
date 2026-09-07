# Ativação de Peças e Montagens na Bancada 3D (Sessão Ativa)

Este documento registra o procedimento oficial para carregar e inspecionar qualquer peça ou montagem procedural na **Bancada 3D Interativa** (`bancada.html`) em tempo real.

---

## 1. Como Funciona a Sessão Ativa

A bancada possui um catálogo homologado deliberadamente vazio para evitar publicação de protótipos privados. 

Para a co-modelagem em tempo real entre a IA e o operador, a bancada consome o arquivo de sincronização `public/sessao-ativa.json` (servido pelo Vite na raiz `/nos-mecanifica/sessao-ativa.json`).

Quando `public/sessao-ativa.json` é atualizado, a bancada em execução detecta a mudança via polling e recarrega instantaneamente a geometria, as partes e os materiais na cena 3D.

---

## 2. Comandos de Ativação

### 2.1 Ferramenta MCP (`ativar_bancada`)

Clientes MCP (como agentes de IA) ativam receitas diretamente através da ferramenta:

- **Nome da Tool:** `ativar_bancada`
- **Parâmetros:**
  - `arquivo` (string, obrigatório): Caminho do arquivo `.js` relativo à raiz do repositório (ex: `prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js`).
  - `focar` (string, opcional): Nome da parte para aplicar foco/isolamento imediato.
  - `modo` (enum: `'todas'`, `'contexto'`, `'isolar'`, opcional): Modo de visualização na bancada.
  - `porta` (número, opcional): Porta HTTP do servidor Vite (padrão: 5174).

### 2.2 CLI Unificado (`npm run ativar:bancada`)

Para ativar qualquer receita ou montagem na bancada via terminal:

```powershell
npm run ativar:bancada -- --arquivo=prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js
```

#### Opções Disponíveis

| Opção | Descrição | Exemplo |
|---|---|---|
| `--arquivo=<caminho>` | Caminho do arquivo `.js` da receita | `--arquivo=prototipos/procedural/v3/maquinas/prensa-mecanica-industrial/montagem.js` |
| `--focar=<parte>` | Foca e isola imediatamente o componente especificado | `--focar=motorEletrico` |
| `--modo=<modo>` | Modo visual: `todas`, `contexto` ou `isolar` | `--modo=isolar` |
| `--porta=<num>` | Porta do servidor Vite (padrão: 5174 ou 5173) | `--porta=5174` |

---

## 3. URLs de Acesso

Com o servidor de desenvolvimento ativo (`npm run dev`):

- **Visualização Completa:**
  [http://localhost:5174/nos-mecanifica/bancada.html](http://localhost:5174/nos-mecanifica/bancada.html)
- **Foco / Isolamento Direto de Peça:**
  [http://localhost:5174/nos-mecanifica/bancada.html?selecionadas=motorEletrico&modo=isolar&focar=true](http://localhost:5174/nos-mecanifica/bancada.html?selecionadas=motorEletrico&modo=isolar&focar=true)

---

## 4. Estrutura do Payload (`sessao-ativa.json`)

```json
{
  "status": "conectado",
  "alvo": {
    "id": "identificador-do-alvo",
    "tipo": "peca",
    "nome": "Nome Legível da Máquina ou Peça",
    "versao": "1.0.0",
    "atualizadoEm": "2026-08-28T19:00:00.000Z"
  },
  "intencaoIA": {
    "titulo": "Título da Modelagem",
    "resumo": "Descrição dos módulos e objetivos.",
    "checklist": ["corpo1", "corpo2"]
  },
  "referencias": {
    "pranchas": [],
    "imagens": ["caminho/para/referencia.png"],
    "criterios": ["Sem órfãos", "Encaixe validado"]
  },
  "receita": {
    "meta": { "nome": "..." },
    "PARAMS": { ... },
    "MATERIAIS": { ... },
    "PASSOS": [ ... ]
  }
}
```

## Revisão visual headless da sessão ativa

Até esta correção, `olhar-bancada` (e por consequência o `renderizar_vistas` do
MCP) não conseguia revisar peça nenhuma — nem fixture, nem sessão ativa. Quatro
defeitos empilhados, todos corrigidos:

1. **A ponte não publicava o que o leitor consome.**
   `window.__mecanificaBancada` expunha `peca()`, `estado()` e `enquadrar()`, mas
   o leitor headless procurava `partes`, `estatisticas`, `diagnosticos`,
   `selecaoIgnorada` e `enquadramento()` — que não existiam. O resultado era
   `estatisticas` nulo e a revisão morria em `facesNeutras`. Agora são
   **getters** (não valores congelados), porque a ponte é montada uma vez no fim
   da inicialização e o modelo troca depois.

2. **O leitor lia antes do modelo entrar na cena.**
   A peça da sessão ativa chega pelo *polling* do sincronizador, segundos após o
   `load`. `olhar-bancada` agora espera `carregado === true`.

3. **O caminho da sessão era relativo à página, não à aplicação.**
   O harness dos gates vive em `tools/bancadas/`, então `./sessao-ativa.json`
   resolvia para um sessao-ativa.json dentro de `tools/bancadas/`, que nunca existiu (404) e a sessão nunca subia
   em modo headless. O `fetch` passou a ancorar em `import.meta.env.BASE_URL`.

4. **A câmera nunca enquadrava a peça da sessão.**
   `preservarCamera` existe para não arrancar o enquadramento de quem edita ao
   vivo, mas na **primeira** entrega não há câmera a preservar: o enquadramento
   em vigor foi calculado com a cena vazia. Agora só preserva se já houver
   modelo.

Além disso, `--saida` deixou de exigir `--peca`: a peça em trabalho, por
definição, ainda não está no catálogo publicado, e exigir nome tornava impossível
salvar justamente a revisão do trabalho em curso. O nome do arquivo sai do rótulo
do modelo carregado, normalizado por `apelidoDeArquivo`.

```bash
node tools/mecanifica/ativar-bancada.mjs --arquivo=prototipos/procedural/v3/pecas/<peca>.js
node tools/mecanifica/olhar-bancada.mjs --vistas=direita,frontal,isometrica --saida=tmp/<peca>
```

## Cache de módulo no servidor MCP

O servidor MCP é um processo longo; o loader ESM do Node guarda todo módulo já
importado pela URL. Uma receita editada no disco continuava produzindo a saída da
**primeira** chamada de `exportar_obj` — silenciosamente, sem erro. As CLIs nunca
viram isso porque cada execução é um processo novo.

`tools/mecanifica/importar-receita.mjs` sufixa a URL com a assinatura do arquivo
(mtime + tamanho): arquivo intocado reusa o cache, arquivo editado força
releitura. Use `importarReceita(caminhoAbsoluto)` em vez de `import()` direto em
qualquer caminho alcançável pelo servidor.
