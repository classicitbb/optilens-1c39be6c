#!/usr/bin/env bash
set -euo pipefail

# Some environments inject deprecated npm_config_http_proxy env vars that
# trigger: "npm warn Unknown env config \"http-proxy\"" on every npm invocation.
# Strip those vars and map to supported proxy env vars for compatibility.
unset npm_config_http_proxy
unset NPM_CONFIG_HTTP_PROXY

if [[ -n "${HTTP_PROXY:-}" && -z "${npm_config_proxy:-}" ]]; then
  export npm_config_proxy="$HTTP_PROXY"
fi

if [[ -n "${HTTPS_PROXY:-}" && -z "${npm_config_https_proxy:-}" ]]; then
  export npm_config_https_proxy="$HTTPS_PROXY"
fi

exec npm "$@"
