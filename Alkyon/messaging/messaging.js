const messageService = new MessageService();
let currentFriendId = null;
let subscription = null;

// Vérifier l'authentification
function checkAuthentication() {
    const currentUser = localStorage.getItem('alkyon_current_user');
    if (!currentUser) {
        window.location.href = '../../authentification/index.html';
    }
}

// Déconnexion
function handleLogout() {
    localStorage.removeItem('alkyon_current_user');
    window.location.href = '../../authentification/index.html';
}

// Charger les amis
async function loadFriends() {
    try {
        const friends = await messageService.getFriends();
        const friendsList = document.getElementById('friendsList');
        friendsList.innerHTML = '';

        if (friends.length === 0) {
            friendsList.innerHTML = '<p style="color: #72767d; padding: 10px; font-size: 14px;">Aucun ami pour le moment</p>';
            return;
        }

        friends.forEach(friend => {
            const friendEl = document.createElement('div');
            friendEl.className = 'friend-item';
            friendEl.id = `friend-${friend.id}`;
            friendEl.innerHTML = `
                <div class="friend-avatar">👤</div>
                <div class="friend-info">
                    <div class="friend-name">${escapeHtml(friend.name)}</div>
                </div>
            `;
            friendEl.onclick = () => selectFriend(friend.id, friend.name);
            friendsList.appendChild(friendEl);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des amis:', error);
        document.getElementById('friendsList').innerHTML = '<p style="color: #ff6b6b; padding: 10px;">Erreur de chargement</p>';
    }
}

// Charger les demandes d'amitié
async function loadFriendRequests() {
    try {
        const requests = await messageService.getPendingFriendRequests();
        const requestsContainer = document.getElementById('requestsContainer');
        const friendRequests = document.getElementById('friendRequests');

        if (requests.length === 0) {
            requestsContainer.style.display = 'none';
            return;
        }

        requestsContainer.style.display = 'block';
        friendRequests.innerHTML = '';

        requests.forEach(request => {
            const requestEl = document.createElement('div');
            requestEl.className = 'friend-request';
            requestEl.innerHTML = `
                <div class="request-info">
                    <div>${escapeHtml(request.requester.name)}</div>
                </div>
                <div class="request-actions">
                    <button class="btn-small btn-accept" onclick="acceptFriendRequest('${request.id}')">✓</button>
                    <button class="btn-small btn-reject" onclick="rejectFriendRequest('${request.id}')">✕</button>
                </div>
            `;
            friendRequests.appendChild(requestEl);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des demandes:', error);
    }
}

// Accepter une demande
async function acceptFriendRequest(requestId) {
    try {
        await messageService.acceptFriendRequest(requestId);
        await loadFriendRequests();
        await loadFriends();
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// Rejeter une demande
async function rejectFriendRequest(requestId) {
    try {
        await messageService.rejectFriendRequest(requestId);
        await loadFriendRequests();
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// Sélectionner un ami
async function selectFriend(friendId, friendName) {
    currentFriendId = friendId;
    document.getElementById('friendName').textContent = friendName;
    document.getElementById('inputArea').style.display = 'block';

    // Mettre à jour le style actif
    document.querySelectorAll('.friend-item').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(`friend-${friendId}`).classList.add('active');

    // Désabonner de l'ancienne conversation
    if (subscription) {
        console.log('Désabonnement de la conversation précédente');
        await subscription.unsubscribe();
        subscription = null;
    }

    // Charger les messages
    await loadMessages();

    // S'abonner aux nouveaux messages avec gestion améliorée
    subscription = messageService.subscribeToDirectMessages(friendId, (payload) => {
        console.log('Événement temps réel reçu:', payload);
        
        if (payload.eventType === 'INSERT') {
            console.log('Nouveau message reçu:', payload.new);
            addMessageToUI(payload.new);
        } else if (payload.eventType === 'UPDATE') {
            console.log('Message mis à jour:', payload.new);
            // Mettre à jour le message
            const msgEl = document.getElementById(`msg-${payload.new.id}`);
            if (msgEl) {
                msgEl.remove();
                addMessageToUI(payload.new);
            }
        } else if (payload.eventType === 'DELETE') {
            console.log('Message supprimé:', payload.old);
            removeMessageFromUI(payload.old.id);
        }
    });

    if (!subscription) {
        console.error('Erreur lors de l\'abonnement aux messages');
        alert('Erreur de connexion au service de messagerie');
    }
}

// Charger les messages avec un ami
async function loadMessages() {
    try {
        const messages = await messageService.getDirectMessages(currentFriendId);
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<p style="color: #72767d; text-align: center; margin-top: 20px;">Aucun message pour le moment</p>';
            return;
        }

        messages.forEach(msg => addMessageToUI(msg));
        setTimeout(() => {
            container.scrollTop = container.scrollHeight;
        }, 100);
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<p style="color: #ff6b6b; text-align: center; margin-top: 20px;">Erreur: ' + error.message + '</p>';
    }
}

// Ajouter un message à l'interface
function addMessageToUI(message) {
    const container = document.getElementById('messagesContainer');
    
    if (container.innerHTML.includes('Aucun message') || container.innerHTML.includes('Erreur')) {
        container.innerHTML = '';
    }

    // Vérifier si le message existe déjà
    if (document.getElementById(`msg-${message.id}`)) {
        return;
    }

    const currentUser = JSON.parse(localStorage.getItem('alkyon_current_user'));
    const isOwn = message.sender_id === currentUser.id;
    const date = new Date(message.created_at);
    date.setHours(date.getHours() + 1); // Ajouter 1 heure
    const timeString = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const messageEl = document.createElement('div');
    messageEl.className = `message ${isOwn ? 'own-message' : ''}`;
    messageEl.id = `msg-${message.id}`;
    messageEl.innerHTML = `
        <div class="message-content">
            <p>${escapeHtml(message.content)}</p>
            <small>${timeString}</small>
        </div>
    `;
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// Supprimer un message
function removeMessageFromUI(messageId) {
    const messageEl = document.getElementById(`msg-${messageId}`);
    if (messageEl) {
        messageEl.remove();
    }
}

// Envoyer un message
async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;
    if (!currentFriendId) {
        alert('Sélectionnez un ami');
        return;
    }

    try {
        await messageService.sendDirectMessage(currentFriendId, content);
        input.value = '';
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// Échapper HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ===== GESTION DU MODAL =====
const modal = document.getElementById('addFriendModal');
const addFriendBtn = document.getElementById('addFriendBtn');
const closeBtn = document.querySelector('.close');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

addFriendBtn.addEventListener('click', () => {
    modal.style.display = 'block';
    searchInput.focus();
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
    searchResults.innerHTML = '';
});

logoutBtn.addEventListener('click', handleLogout);

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
        searchResults.innerHTML = '';
    }
});

// Rechercher un utilisateur
let searchTimeout;
searchInput.addEventListener('input', async (e) => {
    clearTimeout(searchTimeout);
    const query = e.target.value.trim();

    if (query.length < 2) {
        searchResults.innerHTML = '';
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const results = await messageService.searchUsers(query);
            searchResults.innerHTML = '';

            if (results.length === 0) {
                searchResults.innerHTML = '<p style="color: #72767d; padding: 10px;">Aucun résultat</p>';
                return;
            }

            results.forEach(user => {
                const resultEl = document.createElement('div');
                resultEl.className = 'search-result';
                resultEl.innerHTML = `
                    <div>
                        <div class="result-name">${escapeHtml(user.name)}</div>
                        <div class="result-email">${escapeHtml(user.email)}</div>
                    </div>
                    <button class="btn-add" onclick="sendFriendRequest('${user.id}')">Ajouter</button>
                `;
                searchResults.appendChild(resultEl);
            });
        } catch (error) {
            searchResults.innerHTML = '<p style="color: #ff6b6b; padding: 10px;">Erreur: ' + error.message + '</p>';
        }
    }, 300);
});

// Envoyer une demande d'amitié
async function sendFriendRequest(userId) {
    try {
        await messageService.sendFriendRequest(userId);
        alert('Demande d\'amitié envoyée !');
        searchInput.value = '';
        searchResults.innerHTML = '';
    } catch (error) {
        alert('Erreur: ' + error.message);
    }
}

// Initialiser
window.addEventListener('load', () => {
    checkAuthentication();
    loadFriends();
    loadFriendRequests();
    // Rafraîchir les amis et demandes toutes les 5 secondes
    setInterval(() => {
        loadFriendRequests();
    }, 5000);
});
