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