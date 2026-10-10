import { QueryClient, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import { isLinkCode } from '@/lib/format';
import { isTransient, toProblem } from '@/lib/problem';

import { useApi, useAuth } from './session';

export const queryKeys = {
  account: ['account'] as const,
  styles: ['styles'] as const,
  codes: ['codes'] as const,
  code: (id: string) => ['code', id] as const,
};

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: (count, error) => count < 3 && isTransient(toProblem(error)),
        staleTime: 30_000,
      },
    },
  });
}

export function useAccount() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({ queryKey: queryKeys.account, queryFn: () => api.account(), enabled: status === 'signedIn' });
}

export function useStyles() {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.styles,
    queryFn: async () => (await api.listStyles()).data,
    enabled: status === 'signedIn',
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useCodes() {
  const api = useApi();
  const { status } = useAuth();
  return useInfiniteQuery({
    queryKey: queryKeys.codes,
    queryFn: ({ pageParam }) => api.listCodes(pageParam, 24),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : undefined),
    enabled: status === 'signedIn',
    select: (data) => data.pages.flatMap((page) => page.data).filter(isLinkCode),
  });
}

export function useCode(id: string) {
  const api = useApi();
  const { status } = useAuth();
  return useQuery({
    queryKey: queryKeys.code(id),
    queryFn: () => api.getCode(id),
    enabled: status === 'signedIn' && !!id,
  });
}
