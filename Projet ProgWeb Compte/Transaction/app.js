const express = require('express');
const mysql = require('mysql2/promise');
const app = express();
const port = process.env.PORT || 3001;

// Middleware pour lire le JSON
app.use(express.json());

// Config MySQL
const dbConfig = {
  host: 'mysql-service', // nom du service MySQL dans Kubernetes
  user: 'root',
  password: 'root',
  database: 'somme'
};

// Route par défaut pour informer des endpoints disponibles
app.get('/', (req, res) => {
  res.send({
    message: 'Bienvenue sur le service de transaction',
    endpoints: {
      add: '/add/:nom (POST) - Ajouter de l\'argent à un utilisateur',
      subtract: '/subtract/:nom (POST) - Retirer de l\'argent à un utilisateur',
      transfer: '/transfer/:nom1-:nom2 (POST) - Transférer de l\'argent entre deux utilisateurs'
    }
  });
});

// Middleware pour logger le corps de la requête
app.use('/add/*', (req, res, next) => {
  console.log('Requête reçue sur /add :', req.body);
  console.log('Type de montant:', typeof req.body.montant, 'Valeur:', req.body.montant);
  console.log('Type de solde:', typeof req.body.solde, 'Valeur:', req.body.solde);
  next();
});

// Ajouter de l'argent à un utilisateur
app.post('/add/:nom', async (req, res) => {
  const { nom } = req.params;
  const { montant, solde } = req.body;
  
  // Accepter montant ou solde comme champ valide et convertir en nombre
  let montantFinal = montant || solde;
  
  // Convertir explicitement en nombre si c'est une chaîne
  montantFinal = parseFloat(montantFinal);
  
  if (isNaN(montantFinal) || montantFinal <= 0) {
    return res.status(400).send({
      error: 'Montant invalide',
      message: 'Veuillez fournir un champ "montant" ou "solde" avec une valeur numérique positive.',
      bodyReceived: req.body
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [result] = await connection.execute(
      'UPDATE utilisateur SET solde = solde + ? WHERE nom = ?',
      [montantFinal, nom]
    );
    await connection.end();
    
    if (result.affectedRows === 0) {
      return res.status(404).send({
        error: 'Utilisateur non trouvé',
        message: `Aucun utilisateur nommé ${nom} n'a été trouvé dans la base de données.`
      });
    }
    
    res.send(`Ajouté ${montantFinal} à ${nom}`);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du solde.'
    });
  }
});

// Retirer de l'argent à un utilisateur
app.post('/subtract/:nom', async (req, res) => {
  const { nom } = req.params;
  const { montant, solde } = req.body;
  
  // Accepter montant ou solde comme champ valide et convertir en nombre
  let montantFinal = montant || solde;
  
  // Convertir explicitement en nombre si c'est une chaîne
  montantFinal = parseFloat(montantFinal);
  
  if (isNaN(montantFinal) || montantFinal <= 0) {
    return res.status(400).send({
      error: 'Montant invalide',
      message: 'Veuillez fournir un champ "montant" ou "solde" avec une valeur numérique positive.',
      bodyReceived: req.body
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    const [user] = await connection.execute(
      'SELECT solde FROM utilisateur WHERE nom = ?',
      [nom]
    );
    
    if (user.length === 0) {
      await connection.end();
      return res.status(404).send({
        error: 'Utilisateur non trouvé',
        message: `Aucun utilisateur nommé ${nom} n'a été trouvé dans la base de données.`
      });
    }
    
    if (user[0].solde < montantFinal) {
      await connection.end();
      return res.status(400).send({
        error: 'Solde insuffisant',
        message: `Le solde de ${nom} est insuffisant pour retirer ${montantFinal}.`
      });
    }
    
    await connection.execute(
      'UPDATE utilisateur SET solde = solde - ? WHERE nom = ?',
      [montantFinal, nom]
    );
    await connection.end();
    res.send(`Retiré ${montantFinal} de ${nom}`);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors de la mise à jour du solde.'
    });
  }
});

// Transférer de l'argent entre deux utilisateurs
app.post('/transfer/:nom1-:nom2', async (req, res) => {
  const { nom1, nom2 } = req.params;
  const { montant, solde } = req.body;
  
  // Accepter montant ou solde comme champ valide et convertir en nombre
  let montantFinal = montant || solde;
  
  // Convertir explicitement en nombre si c'est une chaîne
  montantFinal = parseFloat(montantFinal);
  
  if (isNaN(montantFinal) || montantFinal <= 0) {
    return res.status(400).send({
      error: 'Montant invalide',
      message: 'Veuillez fournir un champ "montant" ou "solde" avec une valeur numérique positive.',
      bodyReceived: req.body
    });
  }
  
  try {
    const connection = await mysql.createConnection(dbConfig);
    // Start transaction
    await connection.beginTransaction();
    
    // Vérifier solde
    const [user1] = await connection.execute(
      'SELECT solde FROM utilisateur WHERE nom = ?',
      [nom1]
    );
    
    if (user1.length === 0) {
      await connection.rollback();
      await connection.end();
      return res.status(404).send({
        error: 'Utilisateur source non trouvé',
        message: `Aucun utilisateur nommé ${nom1} n'a été trouvé dans la base de données.`
      });
    }
    
    if (user1[0].solde < montantFinal) {
      await connection.rollback();
      await connection.end();
      return res.status(400).send({
        error: 'Solde insuffisant',
        message: `Le solde de ${nom1} est insuffisant pour transférer ${montantFinal}.`
      });
    }
    
    // Débiter source
    await connection.execute(
      'UPDATE utilisateur SET solde = solde - ? WHERE nom = ?',
      [montantFinal, nom1]
    );
    
    // Créditer destination
    const [user2] = await connection.execute(
      'SELECT id FROM utilisateur WHERE nom = ?',
      [nom2]
    );
    
    if (user2.length === 0) {
      await connection.rollback();
      await connection.end();
      return res.status(404).send({
        error: 'Utilisateur destination non trouvé',
        message: `Aucun utilisateur nommé ${nom2} n'a été trouvé dans la base de données.`
      });
    }
    
    await connection.execute(
      'UPDATE utilisateur SET solde = solde + ? WHERE nom = ?',
      [montantFinal, nom2]
    );
    
    // Commit
    await connection.commit();
    await connection.end();
    res.send(`Transféré ${montantFinal} de ${nom1} à ${nom2}`);
  } catch (error) {
    console.error(error);
    res.status(500).send({
      error: 'Erreur serveur',
      message: 'Une erreur est survenue lors du transfert.'
    });
  }
});

// Démarrer le serveur
app.listen(port, () => {
  console.log(`Service Transaction écoute sur le port ${port}`);
});
