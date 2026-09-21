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
          sh 'uv sync --frozen || uv sync'
          sh 'uv run ruff check .'
        }
      }
    }
    stage('Backend — test') {
      steps {
        dir('backend') {
          sh 'uv run pytest -q'
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
      when { branch 'main' }
      steps {
        withCredentials([string(credentialsId: 'learnloop-kc-admin-password', variable: 'KC_PW')]) {
          sh '''#!/bin/bash
set -euo pipefail
printf 'KC_ADMIN_PASSWORD=%s\n' "$KC_PW" > .env
trap 'rm -f .env' EXIT
docker compose -p learnloop -f docker-compose.traefik.yml up -d --build
docker image prune -f
'''
        }
      }
    }
    stage('Smoke test') {
      when { branch 'main' }
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
