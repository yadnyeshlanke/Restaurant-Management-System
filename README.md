# Saffron Table: Restaurant Management System

Dashboard, order taking, table floor, and menu management. Plain HTML, CSS, and JavaScript. Data is saved in the browser (localStorage). Containerised with Docker and delivered with a Jenkins pipeline.

```
restaurant-management-system/
├── public/            index.html, style.css, app.js
├── Dockerfile
├── Jenkinsfile
├── .dockerignore
└── .gitignore
```

# Steps to complete the project

## 1. Run locally in VS Code
1. Install VS Code, then the **Live Server** extension (Ritwick Dey).
2. File > Open Folder > `restaurant-management-system`.
3. Right-click `public/index.html` > **Open with Live Server**. The app opens at http://127.0.0.1:5500/public/index.html.
4. Test the flow: Menu (add a dish) > Tables (pick a free table) > Orders (add dishes, place order, advance status through to payment) > Dashboard (revenue updates).

## 2. Push to GitHub
1. Install Git. Run once: `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.
2. On github.com click **New repository**, name it `restaurant-management-system`, leave it empty (no README), click Create.
3. In the VS Code terminal:
```
git init
git add .
git commit -m "Initial commit: restaurant management system"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/restaurant-management-system.git
git push -u origin main
```
4. When asked to sign in, use your browser login, or a Personal Access Token (Settings > Developer settings > Tokens) as the password.

## 3. Build and run with Docker
1. Install Docker Desktop (Windows/Mac) or Docker Engine (Linux). Check with `docker --version`.
2. Build: `docker build -t restaurant-management-system .`
3. Run: `docker run -d --name restaurant-app -p 8080:80 restaurant-management-system`
4. Open http://localhost:8080.
5. Stop and remove: `docker rm -f restaurant-app`.
6. Create a free Docker Hub account and a repository named `restaurant-management-system`. In Docker Hub go to Account Settings > Security > **New Access Token** (Read & Write). Copy it.

## 4. Install Jenkins (in Docker, with access to Docker)
1. Start Jenkins:
```
docker run -d --name jenkins -p 8082:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -u root jenkins/jenkins:lts-jdk17
```
2. Install the Docker CLI inside it:
```
docker exec -u root jenkins bash -c "apt-get update && apt-get install -y docker.io"
```
3. Get the unlock password: `docker logs jenkins` (or `docker exec jenkins cat /var/jenkins_home/secrets/initialAdminPassword`).
4. Open http://localhost:8082, paste the password, choose **Install suggested plugins**, create your admin user.
5. Manage Jenkins > Plugins > Available: confirm **Git**, **GitHub**, **Pipeline**, **Docker Pipeline**, and **Credentials Binding** are installed.
   On Windows, use Docker Desktop with the WSL2 backend; the socket mount works the same inside WSL.

## 5. Connect Jenkins to Docker Hub
1. Manage Jenkins > Credentials > System > Global credentials > **Add Credentials**.
2. Kind: *Username with password*. Username: your Docker Hub username. Password: the access token from step 3.6.
3. ID: `dockerhub-creds` (must match the Jenkinsfile). Save.
4. Open `Jenkinsfile`, replace `YOUR_DOCKERHUB_USERNAME`, commit and push.

## 6. Create the pipeline job
1. Jenkins dashboard > **New Item** > name `restaurant-pipeline` > **Multibranch Pipeline** > OK.
   (Multibranch is needed because the Push and Deploy stages use `when { branch 'main' }`.)
2. Branch Sources > Add source > **GitHub** (or Git). Paste your repo URL. For a private repo, add a GitHub token credential.
3. Build Configuration: Mode *by Jenkinsfile*, Script Path `Jenkinsfile`. Save. Jenkins scans and builds `main`.
4. Watch the stages: Checkout, Build image, Smoke test, Push, Deploy. When it is green, open http://localhost:8081 to see the deployed app, and check Docker Hub for the new image tag.

## 7. Trigger builds automatically on every push
1. Jenkins must be reachable from GitHub. For local testing run `ngrok http 8082` and copy the https URL.
2. GitHub repo > Settings > Webhooks > **Add webhook**.
   Payload URL: `https://YOUR-NGROK-URL/github-webhook/`, content type `application/json`, event *Just the push event*.
3. Jenkins job > Configure > Scan Repository Triggers: tick *Periodically if not otherwise run* (e.g. 1 minute) as a fallback if you skip the webhook.
4. Change something (for example a dish name in `app.js`), then `git commit` and `git push`. A build starts, and the new version goes live at port 8081.

## 8. Troubleshooting
- `permission denied ... docker.sock`: run the Jenkins container with `-u root` (as above) or add the jenkins user to the docker group.
- `docker: not found` in a stage: repeat step 4.2.
- Push stage skipped: you are on a branch other than `main`; this is intended.
- Port already in use: change `HOST_PORT` in the Jenkinsfile.
- Login fails in Push stage: re-check the credential ID and the token's Read & Write permission.

## 9. Ideas to extend
Reservations page, kitchen display screen, printable bills, charts with Chart.js, a Node/Express + MongoDB backend (add a second Dockerfile and `docker-compose.yml`), and unit tests with Jest as a new Jenkins stage.
