# Configuration Supabase pour le Système d'Authentification

## Étapes d'installation

### 1. Créer un compte Supabase
- Allez sur [supabase.com](https://supabase.com)
- Créez un nouveau projet
- Attendez que le projet soit initialisé

### 2. Créer la table 'profiles'
Dans l'éditeur SQL de Supabase, exécutez:

```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Créer une policy pour permettre aux utilisateurs de lire leurs propres données
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own profile"
  ON profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);
```

### 3. Récupérer vos clés API
1. Allez dans **Settings → API** dans Supabase
2. Copiez:
   - **Project URL** (SUPABASE_URL)
   - **anon public** (SUPABASE_ANON_KEY)

### 4. Mettre à jour auth.js
Dans `authentification/auth.js`, remplacez les lignes 2-3:

```javascript
const SUPABASE_URL = 'https://VOTRE_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'VOTRE_ANON_KEY';
```

### 5. Configurer l'authentification par email
Dans Supabase:
1. Allez dans **Authentication → Providers**
2. Assurez-vous que **Email** est activé
3. (Optionnel) Désactivez la confirmation d'email pour le développement:
   - **Authentication → Settings → Email Auth**
   - Désactivez "Confirm email"

## Notes de sécurité

⚠️ **IMPORTANT**: 
- Ne mettez JAMAIS vos clés dans git
- Utilisez des variables d'environnement en production
- La clé `anon` est publique et c'est normal
- Les Row Level Security (RLS) protègent vos données

## Pour la production

Utilisez un service worker ou un backend pour stocker la clé secrète `service_role_key` et utiliser l'authentification via JWT.


Supabase MDP : HugoGwen@2009