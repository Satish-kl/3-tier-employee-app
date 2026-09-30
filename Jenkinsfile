pipeline {
    agent any

    environment {
        DOCKERHUB_USER = 'satishdd'

        API_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-api:latest'
        FRONTEND_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-frontend:latest'

        EC2_HOST = '35.173.29.47'
        EC2_USER = 'ubuntu'
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
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        echo "$DOCKER_PASSWORD" | docker login -u "$DOCKER_USERNAME" --password-stdin
                    '''
                }
            }
        }

        stage('Tag Docker Images') {
            steps {
                sh '''
                    docker tag workspace-api:latest $API_IMAGE
                    docker tag workspace-frontend:latest $FRONTEND_IMAGE
                '''
            }
        }

        stage('Push Docker Images') {
            steps {
                sh '''
                    docker push $API_IMAGE
                    docker push $FRONTEND_IMAGE
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} "
                            set -e

                            echo '===== Pulling latest API image ====='
                            docker pull ${API_IMAGE}

                            echo '===== Pulling latest Frontend image ====='
                            docker pull ${FRONTEND_IMAGE}

                            echo '===== Removing old API container ====='
                            docker rm -f three-tier-api || true

                            echo '===== Starting new API container ====='
                            docker run -d \
                                --name three-tier-api \
                                --network three-tier-network \
                                -p 3000:3000 \
                                -e DB_HOST=three-tier-db \
                                -e DB_PORT=3306 \
                                -e DB_USER=root \
                                -e DB_PASSWORD=pass123 \
                                -e DB_NAME=appdb \
                                ${API_IMAGE}

                            echo '===== Removing old Frontend container ====='
                            docker rm -f three-tier-frontend || true

                            echo '===== Starting new Frontend container ====='
                            docker run -d \
                                --name three-tier-frontend \
                                --network three-tier-network \
                                -p 3001:3000 \
                                ${FRONTEND_IMAGE}

                            echo '===== Waiting for containers ====='
                            sleep 10

                            echo '===== Container status ====='
                            docker ps

                            echo '===== API health check ====='
                            curl -f http://localhost:3000/user

                            echo '===== Frontend health check ====='
                            curl -f http://localhost:3001

                            echo '===== Deployment successful ====='
                        "
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD pipeline failed.'
        }
    }
}