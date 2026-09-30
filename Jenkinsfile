pipeline {
    agent any

    environment {
        API_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-api:latest'
        FRONTEND_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-frontend:latest'

        EC2_HOST = '35.173.29.47'
        EC2_USER = 'ubuntu'
        APP_DIR = '/home/ubuntu/3-tier-employee-app'
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Validate Compose') {
            steps {
                sh '''
                    docker compose config -q
                '''
            }
        }

        stage('Application Test') {
            steps {
                sh '''
                    docker compose build api
                    docker compose run --rm api npm test
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    docker compose build api frontend
                '''
            }
        }

        stage('Verify Docker Images') {
            steps {
                sh '''
                    docker image inspect "$API_IMAGE"
                    docker image inspect "$FRONTEND_IMAGE"
                '''
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    mkdir -p trivy-reports

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --format table \
                      --output trivy-reports/api-trivy.txt \
                      "$API_IMAGE" || true

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --format table \
                      --output trivy-reports/frontend-trivy.txt \
                      "$FRONTEND_IMAGE" || true
                '''
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
                        echo "$DOCKER_PASSWORD" | docker login \
                            -u "$DOCKER_USERNAME" \
                            --password-stdin
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                sh '''
                    docker push "$API_IMAGE"
                    docker push "$FRONTEND_IMAGE"
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['ec2-ssh-key']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                            set -e

                            cd ${APP_DIR}

                            echo "===== Pulling latest images ====="
                            docker pull ${API_IMAGE}
                            docker pull ${FRONTEND_IMAGE}

                            echo "===== Starting deployment with Docker Compose ====="
                            docker compose up -d --no-build

                            echo "===== Waiting for services ====="
                            sleep 15

                            echo "===== Compose status ====="
                            docker compose ps

                            echo "===== API health check ====="
                            curl -f http://localhost:3000/health

                            echo "===== API data check ====="
                            curl -f http://localhost:3000/user

                            echo "===== Frontend health check ====="
                            curl -f http://localhost:3001

                            echo "===== Deployment successful ====="
                        '
                    '''
                }
            }
        }

        stage('Deployment Verification') {
            steps {
                sh '''
                    ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                        cd ${APP_DIR}

                        echo "===== Final service status ====="
                        docker compose ps

                        echo "===== API health ====="
                        curl -f http://localhost:3000/health

                        echo "===== Frontend response ====="
                        curl -f http://localhost:3001

                        echo "===== Database volume ====="
                        docker volume ls | grep mysql_data || true
                    '
                }
            }
        }

        stage('Docker Cleanup') {
            steps {
                sh '''
                    docker image prune -f
                '''
            }
        }
    }

    post {

        always {
            archiveArtifacts(
                artifacts: 'trivy-reports/*.txt',
                allowEmptyArchive: true
            )
        }

        success {
            echo 'CI/CD pipeline completed successfully.'
        }

        failure {
            echo 'CI/CD pipeline failed. Check the Jenkins console output.'
        }
    }
}
