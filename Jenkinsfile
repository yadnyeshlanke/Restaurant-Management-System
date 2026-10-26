pipeline {
  agent any
  environment {
    IMAGE     = "yadnyeshlanke/restaurant-management-system"
    CONTAINER = "restaurant-app"
    HOST_PORT = "8081"
    REGISTRY  = credentials('dockerhub-creds')
  }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Build image') {
      steps { bat 'docker build -t %IMAGE%:%BUILD_NUMBER% -t %IMAGE%:latest .' }
    }
    stage('Smoke test') {
      steps {
        bat '''
          docker rm -f test-%BUILD_NUMBER% 2>nul
          docker run -d --name test-%BUILD_NUMBER% %IMAGE%:%BUILD_NUMBER%
          ping -n 6 127.0.0.1 >nul
          docker exec test-%BUILD_NUMBER% wget -qO- http://localhost/ | findstr "Saffron"
        '''
      }
      post { always { bat 'docker rm -f test-%BUILD_NUMBER%' } }
    }
    stage('Push to Docker Hub') {
      when { branch 'main' }
      steps {
        bat '''
          echo %REGISTRY_PSW%| docker login -u %REGISTRY_USR% --password-stdin
          docker push %IMAGE%:%BUILD_NUMBER%
          docker push %IMAGE%:latest
        '''
      }
    }
    stage('Deploy') {
      when { branch 'main' }
      steps {
        bat '''
          docker rm -f %CONTAINER% 2>nul
          docker run -d --name %CONTAINER% --restart unless-stopped -p %HOST_PORT%:80 %IMAGE%:latest
        '''
      }
    }
  }
}