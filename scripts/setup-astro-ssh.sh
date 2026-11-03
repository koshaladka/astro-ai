#!/usr/bin/env bash
# Ставит SSH-ключ на агента из секретов Cursor (любой новый чат).
# Нужны env: ASTRO_SSH_PRIVATE_KEY, опционально ASTRO_SSH_HOST / ASTRO_SSH_USER.
set -euo pipefail

KEY="${ASTRO_SSH_PRIVATE_KEY:-}"
if [[ -z "$KEY" ]]; then
  echo "ASTRO_SSH_PRIVATE_KEY не задан — SSH к серверу недоступен в этом чате."
  echo "Добавь Runtime Secret в Cloud Agents → Environment → Secrets."
  exit 1
fi

mkdir -p "$HOME/.ssh"
chmod 700 "$HOME/.ssh"
# поддержка ключа с литералами \n из UI секретов
printf '%b\n' "$KEY" > "$HOME/.ssh/id_ed25519"
# если UI сохранил реальные переносы — файл уже ок; убрать лишний escape
if ! ssh-keygen -y -f "$HOME/.ssh/id_ed25519" >/dev/null 2>&1; then
  printf '%s\n' "$KEY" > "$HOME/.ssh/id_ed25519"
fi
chmod 600 "$HOME/.ssh/id_ed25519"

HOST="${ASTRO_SSH_HOST:-104.253.18.4}"
USER_NAME="${ASTRO_SSH_USER:-root}"

ssh-keyscan -H "$HOST" >> "$HOME/.ssh/known_hosts" 2>/dev/null || true
chmod 644 "$HOME/.ssh/known_hosts"

# быстрый алиас
grep -q "Host astro-vps" "$HOME/.ssh/config" 2>/dev/null || cat >> "$HOME/.ssh/config" <<EOF
Host astro-vps
  HostName $HOST
  User $USER_NAME
  IdentityFile ~/.ssh/id_ed25519
  IdentitiesOnly yes
EOF
chmod 600 "$HOME/.ssh/config"

echo "SSH готов: ssh astro-vps  (или ssh $USER_NAME@$HOST)"
ssh -o BatchMode=yes -o ConnectTimeout=10 astro-vps 'echo OK; hostname' || {
  echo "Ключ установлен, но вход не прошёл — проверь authorized_keys на сервере."
  exit 1
}
