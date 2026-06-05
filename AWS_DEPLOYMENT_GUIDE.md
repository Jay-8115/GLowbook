# AWS EC2 & Docker Deployment Guide

This guide provides step-by-step instructions for deploying the GlowBook shared backend and Admin Dashboard to an AWS EC2 instance.

---

## 1. PRE-REQUISITES

### AWS EC2 Instance Config
- **Instance Type**: `t3.medium` (Recommended minimum for Next.js build caching and DB engines).
- **OS**: Ubuntu 22.04 LTS.
- **Security Group Settings**: Allow incoming traffic on:
  - `80` (HTTP)
  - `443` (HTTPS)
  - `22` (SSH)

### Domain Setup
- Point your domain names (e.g. `api.glowbook.com` and `admin.glowbook.com`) to the public elastic IP address of your EC2 instance.

---

## 2. SET UP EC2 HOST

Connect to your EC2 instance via SSH:
```bash
ssh -i "your-key.pem" ubuntu@your-ec2-ip
```

Update system dependencies:
```bash
sudo apt update && sudo apt upgrade -y
```

Install Docker & Docker Compose:
```bash
sudo apt install docker.io docker-compose -y
sudo systemctl enable --now docker
```

Configure Docker permissions so you don't need `sudo` every command:
```bash
sudo usermod -aG docker $USER
newgrp docker
```

---

## 3. DEPLOY GLOWBOOK

Clone your project repository on the server:
```bash
git clone https://github.com/your-username/glowbook.git
cd glowbook
```

Configure backend Environment Variables:
```bash
nano backend/.env
```
Ensure you update the `DATABASE_URL` for docker container referencing:
```env
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@postgres:5432/glowbook?schema=public"
JWT_ACCESS_SECRET="glowbook_access_secret_123!@#"
JWT_REFRESH_SECRET="glowbook_refresh_secret_987!@#"
REDIS_URL="redis://redis:6379"
```

Start the multi-container stack:
```bash
docker compose up -d --build
```
This builds and starts the Node API server, Postgres DB, Redis Cache, Next.js Admin UI, and Nginx.

---

## 4. RUN DATABASE SEED

Once the database container is online, execute the Prisma migration and seed script to populate mock categories, users, and salon listings:
```bash
# Force Prisma migrations inside backend container
docker compose exec backend npx prisma migrate deploy

# Run seed script
docker compose exec backend npx prisma db seed
```

Verify that the containers are healthy:
```bash
docker compose ps
```

---

## 5. SETUP SSL (HTTPS) WITH LET'S ENCRYPT

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

Run Certbot to generate certificate blocks for your domain:
```bash
sudo certbot --nginx -d api.glowbook.com -d admin.glowbook.com
```

Certbot will automatically configure the SSL lines and redirect HTTP traffic to HTTPS inside your Nginx configuration. Check certificates renewals with:
```bash
sudo certbot renew --dry-run
```
