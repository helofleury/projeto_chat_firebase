import { useEffect, useMemo, useState } from 'react';

import { subscribePublicProfiles } from '../services/userService';
import type { PublicProfile } from '../types/user';
import { getErrorMessage } from '../utils/errors';

export type UsersState = {
  users: PublicProfile[];
  usersById: Map<string, PublicProfile>;
  loading: boolean;
  error: string | null;
};

/** Lista de usuários cadastrados (perfil público) em tempo real. */
export function useUsers(): UsersState {
  const [users, setUsers] = useState<PublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribePublicProfiles(
      (profiles) => {
        setUsers(profiles);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, []);

  const usersById = useMemo(() => new Map(users.map((u) => [u.uid, u] as const)), [users]);
  return { users, usersById, loading, error };
}
