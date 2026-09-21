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
  }

  post {
    always {
      cleanWs()
    }
  }
}
