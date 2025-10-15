document.addEventListener('DOMContentLoaded', () => {
    const authContainer = document.getElementById('auth-container');
    const appContainer = document.getElementById('app-container');
    const loginBtn = document.getElementById('login-btn');
    const tokenInput = document.getElementById('token-input');
    const errorMessage = document.getElementById('error-message');
    const logoutBtn = document.getElementById('logout-btn');
    const userDisplay = document.getElementById('user-display');

    let map = null;

    // Au chargement, vérifier si un token est en session storage
    const sessionToken = sessionStorage.getItem('github_token');
    if (sessionToken) {
        validateAndInit(sessionToken);
    }

    loginBtn.addEventListener('click', () => {
        const token = tokenInput.value.trim();
        if (token) {
            validateAndInit(token);
        } else {
            errorMessage.textContent = 'Veuillez entrer un token.';
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('github_token');
        authContainer.style.display = 'flex';
        appContainer.style.display = 'none';
        if (map) {
            map.remove();
            map = null;
        }
    });

    async function validateAndInit(token) {
        try {
            errorMessage.textContent = '';
            const response = await fetch('https://api.github.com/user', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const user = await response.json();
            
            // Si la validation réussit
            sessionStorage.setItem('github_token', token);
            userDisplay.textContent = `Connecté en tant que ${user.login}`;

            authContainer.style.display = 'none';
            appContainer.style.display = 'flex';

            initializeApp();

        } catch (error) {
            console.error('Erreur de validation du token:', error);
            errorMessage.textContent = 'Token invalide ou expiré. Vérifiez le token et les permissions.';
            sessionStorage.removeItem('github_token');
        }
    }

    let layerControl = null;
    let currentEditingLayer = null;
    let temporaryMarker = null;
    const allGeoJSONData = []; // Stocker toutes les données GeoJSON chargées

    const editorPanel = document.getElementById('editor-panel');
    const editorForm = document.getElementById('editor-form');
    const saveBtn = document.getElementById('save-btn');

    saveBtn.addEventListener('click', () => {
        if (!currentEditingLayer) return;

        // 1. Mettre à jour les propriétés depuis le formulaire
        const inputs = editorForm.querySelectorAll('input, select');
        inputs.forEach(input => {
            const key = input.name;
            if (currentEditingLayer.feature.properties.hasOwnProperty(key)) {
                if (input.type === 'checkbox') {
                    currentEditingLayer.feature.properties[key] = input.checked ? 1 : 0;
                } else {
                    currentEditingLayer.feature.properties[key] = input.value;
                }
            }
        });

        // 2. Mettre à jour la géométrie depuis le marqueur déplaçable
        if (temporaryMarker) {
            const newLatLng = temporaryMarker.getLatLng();
            currentEditingLayer.feature.geometry.coordinates = [newLatLng.lng, newLatLng.lat];
            // Mettre à jour la position du layer original aussi
            currentEditingLayer.layer.setLatLng(newLatLng);
        }

        alert('Modifications enregistrées localement. La sauvegarde sur GitHub sera implémentée.');

        // 3. Nettoyer l'interface
        editorPanel.style.display = 'none';
        if (temporaryMarker) {
            map.removeLayer(temporaryMarker);
            temporaryMarker = null;
        }
        currentEditingLayer.layer.setOpacity(1); // Rendre la couche originale de nouveau visible
        currentEditingLayer = null;
    });

    function getUniqueValues(fieldName) {
        const values = new Set();
        allGeoJSONData.forEach(geojson => {
            if (!geojson || !geojson.features) return;
            geojson.features.forEach(feature => {
                if (feature.properties && feature.properties[fieldName]) {
                    values.add(feature.properties[fieldName]);
                }
            });
        });
        return [...values].sort();
    }

    function displayEditor(feature, layer) {
        alert('Clic détecté, ouverture de l\'éditeur...');
        currentEditingLayer = { feature, layer };
        editorForm.innerHTML = '';

        // Créer un marqueur déplaçable
        if (feature.geometry) {
            temporaryMarker = L.marker(L.latLng(feature.geometry.coordinates[1], feature.geometry.coordinates[0]), {
                draggable: true
            }).addTo(map);
            layer.setOpacity(0); // Cacher la couche originale
        }

        // Champs à ignorer et à traiter spécifiquement
        const fieldsToIgnore = ['nom_photo_URL'];
        const booleanFields = ['cereales', 'maraichage', 'aviculture', 'boucherie', 'boutique', 'poisson'];
        const dateFields = ['date_creation'];
        const dropdownFields = {
            'cuisine_ratachement': getUniqueValues('cuisine_ratachement'),
            'collectivite': getUniqueValues('collectivite'),
            'statut': getUniqueValues('statut'),
            'activite': getUniqueValues('activite'),
            'livraison_pc': getUniqueValues('livraison_pc')
        };

        for (const key in feature.properties) {
            if (key.startsWith('_') || fieldsToIgnore.includes(key)) {
                continue;
            }

            const label = document.createElement('label');
            label.innerText = key.replace(/_/g, ' ');
            label.htmlFor = `prop-${key}`;

            let input;
            const currentValue = feature.properties[key];

            if (dropdownFields[key]) {
                input = document.createElement('select');
                input.id = `prop-${key}`;
                input.name = key;
                dropdownFields[key].forEach(val => {
                    const option = document.createElement('option');
                    option.value = val;
                    option.text = val;
                    if (val === currentValue) option.selected = true;
                    input.appendChild(option);
                });
            } else if (booleanFields.includes(key)) {
                input = document.createElement('input');
                input.type = 'checkbox';
                input.id = `prop-${key}`;
                input.name = key;
                input.checked = currentValue === 1 || currentValue === true;
            } else if (dateFields.includes(key)) {
                input = document.createElement('input');
                input.type = 'date';
                input.id = `prop-${key}`;
                input.name = key;
                input.value = currentValue ? new Date(currentValue).toISOString().split('T')[0] : '';
            }
            else {
                input = document.createElement('input');
                input.type = (typeof currentValue === 'number') ? 'number' : 'text';
                input.id = `prop-${key}`;
                input.name = key;
                input.value = currentValue || '';
            }

            if (key === 'categorie' || key === 'theme') {
                input.readOnly = true;
            }

            editorForm.appendChild(label);
            editorForm.appendChild(input);
        }

        editorPanel.style.display = 'block';
    }

    function initializeApp() {
        if (map) {
            map.remove();
        }
        map = L.map('map').setView([14.7167, -17.4677], 9); // Coordonnées approximatives de Rufisque

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(map);

        // Initialise le contrôle des couches, non replié
        layerControl = L.control.layers(null, null, { collapsed: false }).addTo(map);

        loadGeoJSONFiles();
    }

    async function loadGeoJSONFiles() {
        allGeoJSONData.length = 0; // Vider le tableau avant de le remplir
        const token = sessionStorage.getItem('github_token');
        if (!token) return;

        const colors = ['#e6194B', '#3cb44b', '#ffe119', '#4363d8', '#f58231'];

        // Vider les anciennes couches du contrôle
        if (layerControl) {
            map.eachLayer(layer => {
                if (layer instanceof L.GeoJSON) {
                    map.removeLayer(layer);
                    layerControl.removeLayer(layer);
                }
            });
        }

        for (const [index, fileName] of config.geojsonFiles.entries()) {
            try {
                const response = await fetch(`https://api.github.com/repos/${config.repoOwner}/${config.repoName}/contents/${fileName}`, {
                     headers: {
                        'Authorization': `Bearer ${token}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const fileContent = await response.json();

                if (fileContent.encoding === 'base64') {
                    const decodedContent = atob(fileContent.content);
                    const geojsonData = JSON.parse(decodedContent);
                    allGeoJSONData.push(geojsonData); // Stocker les données
                    
                    const color = colors[index % colors.length];
                    const geojsonLayer = L.geoJSON(geojsonData, {
                        pointToLayer: function (feature, latlng) {
                            return L.circleMarker(latlng, {
                                radius: 7,
                                fillColor: color,
                                color: "#000",
                                weight: 1,
                                opacity: 1,
                                fillOpacity: 0.8
                            });
                        },
                        onEachFeature: function (feature, layer) {
                            layer.on('click', function (e) {
                                displayEditor(feature, layer);
                            });
                        }
                    });
                    
                    const layerName = fileName.split('/').pop().replace('.geojson', '').replace(/_/g, ' ');
                    layerControl.addOverlay(geojsonLayer, layerName);
                    geojsonLayer.addTo(map); // Afficher la couche par défaut
                }

            } catch (error) {
                console.error(`Erreur lors du chargement du fichier ${fileName}:`, error);
                alert(`Impossible de charger le fichier ${fileName}. Vérifiez que le fichier existe et que le token a les bonnes permissions.`);
            }
        }
    }
});