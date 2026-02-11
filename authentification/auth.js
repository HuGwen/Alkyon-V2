// Système d'authentification avec Supabase
const SUPABASE_URL = 'https://zdwsmhvkboqmxmlwajim.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpkd3NtaHZrYm9xbXhtbHdhamltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MTk0MTYsImV4cCI6MjA4NTA5NTQxNn0.kvK6NUwKJtcnsynuGAwJzxRzuHQa7KXKAdO7pstQMHo';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

class AuthSystem {
    constructor() {
        this.currentUserKey = 'alkyon_current_user';
        this.initializeSupabase();
    }

    async initializeSupabase() {
        try {
            // Vérifier si l'utilisateur est déjà connecté
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                this.setCurrentUser(session.user);
            }
        } catch (error) {
            console.error('Erreur lors de l\'initialisation Supabase:', error);
        }
    }


    // Enregistrer un nouvel utilisateur
    async register(email, password, name) {
        try {
            // Créer l'utilisateur avec Supabase Auth
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name
                    }
                }
            });

            if (error) {
                return { success: false, message: error.message };
            }

            // Stocker le profil utilisateur dans la table 'profiles'
            const { error: profileError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    name: name,
                    email: email
                });

            if (profileError) {
                return { success: false, message: 'Erreur lors de la création du profil.' };
            }

            return { success: true, message: 'Inscription réussie! Vérifiez votre email.' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Connecter un utilisateur
    async login(email, password) {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                return { success: false, message: 'Email ou mot de passe incorrect.' };
            }

            // Récupérer les informations du profil
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', data.user.id)
                .single();

            if (profileError) {
                return { success: false, message: 'Erreur lors de la récupération du profil.' };
            }

            // Stocker localement l'utilisateur connecté
            const user = {
                id: data.user.id,
                email: data.user.email,
                name: profile.name
            };
            this.setCurrentUser(user);

            return { success: true, message: 'Connexion réussie!', user: user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Déconnecter l'utilisateur
    async logout() {
        try {
            await supabase.auth.signOut();
            localStorage.removeItem(this.currentUserKey);
            return { success: true, message: 'Déconnecté avec succès.' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    // Définir l'utilisateur actuel en localStorage
    setCurrentUser(user) {
        localStorage.setItem(this.currentUserKey, JSON.stringify(user));
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
        
        // Redirection automatique vers la messagerie après 1 seconde
        setTimeout(() => {
            window.location.href = '../Alkyon/messaging/messaging.html';
        }, 1000);
    }
}

// Gérer la connexion
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;

    auth.login(email, password).then(result => {
        if (result.success) {
            showMessage(result.message, 'success');
            setTimeout(() => {
                showDashboard();
            }, 500);
        } else {
            showMessage(result.message, 'error');
        }
    });
}

// Gérer l'inscription
function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('registerName').value;
    const email = document.getElementById('registerEmail').value;
    const password = document.getElementById('registerPassword').value;

    if (password.length < 6) {
        showMessage('Le mot de passe doit contenir au moins 6 caractères.', 'error');
        return;
    }

    auth.register(email, password, name).then(result => {
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
    });
}

// Gérer la déconnexion
function handleLogout() {
    auth.logout().then(result => {
        showMessage(result.message, 'success');
        setTimeout(() => {
            showLoginForm();
            document.getElementById('loginEmail').value = '';
            document.getElementById('loginPassword').value = '';
        }, 500);
    });
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
