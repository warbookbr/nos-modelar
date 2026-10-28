# Arquitetura de Sessão Ativa, Hospedagem Estática e Segurança Corporativa

Este documento formaliza o funcionamento da bancada interativa de co-modelagem (Humano + IA), sua compatibilidade com hospedagem estática (GitLab Pages / GitHub Pages / Servidores Web Internos) e os critérios de segurança e isolamento de rede.

---

## 1. Modelo de Hospedagem Estática

A bancada foi projetada para operar **100% como aplicação estática (Client-Side)**:

- **Compilação via Vite:** O comando `npm run build` empacota HTML, CSS e JavaScript estáticos na pasta `dist/`.
- **Sem backend em runtime:** Não requer Node.js rodando no servidor, nem bancos de dados, nem endpoints dinâmicos proprietários.
- **Compatibilidade nativa com GitLab Pages:** Pode ser hospedada diretamente em pipelines CI/CD do GitLab/GitHub Pages ou em qualquer servidor web corporativo (NGINX, Apache, IIS, S3 bucket interno).

---

## 2. Mecanismos de Sincronismo (Live Sync)

A sincronização entre o operador humano e os processos da IA utiliza canais locais e seguros:

1. **API Global em Memória (`window.__mecanificaSessao`):**
   - Permite que scripts de automação, extensões, testes e ferramentas MCP injetem payloads de modelagem diretamente na cena 3D ativa.
2. **Canal Local entre Abas (`BroadcastChannel` / `postMessage`):**
   - Permite que múltiplos visores ou abas locais sincronizem o estado da sessão sem trafegar dados pela rede.
3. **Polling de Arquivo de Sessão Relativo (`./sessao-ativa.json`):**
   - A bancada consulta opcionalmente o arquivo estático de sessão na mesma origem (`origin`). Caso o arquivo não exista no Pages, há fallback silencioso e a aplicação permanece operacional.
4. **Estado Persistido na URL:**
   - Câmera, vista, projeção e filtros de seleção são serializados na query string (`?peca=...&vista=...`), garantindo reprodução exata sem necessidade de banco de dados remoto.

---

## 3. Matriz de Segurança e Conformidade Corporativa

| Requisito / Critério | Comportamento da Bancada | Impacto de Segurança |
| :--- | :--- | :--- |
| **Portas e Conexões Externas** | Nenhuma porta aberta em runtime; zero túneis (ngrok/SSH). | **Risco Zero:** Sem superfície de ataque exposta. |
| **Dependências Externas (CDNs)** | Three.js e todas as dependências são compiladas localmente no bundle. | **Imune a bloqueios de firewall / SSL proxy.** |
| **Privacidade dos Dados** | Geometrias e receitas processadas exclusivamente na máquina do cliente. | **Isolamento Total:** Nenhum dado é enviado para servidores de terceiros. |
| **Políticas de Origem (CORS/CSP)** | Requisições restritas à mesma origem relativa (`./`). | Compatível com cabeçalhos restritivos de segurança corporativa. |
| **Modo Offline** | Funciona sem acesso à internet após o build local. | Opera em ambientes isolados (*air-gapped*). |

---

## 4. Conclusão

A arquitetura garante simultaneamente **alta interatividade de co-modelagem** e **estrita aderência às políticas de governança e segurança corporativa**.
