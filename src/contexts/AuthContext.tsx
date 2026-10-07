import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

import { loginWithEmail, logoutUser, observeAuthState, registerWithEmail } from '../services/authService';
import { disableCurrentDevice } from '../services/notificationService';
import { subscribeOwnProfile } from '../services/userService';
import type { ChatUser, RegisterInput } from '../types/user';

export type AuthContextValue = {
  user: ChatUser | null;
  initializing: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ChatUser | null>(null);
  const [initializing, setInitializing] = useState(true);
  const registeringRef = useRef(false);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = observeAuthState((firebaseUser) => {
      unsubscribeProfile?.();
      unsubscribeProfile = null;

      if (!firebaseUser) {
        setUser(null);
        setInitializing(false);
        return;
      }

      unsubscribeProfile = subscribeOwnProfile(
        firebaseUser.uid,
        (profile) => {
          if (profile) {
            setUser(profile);
            setInitializing(false);
          } else if (!registeringRef.current) {
            // Conta sem perfil (ex.: removido): encerra a sessão.
            void logoutUser();
            setInitializing(false);
          }
        },
        () => setInitializing(false),
      );
    });

    return () => {
      unsubscribeProfile?.();
      unsubscribeAuth();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await loginWithEmail(email, password);
  }, []);

  const signUp = useCallback(async (input: RegisterInput) => {
    registeringRef.current = true;
    try {
      await registerWithEmail(input);
    } finally {
      registeringRef.current = false;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (user) await disableCurrentDevice(user.uid);
    await logoutUser();
    setUser(null);
  }, [user]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, initializing, signIn, signUp, signOut }),
    [user, initializing, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
