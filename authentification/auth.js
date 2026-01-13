// Système d'authentification simple
class AuthSystem {
    constructor() {
        // Stockage des utilisateurs en localStorage
        this.usersKey = 'alkyon_users';
        this.currentUserKey = 'alkyon_current_user';
        this.initializeUsers();
    }

    // Initialiser avec des utilisateurs de test
    initializeUsers() {
        if (!localStorage.getItem(this.usersKey)) {
            const defaultUsers = [
                { id: 1, name: 'Admin', email: 'admin@test.com', password: 'admin123' },
                { id: 2, name: 'User', email: 'user@test.com', password: 'user123' }
            ];
            localStorage.setItem(this.usersKey, JSON.stringify(defaultUsers));
        }
    }

    // Récupérer tous les utilisateurs
    getUsers() {
        return JSON.parse(localStorage.getItem(this.usersKey)) || [];
    }

    // Enregistrer un nouvel utilisateur
    register(name, email, password) {
        const users = this.getUsers();
        
        // Vérifier si l'email existe déjà
        if (users.some(u => u.email === email)) {
            return { success: false, message: 'Cet email est déjà utilisé.' };
        }

        // Créer le nouvel utilisateur
        const newUser = {
            id: Date.now(),
            name: name,
            email: email,
            password: password // Simple pour ce projet
        };

        users.push(newUser);
        localStorage.setItem(this.usersKey, JSON.stringify(users));
        return { success: true, message: 'Inscription réussie! Vous pouvez maintenant vous connecter.' };
    }

    // Connecter un utilisateur
    login(email, password) {
        const users = this.getUsers();
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            // Stocker l'utilisateur connecté
            localStorage.setItem(this.currentUserKey, JSON.stringify(user));
            return { success: true, message: 'Connexion réussie!', user: user };
        }

        return { success: false, message: 'Email ou mot de passe incorrect.' };
    }

    // Déconnecter l'utilisateur
    logout() {
        localStorage.removeItem(this.currentUserKey);
        return { success: true, message: 'Déconnecté avec succès.' };
    }

    // Récupérer l'utilisateur actuellement connecté
    getCurrentUser() {
        const user = localStorage.getItem(this.currentUserKey);
        return user ? JSON.parse(user) : null;
    }

    // Vérifier si l'utilisateur est connecté
    isLoggedIn() {
        return this.getCurrentUser() !== null;
    }
}

// Initialiser le système
const auth = new AuthSystem();

// Afficher le formulaire approprié au chargement
window.addEventListener('load', () => {
    if (auth.isLoggedIn()) {
        showDashboard();
    } else {
        showLoginForm();
    }
});

// Basculer entre login et register
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    loginForm.classList.toggle('active');
    registerForm.classList.toggle('active');
    clearMessage();
}

// Afficher le formulaire de connexion
function showLoginForm() {
    document.getElementById('loginForm').classList.add('active');
    document.getElementById('registerForm').classList.remove('active');
    document.getElementById('dashboard').classList.remove('active');
}

// Afficher le tableau de bord
function showDashboard() {
    const user = auth.getCurrentUser();
    if (user) {
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userEmail').textContent = user.email;
        
        document.getElementById('loginForm').classList.remove('active');
        document.getElementById('registerForm').classList.remove('active');
        document.getElementById('dashboard').classList.add('active');
    }
}

// Gérer la connexion
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    const result = auth.login(email, password);

    if (result.success) {
        showMessage(result.message, 'success');
        setTimeout(() => {
            showDashboard();
        }, 500);
    } else {
        showMessage(result.message, 'error');
    }
}

// Gérer l'inscription
function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (password.length < 4) {
        showMessage('Le mot de passe doit contenir au moins 4 caractères.', 'error');
        return;
    }

    const result = auth.register(name, email, password);

    if (result.success) {
        showMessage(result.message, 'success');
        setTimeout(() => {
            toggleForms();
            document.getElementById('loginEmail').value = email;
            document.getElementById('loginPassword').value = '';
        }, 500);
    } else {
        showMessage(result.message, 'error');
    }
}

// Gérer la déconnexion
function handleLogout() {
    auth.logout();
    showMessage('Déconnecté avec succès.', 'success');
    setTimeout(() => {
        showLoginForm();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }, 500);
}

// Afficher un message
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    
    // Masquer le message après 5 secondes
    setTimeout(() => {
        clearMessage();
    }, 5000);
}

// Effacer le message
function clearMessage() {
    const messageEl = document.getElementById('message');
    messageEl.className = 'message';
    messageEl.textContent = '';
}
