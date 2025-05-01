const express = require('express');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3002;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir une page HTML statique pour l'interface web
app.get('/ui', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="fr">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Gestion des Soldes et Transactions</title>
            <script src="https://cdn.tailwindcss.com"></script>
            <style>
                .loading { display: none; text-align: center; color: #888; }
                .error { color: #dc2626; }
                .success { color: #10b981; }
            </style>
        </head>
        <body class="bg-gray-100 font-sans">
            <div class="container mx-auto p-4 max-w-4xl">
                <h1 class="text-3xl font-bold text-center mb-6 text-blue-600">Gestion des Soldes et Transactions</h1>
                
                <div id="soldes" class="bg-white p-6 rounded-lg shadow-md mb-6">
                    <h2 class="text-2xl font-semibold mb-4">Soldes Actuels</h2>
                    <div id="soldesList" class="space-y-2"></div>
                    <div id="soldesLoading" class="loading">Chargement des soldes...</div>
                    <button id="refreshSoldes" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors">Actualiser</button>
                </div>
                
                <div id="transactions" class="bg-white p-6 rounded-lg shadow-md">
                    <h2 class="text-2xl font-semibold mb-4">Opérations</h2>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div class="border p-4 rounded">
                            <h3 class="text-lg font-medium mb-2">Ajouter de l'argent</h3>
                            <input id="addNom" type="text" placeholder="Nom" class="w-full p-2 border rounded mb-2" />
                            <input id="addMontant" type="number" placeholder="Montant" class="w-full p-2 border rounded mb-2" />
                            <button id="addButton" class="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Ajouter</button>
                            <p id="addMessage" class="mt-2 text-sm"></p>
                        </div>
                        <div class="border p-4 rounded">
                            <h3 class="text-lg font-medium mb-2">Retirer de l'argent</h3>
                            <input id="subtractNom" type="text" placeholder="Nom" class="w-full p-2 border rounded mb-2" />
                            <input id="subtractMontant" type="number" placeholder="Montant" class="w-full p-2 border rounded mb-2" />
                            <button id="subtractButton" class="w-full px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors">Retirer</button>
                            <p id="subtractMessage" class="mt-2 text-sm"></p>
                        </div>
                        <div class="border p-4 rounded">
                            <h3 class="text-lg font-medium mb-2">Transférer de l'argent</h3>
                            <input id="transferNom1" type="text" placeholder="De (Nom)" class="w-full p-2 border rounded mb-2" />
                            <input id="transferNom2" type="text" placeholder="À (Nom)" class="w-full p-2 border rounded mb-2" />
                            <input id="transferMontant" type="number" placeholder="Montant" class="w-full p-2 border rounded mb-2" />
                            <button id="transferButton" class="w-full px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors">Transférer</button>
                            <p id="transferMessage" class="mt-2 text-sm"></p>
                        </div>
                    </div>
                </div>
            </div>
            
            <script>
                // Charger les soldes
                function loadSoldes() {
                    document.getElementById('soldesLoading').style.display = 'block';
                    document.getElementById('soldesList').innerHTML = '';
                    fetch('/api/soldes')
                        .then(response => response.json())
                        .then(data => {
                            document.getElementById('soldesLoading').style.display = 'none';
                            if (data.error) {
                                document.getElementById('soldesList').innerHTML = '<p class="error">Erreur : ' + data.error + '</p>';
                            } else if (Array.isArray(data)) {
                                data.forEach(user => {
                                    document.getElementById('soldesList').innerHTML += 
                                        '<p class="text-base"><strong>' + user.nom + '</strong> : ' + user.solde.toFixed(2) + ' €</p>';
                                });
                            } else {
                                document.getElementById('soldesList').innerHTML = '<p class="error">Erreur de données</p>';
                            }
                        })
                        .catch(err => {
                            document.getElementById('soldesLoading').style.display = 'none';
                            document.getElementById('soldesList').innerHTML = '<p class="error">Erreur de chargement : ' + err.message + '</p>';
                        });
                }
                
                // Écouteurs d'événements
                document.getElementById('refreshSoldes').addEventListener('click', loadSoldes);
                
                document.getElementById('addButton').addEventListener('click', () => {
                    const nom = document.getElementById('addNom').value;
                    const montant = parseFloat(document.getElementById('addMontant').value);
                    if (!nom || isNaN(montant) || montant <= 0) {
                        document.getElementById('addMessage').className = 'mt-2 text-sm error';
                        document.getElementById('addMessage').textContent = 'Veuillez entrer un nom et un montant valide.';
                        return;
                    }
                    fetch('/api/add', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nom, montant })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            document.getElementById('addMessage').className = 'mt-2 text-sm error';
                            document.getElementById('addMessage').textContent = 'Erreur : ' + data.error;
                        } else {
                            document.getElementById('addMessage').className = 'mt-2 text-sm success';
                            document.getElementById('addMessage').textContent = data.message;
                            loadSoldes();
                        }
                    })
                    .catch(err => {
                        document.getElementById('addMessage').className = 'mt-2 text-sm error';
                        document.getElementById('addMessage').textContent = 'Erreur : ' + err.message;
                    });
                });
                
                document.getElementById('subtractButton').addEventListener('click', () => {
                    const nom = document.getElementById('subtractNom').value;
                    const montant = parseFloat(document.getElementById('subtractMontant').value);
                    if (!nom || isNaN(montant) || montant <= 0) {
                        document.getElementById('subtractMessage').className = 'mt-2 text-sm error';
                        document.getElementById('subtractMessage').textContent = 'Veuillez entrer un nom et un montant valide.';
                        return;
                    }
                    fetch('/api/subtract', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nom, montant })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            document.getElementById('subtractMessage').className = 'mt-2 text-sm error';
                            document.getElementById('subtractMessage').textContent = 'Erreur : ' + data.error;
                        } else {
                            document.getElementById('subtractMessage').className = 'mt-2 text-sm success';
                            document.getElementById('subtractMessage').textContent = data.message;
                            loadSoldes();
                        }
                    })
                    .catch(err => {
                        document.getElementById('subtractMessage').className = 'mt-2 text-sm error';
                        document.getElementById('subtractMessage').textContent = 'Erreur : ' + err.message;
                    });
                });
                
                document.getElementById('transferButton').addEventListener('click', () => {
                    const nom1 = document.getElementById('transferNom1').value;
                    const nom2 = document.getElementById('transferNom2').value;
                    const montant = parseFloat(document.getElementById('transferMontant').value);
                    if (!nom1 || !nom2 || isNaN(montant) || montant <= 0) {
                        document.getElementById('transferMessage').className = 'mt-2 text-sm error';
                        document.getElementById('transferMessage').textContent = 'Veuillez entrer deux noms et un montant valide.';
                        return;
                    }
                    fetch('/api/transfer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nom1, nom2, montant })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.error) {
                            document.getElementById('transferMessage').className = 'mt-2 text-sm error';
                            document.getElementById('transferMessage').textContent = 'Erreur : ' + data.error;
                        } else {
                            document.getElementById('transferMessage').className = 'mt-2 text-sm success';
                            document.getElementById('transferMessage').textContent = data.message;
                            loadSoldes();
                        }
                    })
                    .catch(err => {
                        document.getElementById('transferMessage').className = 'mt-2 text-sm error';
                        document.getElementById('transferMessage').textContent = 'Erreur : ' + err.message;
                    });
                });
                
                // Charger les soldes au démarrage
                loadSoldes();
            </script>
        </body>
        </html>
    `);
});

// Proxy pour récupérer les soldes depuis solds-service
app.get('/', async (req, res) => {
    try {
        const response = await axios.get('http://solds-service:3000/');
        res.json(response.data);
    } catch (error) {
        console.error('Erreur lors de la récupération des soldes:', error.message);
        res.status(500).json({ error: 'Impossible de récupérer les soldes' });
    }
});

// Proxy pour ajouter de l'argent via transaction-service
app.post('/add', async (req, res) => {
    try {
        const response = await axios.post('http://transaction-service:3001/add', req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Erreur lors de l\'ajout:', error.message);
        res.status(500).json({ error: 'Erreur lors de l\'ajout d\'argent' });
    }
});

// Proxy pour retirer de l'argent via transaction-service
app.post('/subtract', async (req, res) => {
    try {
        const response = await axios.post('http://transaction-service:3001/subtract', req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Erreur lors du retrait:', error.message);
        res.status(500).json({ error: 'Erreur lors du retrait d\'argent' });
    }
});

// Proxy pour transférer de l'argent via transaction-service
app.post('/transfer', async (req, res) => {
    try {
        const response = await axios.post('http://transaction-service:3001/transfer', req.body);
        res.json(response.data);
    } catch (error) {
        console.error('Erreur lors du transfert:', error.message);
        res.status(500).json({ error: 'Erreur lors du transfert d\'argent' });
    }
});

// Démarrer le serveur
app.listen(port, () => {
    console.log(`Service Frontend écoute sur le port ${port}`);
});
