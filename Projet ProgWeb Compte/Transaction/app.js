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
            add: '/add (POST) - Ajouter de l\'argent à un utilisateur',
            subtract: '/subtract (POST) - Retirer de l\'argent à un utilisateur',
            transfer: '/transfer (POST) - Transférer de l\'argent entre deux utilisateurs'
        }
    });
});

// Ajouter de l'argent à un utilisateur
app.post('/add', async (req, res) => {
    const { nom, montant, solde } = req.body;

    if (!nom) {
        return res.status(400).send({
            error: 'Paramètre manquant',
            message: 'Veuillez fournir le champ "nom" pour l\'utilisateur.'
        });
    }

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

        res.send({
            message: `Ajouté ${montantFinal} à ${nom}`,
            utilisateur: nom,
            montantAjoute: montantFinal
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            error: 'Erreur serveur',
            message: 'Une erreur est survenue lors de la mise à jour du solde.'
        });
    }
});

// Retirer de l'argent à un utilisateur
app.post('/subtract', async (req, res) => {
    const { nom, montant, solde } = req.body;

    if (!nom) {
        return res.status(400).send({
            error: 'Paramètre manquant',
            message: 'Veuillez fournir le champ "nom" pour l\'utilisateur.'
        });
    }

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
        
        res.send({
            message: `Retiré ${montantFinal} de ${nom}`,
            utilisateur: nom,
            montantRetire: montantFinal
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({
            error: 'Erreur serveur',
            message: 'Une erreur est survenue lors de la mise à jour du solde.'
        });
    }
});

// Transférer de l'argent entre deux utilisateurs
app.post('/transfer', async (req, res) => {
    const { nom1, nom2, montant, solde } = req.body;

    if (!nom1 || !nom2) {
        return res.status(400).send({
            error: 'Paramètres manquants',
            message: 'Veuillez fournir les champs "nom1" et "nom2" pour les utilisateurs source et destination.'
        });
    }

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
        
        res.send({
            message: `Transféré ${montantFinal} de ${nom1} à ${nom2}`,
            expediteur: nom1,
            destinataire: nom2,
            montantTransfere: montantFinal
        });
    } catch (error) {
        console.error(error);
        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error('Rollback error:', rollbackError);
        }
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
