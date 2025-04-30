# Utiliser une image officielle Node.js
FROM node:20

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package.json et package-lock.json
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier tous les fichiers du projet (server.js, etc.)
COPY . .

# Exposer le port (attention : 3001 pour ce service)
EXPOSE 3001

# Commande pour démarrer ton service
CMD ["node", "app.js"]
