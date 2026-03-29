pipeline {
    agent { label 'slave' }

    environment {
        APP_SERVER = "<APP_SERVER_IP>"
    }

    stages {

        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build & Test') {
            steps {
                sh 'mvn clean test'
            }
        }

        stage('Security Scan') {
            steps {
                sh '''
                mvn org.owasp:dependency-check-maven:check || true
                '''
            }
        }

        stage('Package') {
            steps {
                sh 'mvn clean package -DskipTests'
                archiveArtifacts artifacts: '**/target/*.jar', fingerprint: true
            }
        }

        stage('Deploy to Server') {
            when {
                branch 'main'
            }
            steps {
                sshagent(credentials: ['deploy-key']) {
                    sh '''
                    scp target/*.jar ubuntu@$APP_SERVER:/home/ubuntu/app.jar
                    ssh ubuntu@$APP_SERVER "pkill -f app.jar || true"
                    ssh ubuntu@$APP_SERVER "nohup java -jar /home/ubuntu/app.jar > app.log 2>&1 &"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Build SUCCESS'
        }
        failure {
            echo 'Build FAILED'
        }
    }
}
