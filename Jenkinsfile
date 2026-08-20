pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build API Image') {
            steps {
                sh 'docker compose build api'
            }
        }

        stage('Build Frontend Image') {
            steps {
                sh 'docker compose build frontend'
            }
        }

        stage('Verify Docker Images') {
            steps {
                sh 'docker images'
            }
        }
    }
}
