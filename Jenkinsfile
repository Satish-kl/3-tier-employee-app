pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'satishdd'
    }

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

        stage('Login to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'dockerhub-creds',
                    usernameVariable: 'DOCKER_USERNAME',
                    passwordVariable: 'DOCKER_PASSWORD'
                )]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                    '''
                }
            }
        }

        stage('Tag Docker Images') {
            steps {
                sh '''
                    docker tag workspace-api:latest $DOCKERHUB_USER/docker-mysql-nodejs-reactjs-app-api:latest
                    docker tag workspace-frontend:latest $DOCKERHUB_USER/docker-mysql-nodejs-reactjs-app-frontend:latest
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                sh '''
                    docker push $DOCKERHUB_USER/docker-mysql-nodejs-reactjs-app-api:latest
                    docker push $DOCKERHUB_USER/docker-mysql-nodejs-reactjs-app-frontend:latest
                '''
            }
        }
    }
}
