#!/usr/bin/env bash
# Import des dashboards Cursus dans Grafana Cloud via API REST.
#
# Usage:
#   GRAFANA_URL=https://yourorg.grafana.net \
#   GRAFANA_API_KEY=glsa_xxx \
#   ./provisioning.sh
#
# Variables d'environnement requises:
#   GRAFANA_URL      — URL de l'instance Grafana (sans slash final)
#   GRAFANA_API_KEY  — Service Account token avec rôle Editor ou Admin
#
# Variables optionnelles:
#   DRY_RUN          — Si "true", affiche les payloads sans les envoyer
#   FOLDER_TITLE     — Titre du dossier Grafana (défaut: "Cursus")
#   FOLDER_UID       — UID du dossier Grafana (défaut: "cursus")

set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────────────────

GRAFANA_URL="${GRAFANA_URL:?La variable GRAFANA_URL est requise}"
GRAFANA_API_KEY="${GRAFANA_API_KEY:?La variable GRAFANA_API_KEY est requise}"
DRY_RUN="${DRY_RUN:-false}"
FOLDER_TITLE="${FOLDER_TITLE:-Cursus}"
FOLDER_UID="${FOLDER_UID:-cursus}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DASHBOARDS_DIR="${SCRIPT_DIR}/dashboards"

# ── Helpers ────────────────────────────────────────────────────────────────────

log_info()  { echo "[INFO]  $*"; }
log_ok()    { echo "[OK]    $*"; }
log_warn()  { echo "[WARN]  $*"; }
log_error() { echo "[ERROR] $*" >&2; }

grafana_request() {
  local method="$1"
  local path="$2"
  local data="${3:-}"

  local args=(
    --silent
    --fail-with-body
    --max-time 30
    -X "$method"
    -H "Authorization: Bearer ${GRAFANA_API_KEY}"
    -H "Content-Type: application/json"
  )

  if [[ -n "$data" ]]; then
    args+=(-d "$data")
  fi

  curl "${args[@]}" "${GRAFANA_URL}${path}"
}

# ── Vérification des prérequis ─────────────────────────────────────────────────

if ! command -v jq &>/dev/null; then
  log_error "jq est requis. Installer avec: apt-get install -y jq / brew install jq"
  exit 1
fi

if ! command -v curl &>/dev/null; then
  log_error "curl est requis."
  exit 1
fi

if [[ ! -d "$DASHBOARDS_DIR" ]]; then
  log_error "Dossier dashboards introuvable: ${DASHBOARDS_DIR}"
  exit 1
fi

# Vérifier la validité JSON de tous les dashboards avant de commencer
log_info "Validation JSON des dashboards..."
invalid=0
for dashboard_file in "${DASHBOARDS_DIR}"/*.json; do
  if ! jq empty "$dashboard_file" 2>/dev/null; then
    log_error "JSON invalide: $dashboard_file"
    invalid=$((invalid + 1))
  fi
done

if [[ $invalid -gt 0 ]]; then
  log_error "${invalid} fichier(s) JSON invalide(s). Provisioning annulé."
  exit 1
fi
log_ok "Tous les fichiers JSON sont valides."

# ── Test de connectivité ───────────────────────────────────────────────────────

log_info "Test de connexion à Grafana: ${GRAFANA_URL}..."
health_response=$(grafana_request GET "/api/health" || true)
if ! echo "$health_response" | jq -e '.database == "ok"' &>/dev/null; then
  log_warn "Grafana health check non-standard (réponse: ${health_response}). Continuité..."
fi

# ── Dry-run mode ───────────────────────────────────────────────────────────────

if [[ "$DRY_RUN" == "true" ]]; then
  log_warn "MODE DRY-RUN: aucune modification ne sera envoyée à Grafana."
  for dashboard_file in "${DASHBOARDS_DIR}"/*.json; do
    dashboard_name=$(basename "$dashboard_file" .json)
    dashboard_uid=$(jq -r '.uid // "N/A"' "$dashboard_file")
    dashboard_title=$(jq -r '.title // "N/A"' "$dashboard_file")
    log_info "[DRY-RUN] Dashboard prêt: ${dashboard_name} (uid=${dashboard_uid}, title=${dashboard_title})"
  done
  log_ok "Dry-run terminé. $(ls "${DASHBOARDS_DIR}"/*.json | wc -l | tr -d ' ') dashboard(s) à importer."
  exit 0
fi

# ── Création / récupération du dossier ─────────────────────────────────────────

log_info "Création du dossier Grafana: '${FOLDER_TITLE}' (uid=${FOLDER_UID})..."

folder_payload=$(jq -n \
  --arg title "$FOLDER_TITLE" \
  --arg uid "$FOLDER_UID" \
  '{"title": $title, "uid": $uid}')

folder_response=$(grafana_request POST "/api/folders" "$folder_payload" 2>&1 || true)
folder_uid=$(echo "$folder_response" | jq -r '.uid // empty')

if [[ -z "$folder_uid" ]]; then
  # Le dossier existe peut-être déjà — on le récupère
  log_info "Tentative de récupération du dossier existant..."
  folder_response=$(grafana_request GET "/api/folders/${FOLDER_UID}" 2>&1 || true)
  folder_uid=$(echo "$folder_response" | jq -r '.uid // empty')
fi

if [[ -z "$folder_uid" ]]; then
  log_error "Impossible de créer ou récupérer le dossier Grafana. Réponse: ${folder_response}"
  exit 1
fi

log_ok "Dossier prêt: ${folder_uid}"

# ── Import des dashboards ──────────────────────────────────────────────────────

success_count=0
failure_count=0

for dashboard_file in "${DASHBOARDS_DIR}"/*.json; do
  dashboard_name=$(basename "$dashboard_file" .json)
  dashboard_title=$(jq -r '.title // "Inconnu"' "$dashboard_file")
  log_info "Import: ${dashboard_name} ('${dashboard_title}')..."

  # Construire le payload d'import avec folderUid et overwrite
  payload=$(jq \
    --arg folder_uid "$folder_uid" \
    '{dashboard: ., folderUid: $folder_uid, overwrite: true, message: "Provisioning automatique via GitOps"}' \
    "$dashboard_file")

  result=$(grafana_request POST "/api/dashboards/import" "$payload" 2>&1 || true)

  status=$(echo "$result" | jq -r '.status // .message // "unknown"')
  dashboard_url=$(echo "$result" | jq -r '.importedUrl // .url // ""')

  if [[ "$status" == "success" ]] || echo "$result" | jq -e '.id' &>/dev/null; then
    log_ok "  Importe avec succes. URL: ${GRAFANA_URL}${dashboard_url}"
    success_count=$((success_count + 1))
  else
    log_error "  Echec import '${dashboard_name}'. Statut: ${status}. Réponse: ${result}"
    failure_count=$((failure_count + 1))
  fi
done

# ── Rapport final ──────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
log_info "Provisioning terminé."
log_ok  "  Succes: ${success_count}"
if [[ $failure_count -gt 0 ]]; then
  log_error "  Echecs: ${failure_count}"
  exit 1
else
  log_ok "  Echecs: 0"
fi
echo "═══════════════════════════════════════════"
