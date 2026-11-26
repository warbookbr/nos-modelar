#!/usr/bin/env bash
# juntar-a-main.sh — o passo "Juntar à main" do CI: avança a main até o commit que passou; com a main andada por outra sessão,
# junta a main ao ramo num commit só, refaz os gerados, envia o ramo e dispara o CI de novo, até três vezes; com conflito, para.
# Uso: RAMO=<ramo> tools/ci/juntar-a-main.sh, num clone com o remoto `origin`; `gh` dispara o CI. O teste troca o `gh` por um
# falso e os geradores por GERADORES=<comando> (o repositório de teste não tem os de verdade).
set -euo pipefail

resumo() { echo "$1"; if [ -n "${GITHUB_STEP_SUMMARY:-}" ]; then echo "$1" >> "$GITHUB_STEP_SUMMARY"; fi; }

# Os geradores conferidos pelo CI que não pedem `npm ci` (só importam `node:` e uns aos outros); o mapa por último.
GERADORES_DO_REPOSITORIO='node tools/mapa/planos.mjs --gerar && node tools/mapa/indice-do-banco.mjs --gerar && node tools/mapa/decisoes.mjs --gerar && node tools/mapa/roteiros.mjs --gerar && node tools/mapa/toc.mjs && node tools/modelar/banco-de-provas.mjs --gerar && node tools/modelar/ferramentas-por-objeto.mjs && node tools/arquitetura/mapear-motor-procedural.mjs && node tools/mapa/registro-de-ferramentas.mjs --gerar && node tools/mapa/mapa.mjs'

git fetch origin main
if git merge-base --is-ancestor origin/main HEAD; then
  if git push origin HEAD:refs/heads/main; then exit 0; fi
  git fetch origin main
  if git merge-base --is-ancestor origin/main HEAD; then
    resumo "O envio da main foi recusado sem a main ter andado; rode de novo este job."
    exit 1
  fi
  echo "A main andou entre a leitura e o envio; segue pela junção."
fi
if git merge-base --is-ancestor HEAD origin/main; then
  resumo "O ramo já está contido na main; nada a juntar."
  exit 0
fi
tentativa=$(git log -1 --format=%B | sed -n 's/^Junção automática da main, tentativa \([0-9]*\)\.$/\1/p')
tentativa=$(( ${tentativa:-0} + 1 ))
if [ "$tentativa" -gt 3 ]; then
  resumo "A main andou três vezes seguidas durante o CI; junte a main ao ramo (git merge origin/main) e envie de novo."
  exit 1
fi
git config user.name "github-actions[bot]"
git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
if ! git merge --no-commit --no-ff origin/main; then
  git merge --abort || true
  resumo "A main andou e a junção dela com o ramo não fecha sozinha (conflito); junte a main ao ramo (git merge origin/main), resolva e envie de novo."
  exit 1
fi
bash -c "${GERADORES:-$GERADORES_DO_REPOSITORIO}"
git add -A
git commit -q -m "Junção automática da main, tentativa $tentativa."
git push origin "HEAD:refs/heads/$RAMO"
resumo "A main andou; ela foi juntada ao ramo $RAMO e o CI roda de novo sobre a junção (tentativa $tentativa de 3). O CI a acompanhar é o da execução nova no ramo, e a sessão puxa o ramo (git pull) antes do próximo envio."
for chamada in 1 2 3; do
  if gh workflow run ci.yml --ref "$RAMO"; then exit 0; fi
  sleep 10
done
resumo "A junção foi enviada ao ramo, mas o CI não pôde ser disparado; dispare à mão com: gh workflow run ci.yml --ref $RAMO"
exit 1
