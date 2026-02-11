const messageService = new MessageService();
let currentChannelId = null;
let subscription = null;

// Vérifier l'authentification au démarrage
function checkAuthentication() {
    const currentUser = localStorage.getItem('alkyon_current_user');
    if (!currentUser) {
        window.location.href = '../../authentification/index.html';
    }
}

// Gérer la déconnexion
function handleLogout() {
    localStorage.removeItem('alkyon_current_user');
    window.location.href = '../../authentification/index.html';
}

// Charger les canaux au démarrage
async function loadChannels() {
    try {
        const channels = await messageService.getUserChannels();
        const channelsList = document.getElementById('channelsList');
        channelsList.innerHTML = '';

        if (channels.length === 0) {
            channelsList.innerHTML = '<p style="color: #72767d; padding: 10px;">Aucun canal</p>';
            return;
        }

        channels.forEach(channel => {
            const channelEl = document.createElement('div');
            channelEl.className = 'channel-item';
            channelEl.innerHTML = `<strong>${channel.name}</strong>`;
            channelEl.onclick = () => selectChannel(channel.id, channel.name);
            channelsList.appendChild(channelEl);
        });
    } catch (error) {
        console.error('Erreur lors du chargement des canaux:', error);
        document.getElementById('channelsList').innerHTML = '<p style="color: #ff0000; padding: 10px;">Erreur de chargement</p>';
    }
}

// Sélectionner un canal
async function selectChannel(channelId, channelName) {
    currentChannelId = channelId;
    document.getElementById('channelName').textContent = channelName;
    document.getElementById('inputArea').style.display = 'block';

    // Mettre à jour le style actif du canal
    document.querySelectorAll('.channel-item').forEach(el => {
        el.classList.remove('active');
    });
    event.target.closest('.channel-item').classList.add('active');

    // Désabonner de l'ancien canal
    if (subscription) {
        await subscription.unsubscribe();
    }

    // Charger les messages
    await loadMessages();

    // S'abonner aux nouveaux messages
    subscription = messageService.subscribeToChannel(channelId, (payload) => {
        if (payload.eventType === 'INSERT') {
            addMessageToUI(payload.new);
        } else if (payload.eventType === 'DELETE') {
            removeMessageFromUI(payload.old.id);
        }
    });
}

// Charger les messages du canal
async function loadMessages() {
    try {
        const messages = await messageService.getChannelMessages(currentChannelId);
        const container = document.getElementById('messagesContainer');
        container.innerHTML = '';

        if (messages.length === 0) {
            container.innerHTML = '<p style="color: #72767d; text-align: center; margin-top: 20px;">Aucun message pour le moment</p>';
            return;
        }

        messages.forEach(msg => addMessageToUI(msg));
        container.scrollTop = container.scrollHeight;
    } catch (error) {
        console.error('Erreur lors du chargement des messages:', error);
        document.getElementById('messagesContainer').innerHTML = '<p style="color: #ff0000; text-align: center; margin-top: 20px;">Erreur de chargement des messages</p>';
    }
}

// Ajouter un message à l'interface
function addMessageToUI(message) {
    const container = document.getElementById('messagesContainer');
    
    // Vérifier si c'est le premier message
    if (container.innerHTML.includes('Aucun message') || container.innerHTML.includes('Erreur de chargement')) {
        container.innerHTML = '';
    }

    const messageEl = document.createElement('div');
    messageEl.className = 'message';
    messageEl.id = `msg-${message.id}`;
    
    const date = new Date(message.created_at);
    const timeString = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    
    messageEl.innerHTML = `
        <div class="message-header">
            <strong>${message.profiles.name}</strong>
            <small>${timeString}</small>
        </div>
        <p>${escapeHtml(message.content)}</p>
    `;
    container.appendChild(messageEl);
    container.scrollTop = container.scrollHeight;
}

// Supprimer un message de l'interface
function removeMessageFromUI(messageId) {
    const messageEl = document.getElementById(`msg-${messageId}`);
    if (messageEl) {
        messageEl.remove();
    }
}

// Échapper les caractères HTML pour la sécurité
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Envoyer un message
async function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('messageInput');
    const content = input.value.trim();

    if (!content) return;

    if (!currentChannelId) {
        alert('Veuillez sélectionner un canal');
        return;
    }

    try {
        await messageService.sendMessage(currentChannelId, content);
        input.value = '';
    } catch (error) {
        console.error('Erreur lors de l\'envoi du message:', error);
        alert('Erreur lors de l\'envoi du message');
    }
}

// Gérer le modal de création de canal
const modal = document.getElementById('createChannelModal');
const createChannelBtn = document.getElementById('createChannelBtn');
const closeBtn = document.querySelector('.close');

createChannelBtn.addEventListener('click', () => {
    modal.style.display = 'block';
});

closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (event) => {
    if (event.target === modal) {
        modal.style.display = 'none';
    }
});

// Créer un canal
document.getElementById('createChannelForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('channelNameInput').value.trim();
    const desc = document.getElementById('channelDescInput').value.trim();

    if (!name) {
        alert('Veuillez entrer un nom de canal');
        return;
    }

    try {
        await messageService.createChannel(name, 'group', desc);
        document.getElementById('channelNameInput').value = '';
        document.getElementById('channelDescInput').value = '';
        modal.style.display = 'none';
        await loadChannels();
    } catch (error) {
        console.error('Erreur lors de la création du canal:', error);
        alert('Erreur lors de la création du canal: ' + error.message);
    }
});

// Initialiser
window.addEventListener('load', () => {
    checkAuthentication();
    loadChannels();
});
