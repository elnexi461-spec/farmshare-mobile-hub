import { useQuery } from '@tanstack/react-query'
import { useServerFn } from '@tanstack/react-start'
import { getFarmData } from '@/lib/farm.functions'
export function useFarmData() { const fetchFarm = useServerFn(getFarmData); return useQuery({ queryKey: ['farm-data'], queryFn: () => fetchFarm(), staleTime: 20_000 }) }
