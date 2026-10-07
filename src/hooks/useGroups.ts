import { useEffect, useState } from 'react';

import { subscribeGroup, subscribeGroups } from '../services/groupService';
import type { ChatGroup } from '../types/group';
import { getErrorMessage } from '../utils/errors';

export function useGroups(userId: string) {
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeGroups(
      userId,
      (list) => {
        setGroups(list);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [userId]);

  return { groups, loading, error };
}

export function useGroup(groupId: string | null) {
  const [group, setGroup] = useState<ChatGroup | null>(null);
  const [loading, setLoading] = useState(groupId !== null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (groupId === null) {
      setGroup(null);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    const unsubscribe = subscribeGroup(
      groupId,
      (value) => {
        setGroup(value);
        setError(null);
        setLoading(false);
      },
      (err) => {
        setError(getErrorMessage(err));
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [groupId]);

  return { group, loading, error };
}
