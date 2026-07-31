import type { User } from "firebase/auth";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import {
  isFirebaseConfigured,
  signIn,
  signOutUser,
  signUp,
  subscribeToAuthState,
  translateAuthError,
} from "../lib/firebase/firebaseConfig";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  firebaseEnabled: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const firebaseEnabled = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  // Enquanto o Firebase não está configurado, não há tela de login para esperar.
  const [loading, setLoading] = useState<boolean>(firebaseEnabled);

  useEffect(() => {
    if (!firebaseEnabled) {
      return;
    }
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    try {
      await signIn(email, password);
    } catch (error) {
      throw new Error(translateAuthError(error));
    }
  };

  const register = async (email: string, password: string, displayName?: string) => {
    try {
      await signUp(email, password, displayName);
    } catch (error) {
      throw new Error(translateAuthError(error));
    }
  };

  const logout = async () => {
    await signOutUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, firebaseEnabled, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um <AuthProvider>");
  }
  return context;
};
