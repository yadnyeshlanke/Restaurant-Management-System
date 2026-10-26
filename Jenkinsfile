pipeline {
  agent any

  environment {
    IMAGE     = "YOUR_DOCKERHUB_USERNAME/restaurant-management-system"
    CONTAINER = "restaurant-app"
    HOST_PORT = "8081"
    REGISTRY  = credentials('dockerhub-creds')   // Jenkins username/password credential
  }

  options { timestamps(); disableConcurrentBuilds() }

  stages {
    stage('Checkout') {
      steps { checkout scm }
    }

    stage('Build image') {
      steps { sh 'docker build -t $IMAGE:$BUILD_NUMBER -t $IMAGE:latest .' }
    }

    stage('Smoke test') {
      steps {
        sh '''
          docker rm -f test-$BUILD_NUMBER 2>/dev/null || true
          docker run -d --name test-$BUILD_NUMBER $IMAGE:$BUILD_NUMBER
          sleep 4
          docker exec test-$BUILD_NUMBER wget -qO- http://localhost/ | grep -q "Saffron Table"
        '''
      }
      post { always { sh 'docker rm -f test-$BUILD_NUMBER || true' } }
    }

    stage('Push to Docker Hub') {
      when { branch 'main' }
      steps {
        sh '''
          echo $REGISTRY_PSW | docker login -u $REGISTRY_USR --password-stdin
          docker push $IMAGE:$BUILD_NUMBER
          docker push $IMAGE:latest
        '''
      }
    }

    stage('Deploy') {
      when { branch 'main' }
      steps {
        sh '''
          docker rm -f $CONTAINER || true
          docker run -d --name $CONTAINER --restart unless-stopped -p $HOST_PORT:80 $IMAGE:latest
        '''
      }
    }
  }

  post {
    success { echo "Deployed: http://localhost:${HOST_PORT}" }
    failure { echo 'Build failed. Check the stage logs above.' }
    always  { sh 'docker logout || true' }
  }
}
