pipeline {

    agent any

    environment {
        DOCKERHUB_USER = 'satishdd'

        API_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-api:latest'
        FRONTEND_IMAGE = 'satishdd/docker-mysql-nodejs-reactjs-app-frontend:latest'

        DOCKERHUB_CREDENTIALS = 'dockerhub-creds'
        EC2_CREDENTIALS = 'ec2-ssh-key'

        EC2_USER = 'ubuntu'
        EC2_HOST = '35.173.29.47'

        COMPOSE_PROJECT_NAME = 'three-tier'
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

                    echo "Validating Docker Compose configuration..."
                    docker compose config -q

                    echo "Docker Compose validation successful."
                '''
            }
        }

        stage('Application Test') {
            steps {
                sh '''
                    set -e

                    echo "Building API for application test..."
                    docker compose build api

                    echo "Running API syntax test..."
                    docker compose run --rm --no-deps api npm test

                    echo "Application test successful."
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "BUILDING API IMAGE"
                    echo "======================================"

                    docker compose build api

                    echo "======================================"
                    echo "BUILDING FRONTEND IMAGE"
                    echo "======================================"

                    docker compose build frontend

                    echo "======================================"
                    echo "VERIFYING API IMAGE"
                    echo "======================================"

                    docker image inspect "${API_IMAGE}" > /dev/null

                    echo "API image exists: ${API_IMAGE}"

                    echo "======================================"
                    echo "VERIFYING FRONTEND IMAGE"
                    echo "======================================"

                    docker image inspect "${FRONTEND_IMAGE}" > /dev/null

                    echo "Frontend image exists: ${FRONTEND_IMAGE}"

                    echo "======================================"
                    echo "DOCKER IMAGES BUILT SUCCESSFULLY"
                    echo "======================================"
                '''
            }
        }

        stage('Verify Docker Images') {
            steps {
                sh '''
                    set -e

                    echo "Checking API image..."
                    docker image inspect "${API_IMAGE}"

                    echo "Checking Frontend image..."
                    docker image inspect "${FRONTEND_IMAGE}"

                    echo "Listing application images..."
                    docker images | grep "satishdd/docker-mysql-nodejs-reactjs-app"

                    echo "Docker image verification successful."
                '''
            }
        }

        stage('Trivy Scan') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "TRIVY SECURITY SCAN - API"
                    echo "======================================"

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --format table \
                      "${API_IMAGE}" | tee trivy-api-report.txt

                    echo "======================================"
                    echo "TRIVY SECURITY SCAN - FRONTEND"
                    echo "======================================"

                    trivy image \
                      --severity HIGH,CRITICAL \
                      --format table \
                      "${FRONTEND_IMAGE}" | tee trivy-frontend-report.txt

                    echo "Trivy scan completed."
                '''
            }

            post {
                always {
                    archiveArtifacts artifacts: 'trivy-api-report.txt,trivy-frontend-report.txt',
                    allowEmptyArchive: true
                }
            }
        }

        stage('Docker Hub Login') {
            steps {
                withCredentials([
                    usernamePassword(
                        credentialsId: "${DOCKERHUB_CREDENTIALS}",
                        usernameVariable: 'DOCKER_USERNAME',
                        passwordVariable: 'DOCKER_PASSWORD'
                    )
                ]) {
                    sh '''
                        set -e

                        echo "Logging in to Docker Hub..."

                        echo "$DOCKER_PASSWORD" | docker login \
                            -u "$DOCKER_USERNAME" \
                            --password-stdin

                        echo "Docker Hub login successful."
                    '''
                }
            }
        }

        stage('Push Docker Images') {
            steps {
                sh '''
                    set -e

                    echo "Pushing API image..."
                    docker push "${API_IMAGE}"

                    echo "Pushing Frontend image..."
                    docker push "${FRONTEND_IMAGE}"

                    echo "Docker images pushed successfully."
                '''
            }
        }

        /*
         * ============================================================
         * NEW ROLLBACK SUPPORT
         * ============================================================
         *
         * Before deploying the new :latest images, save the currently
         * running EC2 images as :rollback.
         */

        stage('Backup Current EC2 Images') {
            steps {
                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: "${EC2_CREDENTIALS}",
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "BACKING UP CURRENT EC2 IMAGES"
                        echo "======================================"

                        ssh -o StrictHostKeyChecking=no \
                            -i "$SSH_KEY" \
                            "$SSH_USER@$EC2_HOST" \
                            "API_IMAGE='${API_IMAGE}' FRONTEND_IMAGE='${FRONTEND_IMAGE}' bash -s" <<'REMOTE_SCRIPT'

                        set -e

                        cd ~/3-tier-employee-app

                        echo "Checking currently running containers..."

                        API_CONTAINER="3-tier-employee-app-api-1"
                        FRONTEND_CONTAINER="3-tier-employee-app-frontend-1"

                        API_CURRENT=$(docker inspect --format='{{.Image}}' "$API_CONTAINER" 2>/dev/null || true)
                        FRONTEND_CURRENT=$(docker inspect --format='{{.Image}}' "$FRONTEND_CONTAINER" 2>/dev/null || true)

                        if [ -n "$API_CURRENT" ]; then

                            echo "Current API image ID:"
                            echo "$API_CURRENT"

                            docker tag "$API_CURRENT" "${API_IMAGE%:*}:rollback"

                            echo "API rollback image created."

                        else

                            echo "No current API container found."

                        fi

                        if [ -n "$FRONTEND_CURRENT" ]; then

                            echo "Current Frontend image ID:"
                            echo "$FRONTEND_CURRENT"

                            docker tag "$FRONTEND_CURRENT" "${FRONTEND_IMAGE%:*}:rollback"

                            echo "Frontend rollback image created."

                        else

                            echo "No current Frontend container found."

                        fi

                        echo "======================================"
                        echo "CURRENT IMAGES BACKED UP"
                        echo "======================================"

                        docker images | grep "rollback" || true

REMOTE_SCRIPT
                    '''
                }
            }
        }

        /*
         * ============================================================
         * DEPLOYMENT + VERIFICATION
         * ============================================================
         *
         * If deployment or verification fails, catchError allows the
         * pipeline to continue to the rollback stage.
         */

        stage('Deploy and Verify') {

            steps {

                catchError(
                    buildResult: 'FAILURE',
                    stageResult: 'FAILURE'
                ) {

                    withCredentials([
                        sshUserPrivateKey(
                            credentialsId: "${EC2_CREDENTIALS}",
                            keyFileVariable: 'SSH_KEY',
                            usernameVariable: 'SSH_USER'
                        )
                    ]) {

                        sh '''
                            set -e

                            echo "======================================"
                            echo "DEPLOYING TO EC2"
                            echo "======================================"

                            echo "API_IMAGE: ${API_IMAGE}"
                            echo "FRONTEND_IMAGE: ${FRONTEND_IMAGE}"
                            echo "EC2_HOST: ${EC2_HOST}"

                            ssh -o StrictHostKeyChecking=no \
                                -i "$SSH_KEY" \
                                "$SSH_USER@$EC2_HOST" \
                                "API_IMAGE='${API_IMAGE}' FRONTEND_IMAGE='${FRONTEND_IMAGE}' bash -s" <<'REMOTE_SCRIPT'

                            set -e

                            echo "Connected to EC2 successfully."

                            cd ~/3-tier-employee-app

                            echo "Pulling latest API image..."
                            docker pull "$API_IMAGE"

                            echo "Pulling latest Frontend image..."
                            docker pull "$FRONTEND_IMAGE"

                            echo "Stopping existing application containers..."
                            docker compose down

                            echo "Starting application with latest images..."
                            docker compose up -d

                            echo "Waiting for containers to start..."
                            sleep 15

                            echo "Current containers:"
                            docker compose ps

                            echo "EC2 deployment completed."

REMOTE_SCRIPT

                            echo "======================================"
                            echo "VERIFYING EC2 DEPLOYMENT"
                            echo "======================================"

                            ssh -o StrictHostKeyChecking=no \
                                -i "$SSH_KEY" \
                                "$SSH_USER@$EC2_HOST" \
                                "bash -s" <<'REMOTE_SCRIPT'

                            set -e

                            cd ~/3-tier-employee-app

                            echo "Checking Docker containers..."
                            docker compose ps

                            echo "Checking API health..."

                            for i in 1 2 3 4 5 6; do

                                if curl -fsS http://localhost:3000/health; then
                                    echo
                                    echo "API health check successful."
                                    break
                                fi

                                echo "API not ready yet. Waiting..."
                                sleep 5

                                if [ "$i" = "6" ]; then

                                    echo "API health check failed."

                                    docker compose logs --tail=100 api

                                    exit 1

                                fi

                            done

                            echo "Checking employee API..."

                            curl -fsS http://localhost:3000/user

                            echo

                            echo "Deployment verification successful."

REMOTE_SCRIPT
                        '''
                    }
                }
            }
        }

        /*
         * ============================================================
         * ROLLBACK
         * ============================================================
         *
         * This stage executes when Deploy and Verify failed.
         */

        stage('Rollback') {

            when {
                expression {
                    currentBuild.currentResult == 'FAILURE'
                }
            }

            steps {

                withCredentials([
                    sshUserPrivateKey(
                        credentialsId: "${EC2_CREDENTIALS}",
                        keyFileVariable: 'SSH_KEY',
                        usernameVariable: 'SSH_USER'
                    )
                ]) {

                    sh '''
                        set -e

                        echo "======================================"
                        echo "ROLLBACK INITIATED"
                        echo "======================================"

                        ssh -o StrictHostKeyChecking=no \
                            -i "$SSH_KEY" \
                            "$SSH_USER@$EC2_HOST" \
                            "API_IMAGE='${API_IMAGE}' FRONTEND_IMAGE='${FRONTEND_IMAGE}' bash -s" <<'REMOTE_SCRIPT'

                        set -e

                        cd ~/3-tier-employee-app

                        echo "Checking rollback images..."

                        docker image inspect "${API_IMAGE%:*}:rollback"

                        docker image inspect "${FRONTEND_IMAGE%:*}:rollback"

                        echo "Rollback images found."

                        echo "Stopping failed deployment..."

                        docker compose down

                        echo "Restoring previous API image..."

                        docker tag \
                            "${API_IMAGE%:*}:rollback" \
                            "${API_IMAGE}"

                        echo "Restoring previous Frontend image..."

                        docker tag \
                            "${FRONTEND_IMAGE%:*}:rollback" \
                            "${FRONTEND_IMAGE}"

                        echo "Starting previous stable version..."

                        docker compose up -d

                        echo "Waiting for rollback containers..."

                        sleep 20

                        echo "Checking rollback containers..."

                        docker compose ps

                        echo "Checking rollback API health..."

                        curl -fsS http://localhost:3000/health

                        echo

                        echo "Checking rollback employee API..."

                        curl -fsS http://localhost:3000/user

                        echo

                        echo "======================================"
                        echo "ROLLBACK COMPLETED SUCCESSFULLY"
                        echo "======================================"

REMOTE_SCRIPT
                    '''
                }
            }
        }

        stage('Docker Cleanup') {
            steps {
                sh '''
                    set -e

                    echo "======================================"
                    echo "DOCKER CLEANUP"
                    echo "======================================"

                    echo "Removing unused Docker resources..."

                    docker image prune -f

                    docker container prune -f

                    docker network prune -f

                    echo "Docker cleanup completed."
                '''
            }
        }
    }

    post {

        success {
            echo '''
======================================
JENKINS CI/CD PIPELINE SUCCESSFUL
======================================
Checkout                 : SUCCESS
Compose Validation       : SUCCESS
Application Test         : SUCCESS
Docker Build             : SUCCESS
Image Verification       : SUCCESS
Trivy Scan               : SUCCESS
Docker Hub Push          : SUCCESS
EC2 Image Backup         : SUCCESS
EC2 Deployment           : SUCCESS
Deployment Verification  : SUCCESS
Rollback                 : NOT REQUIRED
Docker Cleanup           : SUCCESS
======================================
'''
        }

        failure {
            echo '''
======================================
JENKINS CI/CD PIPELINE FAILED
======================================
Check the failed stage and console log.
If deployment failed, rollback was attempted.
======================================
'''
        }

        always {
            echo "Pipeline execution completed."
        }
    }
}
