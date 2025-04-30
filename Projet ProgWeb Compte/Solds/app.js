// Fichier: server.js

const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3000;

// Création de la connexion MySQL
const dbConfig = {
  host: 'mysql-service', // Attention : ce doit être le nom du Service Kubernetes !
  user: 'root',
  password: 'root',
  database: 'somme'
};

// Route pour récupérer tous les utilisateurs
app.get('/', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT nom, solde FROM utilisateur');
    await connection.end();
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur de connexion à la base de données');
  }
});

// Route pour récupérer un utilisateur par son nom
app.get('/:nom', async (req, res) => {
  try {
    const { nom } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    const [rows] = await connection.execute('SELECT nom, solde FROM utilisateur WHERE nom = ?', [nom]);
    await connection.end();

    if (rows.length === 0) {
      return res.status(404).send('Utilisateur non trouvé');
    }
    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erreur de connexion à la base de données');
  }
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur Node.js écoute sur le port ${port}`);
});
