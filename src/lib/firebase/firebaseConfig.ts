/**
 * Configuração do Firebase
 *
 * Preencha as variáveis de ambiente no arquivo .env (veja .env.example)
 * com as credenciais do seu projeto Firebase antes de rodar a aplicação.
 *
 * IMPORTANTE: no Console do Firebase, ative Authentication > Sign-in method
 * > E-mail/senha. Cada usuário autenticado só acessa os próprios dados
 * (ver firestore.rules e financeService.ts).
 */
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import {
  type Auth,
  type User,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
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
 * local" (sem Firebase/login) caso o usuário ainda não tenha configurado o .env.
 */
export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
let auth: Auth | null = null;

if (isFirebaseConfigured()) {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

/** Retorna o UID do usuário autenticado no momento (ou null se não houver) */
export const getCurrentUserId = (): string | null => auth?.currentUser?.uid ?? null;

/**
 * Assina mudanças no estado de autenticação (login/logout).
 * Retorna uma função de cancelamento (unsubscribe).
 */
export const subscribeToAuthState = (callback: (user: User | null) => void): (() => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};

/** Cria uma nova conta com e-mail e senha */
export const signUp = async (
  email: string,
  password: string,
  displayName?: string
): Promise<User> => {
  if (!auth) {
    throw new Error("Firebase não está configurado. Preencha o arquivo .env.");
  }
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
  return credential.user;
};

/** Autentica um usuário existente com e-mail e senha */
export const signIn = async (email: string, password: string): Promise<User> => {
  if (!auth) {
    throw new Error("Firebase não está configurado. Preencha o arquivo .env.");
  }
  const credential = await signInWithEmailAndPassword(auth, email, password);
  return credential.user;
};

/** Encerra a sessão do usuário atual */
export const signOutUser = async (): Promise<void> => {
  if (!auth) return;
  await signOut(auth);
};

/** Traduz os códigos de erro mais comuns do Firebase Auth para PT-BR */
export const translateAuthError = (error: unknown): string => {
  const code = (error as { code?: string })?.code ?? "";
  const messages: Record<string, string> = {
    "auth/invalid-email": "E-mail inválido.",
    "auth/user-disabled": "Esta conta foi desativada.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/network-request-failed": "Falha de conexão. Verifique sua internet.",
  };
  return messages[code] ?? "Não foi possível concluir a operação. Tente novamente.";
};

export { app, auth, db };
