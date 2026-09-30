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
                    docker compose run --rm --no-deps api npm test
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

                            echo "========================================"
                            echo "Saving current images for rollback"
                            echo "========================================"

                            PREVIOUS_API_IMAGE=$(docker inspect -f "{{.Config.Image}}" 3-tier-employee-app-api-1 2>/dev/null || true)
                            PREVIOUS_FRONTEND_IMAGE=$(docker inspect -f "{{.Config.Image}}" 3-tier-employee-app-frontend-1 2>/dev/null || true)

                            echo "Previous API image: $PREVIOUS_API_IMAGE"
                            echo "Previous Frontend image: $PREVIOUS_FRONTEND_IMAGE"

                            echo "========================================"
                            echo "Pulling latest Docker images"
                            echo "========================================"

                            docker pull ${API_IMAGE}
                            docker pull ${FRONTEND_IMAGE}

                            echo "========================================"
                            echo "Deploying with Docker Compose"
                            echo "========================================"

                            DEPLOY_SUCCESS=true

                            if ! API_IMAGE=${API_IMAGE} FRONTEND_IMAGE=${FRONTEND_IMAGE} docker compose up -d --no-build; then
                                echo "Docker Compose deployment failed"
                                DEPLOY_SUCCESS=false
                            fi

                            if [ "$DEPLOY_SUCCESS" = "true" ]; then

                                echo "========================================"
                                echo "Waiting for services"
                                echo "========================================"

                                sleep 15

                                echo "========================================"
                                echo "Compose status"
                                echo "========================================"

                                docker compose ps

                                echo "========================================"
                                echo "Checking API health"
                                echo "========================================"

                                if curl -f http://localhost:3000/health; then
                                    echo "API health check PASSED"
                                else
                                    echo "API health check FAILED"
                                    DEPLOY_SUCCESS=false
                                fi

                            fi

                            if [ "$DEPLOY_SUCCESS" = "true" ]; then

                                echo "========================================"
                                echo "Checking API data"
                                echo "========================================"

                                if curl -f http://localhost:3000/user; then
                                    echo "API data check PASSED"
                                else
                                    echo "API data check FAILED"
                                    DEPLOY_SUCCESS=false
                                fi

                            fi

                            if [ "$DEPLOY_SUCCESS" = "true" ]; then

                                echo "========================================"
                                echo "Checking Frontend"
                                echo "========================================"

                                if curl -f http://localhost:3001; then
                                    echo "Frontend health check PASSED"
                                else
                                    echo "Frontend health check FAILED"
                                    DEPLOY_SUCCESS=false
                                fi

                            fi

                            if [ "$DEPLOY_SUCCESS" = "true" ]; then

                                echo "========================================"
                                echo "DEPLOYMENT SUCCESSFUL"
                                echo "========================================"

                            else

                                echo "========================================"
                                echo "DEPLOYMENT FAILED"
                                echo "STARTING ROLLBACK"
                                echo "========================================"

                                if [ -n "$PREVIOUS_API_IMAGE" ] && [ -n "$PREVIOUS_FRONTEND_IMAGE" ]; then

                                    echo "Restoring previous API image:"
                                    echo "$PREVIOUS_API_IMAGE"

                                    echo "Restoring previous Frontend image:"
                                    echo "$PREVIOUS_FRONTEND_IMAGE"

                                    API_IMAGE=$PREVIOUS_API_IMAGE \
                                    FRONTEND_IMAGE=$PREVIOUS_FRONTEND_IMAGE \
                                    docker compose up -d --no-build

                                    echo "========================================"
                                    echo "ROLLBACK COMPLETED"
                                    echo "========================================"

                                    docker compose ps

                                    echo "Checking API after rollback..."
                                    curl -f http://localhost:3000/health

                                    echo "Rollback verification completed."

                                else

                                    echo "Previous images were not found."
                                    echo "Rollback could not be performed."

                                fi

                                exit 1

                            fi

                            echo "========================================"
                            echo "Deployment verification completed"
                            echo "========================================"
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

                        echo "========================================"
                        echo "Final service status"
                        echo "========================================"

                        docker compose ps

                        echo "========================================"
                        echo "Final API health check"
                        echo "========================================"

                        curl -f http://localhost:3000/health

                        echo "========================================"
                        echo "Final API data check"
                        echo "========================================"

                        curl -f http://localhost:3000/user

                        echo "========================================"
                        echo "Final Frontend check"
                        echo "========================================"

                        curl -f http://localhost:3001

                        echo "========================================"
                        echo "Database persistent volume"
                        echo "========================================"

                        docker volume ls | grep mysql_data || true

                        echo "========================================"
                        echo "Deployment verification PASSED"
                        echo "========================================"
                    '
                '''
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
