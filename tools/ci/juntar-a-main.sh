#!/usr/bin/env bash
# juntar-a-main.sh — o passo "Juntar à main" do CI: avança a main até o commit que passou; com a main andada por outra sessão,
# junta a main ao ramo, refaz os gerados, envia o ramo e dispara o CI de novo, até três vezes; com conflito, para.
# Uso: RAMO=<ramo> tools/ci/juntar-a-main.sh, num clone com o remoto `origin`; `gh` dispara o CI (o teste o troca por um falso,
# e SEM_GERADOS=1 pula os geradores, que o repositório de teste não tem).
set -euo pipefail
git fetch origin main
if git merge-base --is-ancestor origin/main HEAD; then
  git push origin HEAD:main
  exit 0
fi
tentativa=$(git log -1 --format=%B | sed -n 's/^Junção automática da main, tentativa \([0-9]*\)\.$/\1/p')
tentativa=$(( ${tentativa:-0} + 1 ))
if [ "$tentativa" -gt 3 ]; then
  echo "A main andou três vezes seguidas durante o CI; junte a main ao ramo (git merge origin/main) e envie de novo."
  exit 1
fi
git config user.name "github-actions[bot]"
git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
if ! git merge --no-edit origin/main; then
  git merge --abort
  echo "A main andou e a junção dela com o ramo tem conflito; junte a main ao ramo (git merge origin/main), resolva e envie de novo."
  exit 1
fi
if [ -z "${SEM_GERADOS:-}" ]; then
  node tools/mapa/planos.mjs --gerar
  node tools/mapa/indice-do-banco.mjs --gerar
  node tools/mapa/mapa.mjs
fi
git add -A
git commit --allow-empty -m "Junção automática da main, tentativa $tentativa."
git push origin "HEAD:$RAMO"
gh workflow run ci.yml --ref "$RAMO"
echo "A main andou; a main foi juntada ao ramo e o CI roda de novo sobre a junção (tentativa $tentativa de 3)."
