'use client'

import type { Organization } from '@/client/gen/pft/organization'
import { fetchAllPages } from '@/lib/paginated'
import { v1OrgsList } from '@/client/gen/pft/v1/v1'
import { isLoggedIn } from '@/lib/auth'
import { clearBudgetFileCache } from '@/lib/finance-client'
import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { useSWRConfig } from 'swr'

/**
 * The active organization.
 *
 * Access control lives entirely server-side (membership scoping); this context
 * only decides which organization's budget files the UI works in. Switching
 * clears every cached read so nothing from the previous org lingers on screen.
 */

const STORAGE_KEY = 'active-organization'

interface OrganizationContextType {
  organizations: Organization[]
  activeOrg: Organization | null
  setActiveOrg: (org: Organization) => void
  refresh: () => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined)

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [activeOrg, setActiveOrgState] = useState<Organization | null>(null)
  const { mutate } = useSWRConfig()

  const load = useCallback(async () => {
    if (!isLoggedIn()) return
    try {
      // Walk every page: the workspace switcher must show all of them, and a
      // silently truncated list would strand the user out of a workspace.
      const rows = await fetchAllPages((params) => v1OrgsList(params))
      setOrganizations(rows)
      const storedId = Number(localStorage.getItem(STORAGE_KEY) ?? NaN)
      const stored = rows.find((row) => row.id === storedId)
      const personal = rows.find((row) => row.personal)
      setActiveOrgState(stored ?? personal ?? rows[0] ?? null)
    } catch {
      // Signed out or the API is unreachable; the guard redirects anyway.
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const setActiveOrg = useCallback(
    (org: Organization) => {
      setActiveOrgState(org)
      localStorage.setItem(STORAGE_KEY, String(org.id))
      clearBudgetFileCache()
      // Drop every cached read: lists, aggregates, snapshots - all belong to
      // the previous organization's budget files.
      void mutate(() => true, undefined, { revalidate: true })
    },
    [mutate],
  )

  return (
    <OrganizationContext.Provider
      value={{ organizations, activeOrg, setActiveOrg, refresh: load }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(OrganizationContext)
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider')
  }
  return context
}

/** Read the active org id outside React (the budget-file resolver). */
export function activeOrganizationId(): number | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  return raw ? Number(raw) : null
}
