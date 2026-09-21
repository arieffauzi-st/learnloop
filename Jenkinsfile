pipeline {
  agent any

  options {
    timestamps()
    buildDiscarder(logRotator(numToKeepStr: '30'))
  }

  environment {
    CI = 'true'
  }

  stages {
    stage('Backend — lint') {
      steps {
        dir('backend') {
          sh 'export PATH="$HOME/.local/bin:$PATH"; command -v uv >/dev/null 2>&1 || curl -LsSf https://astral.sh/uv/install.sh | sh'
          sh 'export PATH="$HOME/.local/bin:$PATH"; uv sync --frozen || uv sync; uv run ruff check .'
        }
      }
    }
    stage('Backend — test') {
      steps {
        dir('backend') {
          sh 'export PATH="$HOME/.local/bin:$PATH"; uv run pytest -q'
        }
      }
    }
    stage('Frontend — typecheck + test + build') {
      steps {
        dir('frontend') {
          sh 'npm ci'
          sh 'npx tsc --noEmit'
          sh 'npm run test -- --run'
          sh 'npm run build'
        }
      }
    }
    stage('Compose — validate') {
      steps {
        sh 'docker compose config -q'
      }
    }
    stage('Deploy — prod') {
      steps {
        withCredentials([string(credentialsId: 'learnloop-kc-admin-password', variable: 'KC_PW')]) {
          sh '''#!/bin/bash
set -euo pipefail
# Deploy from a PERSISTENT copy: cleanWs() deletes this workspace after the
# build, and bind mounts (keycloak realm) would then point at a deleted dir.
DEPLOY_DIR=/var/jenkins_home/deploy/learnloop
mkdir -p "$DEPLOY_DIR"
# rsync is not installed in the Jenkins image; rm+tar copy is equivalent to rsync -a --delete
rm -rf "$DEPLOY_DIR"/*
tar -C . --exclude .git -cf - . | tar -C "$DEPLOY_DIR" -xf -
cd "$DEPLOY_DIR"
# Seed the Keycloak import realm via a NAMED VOLUME. Bind mounts do NOT work
# here: compose runs inside the Jenkins container, so relative paths resolve
# against the container filesystem while the Docker daemon resolves them on
# the host - it silently creates an empty dir and the realm never imports.
docker volume create learnloop-kc-import >/dev/null
tar -C keycloak -cf - . | docker run --rm -i -v learnloop-kc-import:/tgt alpine sh -c 'rm -rf /tgt/* && tar -C /tgt -xf -'

printf 'KC_ADMIN_PASSWORD=%s\\n' "$KC_PW" > .env
trap 'rm -f .env' EXIT
docker compose -p learnloop -f docker-compose.arief.yml up -d --build --force-recreate
docker image prune -f
'''
        }
      }
    }
    stage('Smoke test') {
      steps {
        sh '''#!/bin/bash
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w '%{http_code}' https://learnloop.ariefspace.xyz/health || true)
  [ "$code" = "200" ] && echo "health OK" && exit 0
  echo "attempt $i: $code"; sleep 5
done
echo "health check failed"; exit 1
'''
      }
    }
  }

  post {
    always {
      cleanWs()
    }
  }
}
