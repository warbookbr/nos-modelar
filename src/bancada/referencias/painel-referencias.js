/* painel-referencias.js — interface lateral para visualização de critérios de engenharia, intenção da IA e toggles de pranchas 2D. */
import { criarModalReferencia } from './modal-referencia.js';

export function criarPainelReferencias({
  container,
  aoAlternarPrancha = () => {},
}) {
  if (!container) return null;

  const modalReferencia = criarModalReferencia();

  function renderizar({ intencaoIA, referencias }) {
    container.replaceChildren();

    // 1. Bloco de Intenção e Status da IA
    const blocoIntencao = document.createElement('section');
    blocoIntencao.className = 'bloco-referencia';
    blocoIntencao.innerHTML = `
      <div class="bloco-cabecalho">
        <span class="rotulo">RACIONAL DA IA</span>
        <h3>${intencaoIA?.titulo || 'Sem ciclo de modelagem ativo'}</h3>
      </div>
      <p class="resumo-ia">${intencaoIA?.resumo || 'Aguardando especificações ou comandos do operador.'}</p>
    `;

    if (Array.isArray(intencaoIA?.checklist) && intencaoIA.checklist.length > 0) {
      const listaChecklist = document.createElement('ul');
      listaChecklist.className = 'checklist-ia';
      for (const item of intencaoIA.checklist) {
        const li = document.createElement('li');
        li.className = item.concluido ? 'concluido' : 'pendente';
        li.innerHTML = `
          <span class="icone-check">${item.concluido ? '✓' : '○'}</span>
          <span class="texto-check">${item.descricao}</span>
        `;
        listaChecklist.appendChild(li);
      }
      blocoIntencao.appendChild(listaChecklist);
    }
    container.appendChild(blocoIntencao);

    // 2. Bloco de Imagens de Referência Visual
    const imagens = referencias?.imagens || [];
    if (Array.isArray(imagens) && imagens.length > 0) {
      const blocoImagens = document.createElement('section');
      blocoImagens.className = 'bloco-referencia';
      blocoImagens.innerHTML = `
        <div class="bloco-cabecalho">
          <span class="rotulo">REFERÊNCIAS VISUAIS</span>
          <h3>Imagens de Inspiração & Alvo</h3>
        </div>
      `;

      const galeria = document.createElement('div');
      galeria.className = 'galeria-referencias-imagens';

      for (const img of imagens) {
        const url = typeof img === 'string' ? img : img?.url;
        const rotulo = typeof img === 'object' ? (img.rotulo || 'Referência Visual') : 'Referência Visual';
        const descricao = typeof img === 'object' ? (img.descricao || '') : '';
        if (!url) continue;

        const card = document.createElement('div');
        card.className = 'card-referencia-img';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('title', 'Clique para abrir em tela cheia com zoom');
        card.innerHTML = `
          <div class="thumb-referencia-wrapper">
            <img src="${url}" alt="${rotulo}" class="thumb-referencia-img" loading="lazy" />
            <div class="thumb-hover-overlay">
              <span class="icone-lupa">🔍</span>
              <span class="texto-ampliar">Ampliar</span>
            </div>
          </div>
          <div class="card-referencia-info">
            <strong class="card-referencia-titulo">${rotulo}</strong>
            ${descricao ? `<span class="card-referencia-desc">${descricao}</span>` : ''}
          </div>
        `;

        const dispararAbertura = () => {
          modalReferencia?.abrir({ url, rotulo, descricao });
        };

        card.addEventListener('click', dispararAbertura);
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            dispararAbertura();
          }
        });

        galeria.appendChild(card);
      }

      blocoImagens.appendChild(galeria);
      container.appendChild(blocoImagens);
    }

    // 2. Bloco de Pranchas 2D e Blueprints
    const pranchas = referencias?.pranchas || [];
    if (pranchas.length > 0) {
      const blocoPranchas = document.createElement('section');
      blocoPranchas.className = 'bloco-referencia';
      blocoPranchas.innerHTML = `
        <div class="bloco-cabecalho">
          <span class="rotulo">BLUEPRINTS & PRANCHAS 3D</span>
          <h3>Camadas de Referência</h3>
        </div>
      `;

      const listaPranchas = document.createElement('div');
      listaPranchas.className = 'lista-toggles-prancha';
      for (const prancha of pranchas) {
        const item = document.createElement('label');
        item.className = 'item-toggle-prancha';
        item.innerHTML = `
          <input type="checkbox" checked data-prancha-id="${prancha.id}">
          <span>${prancha.rotulo || prancha.id} <small>(${prancha.plano || 'XY'})</small></span>
        `;
        const checkbox = item.querySelector('input');
        checkbox.addEventListener('change', () => {
          aoAlternarPrancha(prancha.id, checkbox.checked);
        });
        listaPranchas.appendChild(item);
      }
      blocoPranchas.appendChild(listaPranchas);
      container.appendChild(blocoPranchas);
    }

    // 3. Bloco de Critérios Técnicos
    const criterios = referencias?.criterios || [];
    if (criterios.length > 0) {
      const blocoCriterios = document.createElement('section');
      blocoCriterios.className = 'bloco-referencia';
      blocoCriterios.innerHTML = `
        <div class="bloco-cabecalho">
          <span class="rotulo">ENGENHARIA</span>
          <h3>Critérios de Validação</h3>
        </div>
      `;

      const listaCriterios = document.createElement('ul');
      listaCriterios.className = 'lista-criterios';
      for (const crit of criterios) {
        const li = document.createElement('li');
        li.className = `criterio-${crit.status || 'pendente'}`;
        li.innerHTML = `
          <span class="badge-status">${crit.status === 'aprovado' ? 'OK' : crit.status === 'reprovado' ? 'FALHA' : 'PEND'}</span>
          <span>${crit.texto}</span>
        `;
        listaCriterios.appendChild(li);
      }
      blocoCriterios.appendChild(listaCriterios);
      container.appendChild(blocoCriterios);
    }
  }

  return {
    renderizar,
  };
}
