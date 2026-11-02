#!/usr/bin/env bash
set -euo pipefail
cd /opt/projects/aeron
if docker compose exec -T site test -f /var/lib/aeron/auth.json; then
  echo 'Administrator password is already configured.'
  exit 1
fi
read -r -s -p 'New AERON administrator password (at least 12 characters): ' password
printf '\n'
read -r -s -p 'Repeat password: ' repeated
printf '\n'
if [ "$password" != "$repeated" ] || [ "${#password}" -lt 12 ]; then
  echo 'Passwords must match and contain at least 12 characters.'
  exit 1
fi
printf '%s' "$password" | docker compose exec -T site node --input-type=module -e '
let password="";for await(const chunk of process.stdin)password+=chunk;
const response=await fetch("http://127.0.0.1:4186/api/admin/setup",{method:"POST",headers:{"Origin":"http://127.0.0.1:4186","Content-Type":"application/json"},body:JSON.stringify({password})});
const result=await response.json();if(!response.ok){console.error(result.error||"Setup failed");process.exit(1);}console.log("Administrator password configured.");'
unset password repeated
