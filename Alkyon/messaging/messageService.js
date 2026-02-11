class MessageService {
    constructor() {
        this.supabase = window.supabase;
    }

    // Créer un canal direct ou de groupe
    async createChannel(name, type = 'group', description = '') {
        const currentUser = JSON.parse(localStorage.getItem('alkyon_current_user'));
        
        const { data, error } = await this.supabase
            .from('channels')
            .insert({
                name: name,
                type: type,
                description: description,
                created_by: currentUser.id
            })
            .select();

        if (error) throw error;

        // Ajouter l'utilisateur au canal
        await this.addMemberToChannel(data[0].id, currentUser.id);
        return data[0];
    }

    // Ajouter un membre au canal
    async addMemberToChannel(channelId, userId) {
        const { error } = await this.supabase
            .from('channel_members')
            .insert({ channel_id: channelId, user_id: userId });
        
        if (error) throw error;
    }

    // Récupérer les canaux de l'utilisateur
    async getUserChannels() {
        const currentUser = JSON.parse(localStorage.getItem('alkyon_current_user'));
        
        const { data, error } = await this.supabase
            .from('channel_members')
            .select(`
                channel_id,
                channels:channels(id, name, type, description)
            `)
            .eq('user_id', currentUser.id);

        if (error) throw error;
        return data.map(item => item.channels);
    }

    // Envoyer un message
    async sendMessage(channelId, content) {
        const currentUser = JSON.parse(localStorage.getItem('alkyon_current_user'));
        
        const { data, error } = await this.supabase
            .from('messages')
            .insert({
                channel_id: channelId,
                user_id: currentUser.id,
                content: content
            })
            .select();

        if (error) throw error;
        return data[0];
    }

    // Récupérer les messages d'un canal
    async getChannelMessages(channelId, limit = 50) {
        const { data, error } = await this.supabase
            .from('messages')
            .select(`
                id,
                content,
                created_at,
                edited,
                user_id,
                profiles:profiles(id, name, email)
            `)
            .eq('channel_id', channelId)
            .order('created_at', { ascending: true })
            .limit(limit);

        if (error) throw error;
        return data;
    }

    // Supprimer un message
    async deleteMessage(messageId) {
        const { error } = await this.supabase
            .from('messages')
            .delete()
            .eq('id', messageId);

        if (error) throw error;
    }

    // S'abonner aux nouveaux messages en temps réel
    subscribeToChannel(channelId, callback) {
        return this.supabase
            .channel(`messages:channel_${channelId}`)
            .on('postgres_changes', 
                { event: '*', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` },
                callback
            )
            .subscribe();
    }
}
