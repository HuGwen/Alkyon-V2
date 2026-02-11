class MessageService {
    constructor() {
        // Utiliser la variable globale supabase depuis auth.js
        this.supabaseInstance = null;
        this.waitForSupabase();
    }

    async waitForSupabase() {
        for (let i = 0; i < 50; i++) {
            if (typeof supabase !== 'undefined') {
                this.supabaseInstance = supabase;
                return;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        throw new Error('Supabase n\'a pas pu être initialisé');
    }

    get supabase() {
        if (!this.supabaseInstance) {
            this.supabaseInstance = window.supabase;
        }
        return this.supabaseInstance;
    }

    getCurrentUser() {
        return JSON.parse(localStorage.getItem('alkyon_current_user'));
    }

    // ===== GESTION DES AMIS =====
    
    // Envoyer une demande d'amitié
    async sendFriendRequest(receiverId) {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('friendships')
            .insert({
                requester_id: currentUser.id,
                receiver_id: receiverId,
                status: 'pending'
            })
            .select();

        if (error) throw error;
        return data[0];
    }

    // Accepter une demande d'amitié
    async acceptFriendRequest(requestId) {
        const { data, error } = await this.supabase
            .from('friendships')
            .update({ status: 'accepted' })
            .eq('id', requestId)
            .select();

        if (error) throw error;
        return data[0];
    }

    // Rejeter une demande d'amitié
    async rejectFriendRequest(requestId) {
        const { error } = await this.supabase
            .from('friendships')
            .delete()
            .eq('id', requestId);

        if (error) throw error;
    }

    // Récupérer la liste des amis acceptés
    async getFriends() {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('friendships')
            .select(`
                id,
                requester:requester_id(id, name, email),
                receiver:receiver_id(id, name, email)
            `)
            .or(`requester_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`)
            .eq('status', 'accepted');

        if (error) throw error;

        // Transformer les données pour obtenir les amis
        return data.map(friendship => {
            const friend = friendship.requester_id === currentUser.id 
                ? friendship.receiver 
                : friendship.requester;
            return friend;
        });
    }

    // Récupérer les demandes d'amitié reçues
    async getPendingFriendRequests() {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('friendships')
            .select(`
                id,
                requester:requester_id(id, name, email),
                status
            `)
            .eq('receiver_id', currentUser.id)
            .eq('status', 'pending');

        if (error) throw error;
        return data;
    }

    // Rechercher un utilisateur
    async searchUsers(query) {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('profiles')
            .select('id, name, email')
            .neq('id', currentUser.id)
            .ilike('name', `%${query}%`)
            .limit(10);

        if (error) throw error;
        return data;
    }

    // ===== MESSAGES PRIVÉS =====

    // Envoyer un message privé
    async sendDirectMessage(receiverId, content) {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('direct_messages')
            .insert({
                sender_id: currentUser.id,
                receiver_id: receiverId,
                content: content
            })
            .select();

        if (error) throw error;
        return data[0];
    }

    // Récupérer les messages privés avec un utilisateur
    async getDirectMessages(friendId, limit = 50) {
        const currentUser = this.getCurrentUser();
        
        const { data, error } = await this.supabase
            .from('direct_messages')
            .select(`
                id,
                content,
                created_at,
                edited,
                sender_id,
                sender:sender_id(id, name, email),
                receiver:receiver_id(id, name, email)
            `)
            .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id})`)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    // Supprimer un message privé
    async deleteDirectMessage(messageId) {
        const { error } = await this.supabase
            .from('direct_messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    }

    // S'abonner aux messages privés
    subscribeToDirectMessages(friendId, callback) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) {
            console.error('Utilisateur non authentifié');
            return null;
        }

        const channel = `dm_${[currentUser.id, friendId].sort().join('_')}`;
        
        const subscription = this.supabase
            .channel(channel, {
                config: {
                    broadcast: { self: true }
                }
            })
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'direct_messages',
                    filter: `or(and(sender_id.eq.${currentUser.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${currentUser.id}))`
                },
                callback
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`Abonné au canal DM avec ${friendId}`);
                } else if (status === 'CLOSED') {
                    console.log('Abonnement fermé');
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('Erreur du canal');
                }
            });

        return subscription;
    }
}
