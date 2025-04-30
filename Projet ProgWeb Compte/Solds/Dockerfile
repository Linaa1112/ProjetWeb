# Utiliser une image officielle Node.js
FROM node:20

# Créer un répertoire de travail
WORKDIR /app

# Copier package.json et installer les dépendances
COPY package*.json ./
RUN npm install

# Copier le reste de l'application
COPY . .

# Exposer le port que ton app utilise
EXPOSE 3000

# Démarrer l'application
CMD ["node", "app.js"]
