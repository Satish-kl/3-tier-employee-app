pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Images') {
            steps {
                sh 'docker compose build'
            }
        }

        stage('Verify Docker Images') {
            steps {
                sh 'docker images'
            }
        }
    }
}
 
