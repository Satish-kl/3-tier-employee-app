pipeline {
    agent any

    environment {
        APP_DIR = '/home/ubuntu/3-tier-employee-app'

        API_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-api:latest'
        FRONTEND_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-frontend:latest'
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
                    set -e
                    docker compose config -q
                '''
            }
        }

        stage('Application Test') {
            steps {
                sh '''
                    set -e
                    docker compose build api
                    docker compose run --rm --no-deps api npm test
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -e
                    docker compose build api frontend

                    docker tag \
                      $(docker compose images -q api) \
                      ${API_IMAGE}

                    docker tag \
                      $(docker compose images -q frontend) \
                      ${FRONTEND_IMAGE}
                '''
            }
        }

        stage('Verify Docker Images') {
            steps {
                sh '''
                    set -e

                    echo "Checking API image..."
                    docker image inspect ${API_IMAGE}

                    echo "Checking Frontend image..."
                    docker image inspect ${FRONTEND_IMAGE}

                    echo "Docker images verified successfully."
                '''
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    set +e

                    echo "Scanning API image..."
                    trivy image \
                      --severity HIGH,CRITICAL \
                      --exit-code 0 \
                      ${API_IMAGE}

                    echo "Scanning Frontend image..."
                    trivy image \
                      --severity HIGH,CRITICAL \
                      --exit-code 0 \
                      ${FRONTEND_IMAGE}

                    echo "Trivy scanning completed."
                '''
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: 'dockerhub-creds',
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -e

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
                    set -e

                    docker push ${API_IMAGE}
                    docker push ${FRONTEND_IMAGE}

                    echo "Docker images pushed successfully."
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Deploying application to EC2..."
                        echo "API Image: ${API_IMAGE}"
                        echo "Frontend Image: ${FRONTEND_IMAGE}"

                        ssh -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SSH_USER@35.173.29.47" "
                                set -e

                                APP_DIR='/home/ubuntu/3-tier-employee-app'
                                API_IMAGE='satishdd/docker-mysql-nodejs-reactjs-app-api:latest'
                                FRONTEND_IMAGE='satishdd/docker-mysql-nodejs-reactjs-app-frontend:latest'

                                cd \$APP_DIR

                                echo '======================================'
                                echo 'Current Application Status'
                                echo '======================================'
                                docker compose ps || true

                                echo '======================================'
                                echo 'Saving Current Images for Rollback'
                                echo '======================================'

                                PREVIOUS_API_IMAGE=\\$(docker inspect -f '{{.Config.Image}}' 3-tier-employee-app-api-1 2>/dev/null || true)
                                PREVIOUS_FRONTEND_IMAGE=\\$(docker inspect -f '{{.Config.Image}}' 3-tier-employee-app-frontend-1 2>/dev/null || true)

                                echo \"Previous API image: \\$PREVIOUS_API_IMAGE\"
                                echo \"Previous Frontend image: \\$PREVIOUS_FRONTEND_IMAGE\"

                                echo '======================================'
                                echo 'Pulling Latest Docker Images'
                                echo '======================================'

                                docker pull \\$API_IMAGE
                                docker pull \\$FRONTEND_IMAGE

                                echo '======================================'
                                echo 'Deploying Latest Containers'
                                echo '======================================'

                                API_IMAGE=\\$API_IMAGE FRONTEND_IMAGE=\\$FRONTEND_IMAGE \
                                docker compose up -d --no-build

                                echo '======================================'
                                echo 'Waiting for Containers'
                                echo '======================================'

                                sleep 15

                                echo '======================================'
                                echo 'Container Status'
                                echo '======================================'

                                docker compose ps

                                echo '======================================'
                                echo 'API Health Check'
                                echo '======================================'

                                HEALTH_RESPONSE=\\$(curl -fsS http://localhost:3000/health)

                                echo \"\\$HEALTH_RESPONSE\"

                                echo '======================================'
                                echo 'API CRUD Check'
                                echo '======================================'

                                USER_RESPONSE=\\$(curl -fsS http://localhost:3000/user)

                                echo \"\\$USER_RESPONSE\"

                                echo '======================================'
                                echo 'Frontend Check'
                                echo '======================================'

                                curl -fsS http://localhost:3001 > /dev/null

                                echo 'Frontend is responding successfully.'

                                echo '======================================'
                                echo 'DEPLOYMENT SUCCESSFUL'
                                echo '======================================'
                            "
                    '''
                }
            }
        }

        stage('Deployment Verification') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: 'ec2-ssh-key',
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Final deployment verification..."

                        ssh -i "$SSH_KEY" \
                            -o StrictHostKeyChecking=no \
                            "$SSH_USER@35.173.29.47" "
                                set -e

                                cd /home/ubuntu/3-tier-employee-app

                                echo 'Container status:'
                                docker compose ps

                                echo 'API health:'
                                curl -fsS http://localhost:3000/health

                                echo
                                echo 'API users:'
                                curl -fsS http://localhost:3000/user

                                echo
                                echo 'Frontend check:'
                                curl -fsS http://localhost:3001 > /dev/null

                                echo 'Frontend is healthy.'
                            "
                    '''
                }
            }
        }

        stage('Docker Cleanup') {
            steps {
                sh '''
                    set +e

                    echo "Cleaning unused Docker resources..."

                    docker container prune -f
                    docker image prune -f

                    echo "Docker cleanup completed."
                '''
            }
        }
    }

    post {
        success {
            echo '======================================'
            echo 'JENKINS CI/CD PIPELINE SUCCESSFUL'
            echo '======================================'
        }

        failure {
            echo '======================================'
            echo 'JENKINS CI/CD PIPELINE FAILED'
            echo 'Check the failed stage and console log.'
            echo '======================================'
        }

        always {
            echo 'Pipeline execution completed.'
        }
    }
}

