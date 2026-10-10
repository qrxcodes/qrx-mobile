import { useQueryClient } from '@tanstack/react-query';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { isFinished } from '@/lib/format';
import { pollUntilFinished } from '@/lib/poll';
import type { Code } from '@/lib/types';

import { queryKeys } from './queries';
import { cancelReadyReminder, notifyFinished, scheduleReadyReminder } from './notifications';
import { useAuth } from './session';

type JobsContextValue = {
  /** Follows a code until it finishes, wherever the person goes in the app. */
  track(code: Code): void;
};

const JobsContext = createContext<JobsContextValue | null>(null);

/**
 * Codes being made, followed from one place: the result lands in the query cache (so the progress screen, the list and
 * the allowance update together), and the notifications in notifications.ts cover the app going to the background.
 */
export function JobsProvider({ children }: { children: ReactNode }) {
  const { api, status } = useAuth();
  const queryClient = useQueryClient();
  const pending = useRef(new Map<string, { code: Code; abort: AbortController }>());

  const finish = useCallback(
    async (code: Code) => {
      pending.current.delete(code.id);
      queryClient.setQueryData(queryKeys.code(code.id), code);
      void queryClient.invalidateQueries({ queryKey: queryKeys.codes });
      void queryClient.invalidateQueries({ queryKey: queryKeys.account });
      if (AppState.currentState !== 'active') await notifyFinished(code);
      else await cancelReadyReminder(code.id);
    },
    [queryClient],
  );

  const follow = useCallback(
    (code: Code) => {
      const abort = new AbortController();
      pending.current.set(code.id, { code, abort });
      pollUntilFinished(api, code.id, {
        signal: abort.signal,
        onUpdate: (update) => queryClient.setQueryData(queryKeys.code(update.id), update),
      })
        .then((done) => (done ? finish(done) : undefined))
        .catch(() => {
          // signed out or the code is gone; the screen showing it reports the problem from its own query
          pending.current.delete(code.id);
        });
    },
    [api, finish, queryClient],
  );

  const track = useCallback(
    (code: Code) => {
      if (isFinished(code) || pending.current.has(code.id)) return;
      follow(code);
    },
    [follow],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      const codes = [...pending.current.values()].map((p) => p.code);
      if (state === 'background') codes.forEach((code) => void scheduleReadyReminder(code));
      if (state === 'active') {
        codes.forEach((code) => void cancelReadyReminder(code.id));
        // a poll may have died while suspended; start each one again
        for (const { code, abort } of [...pending.current.values()]) {
          abort.abort();
          follow(code);
        }
      }
    });
    return () => sub.remove();
  }, [follow]);

  useEffect(() => {
    if (status !== 'signedIn') {
      for (const { abort } of pending.current.values()) abort.abort();
      pending.current.clear();
    }
  }, [status]);

  const value = useMemo(() => ({ track }), [track]);
  return <JobsContext.Provider value={value}>{children}</JobsContext.Provider>;
}

export function useJobs() {
  const value = useContext(JobsContext);
  if (!value) throw new Error('useJobs outside JobsProvider');
  return value;
}
