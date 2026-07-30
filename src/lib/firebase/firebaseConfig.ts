/**
 * Configuração do Firebase
 *
 * Preencha as variáveis de ambiente no arquivo .env (veja .env.example)
 * com as credenciais do seu projeto Firebase antes de rodar a aplicação.
 */
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { type Firestore, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Retorna true se todas as variáveis de ambiente obrigatórias do Firebase
 * estão preenchidas. Usado para permitir que o app rode em modo "somente
 * local" (sem Firebase) caso o usuário ainda não tenha configurado o .env.
 */
export const isFirebaseConfigured = (): boolean =>
  Boolean(
    firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId
  );

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

/**
 * Garante que existe uma sessão autenticada (anônima) antes de ler/gravar
 * no Firestore. Usa autenticação anônima para simplificar o setup inicial —
 * troque por login real (email/senha, Google, etc.) quando desejar.
 */
export const ensureAuth = (): Promise<string | null> => {
  return new Promise((resolve, reject) => {
    if (!auth) {
      resolve(null);
      return;
    }
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        unsubscribe();
        if (user) {
          resolve(user.uid);
        } else {
          signInAnonymously(auth as Auth)
            .then((cred) => resolve(cred.user.uid))
            .catch(reject);
        }
      },
      reject
    );
  });
};

export { app, db, auth };
