// Find a login by email across every page of auth users. A single
// listUsers({ perPage: 1000 }) call silently misses anyone past the first page.

interface AuthUserLike {
  id: string
  email?: string | null
}

interface AdminAuthLike {
  auth: {
    admin: {
      listUsers: (params: { page: number; perPage: number }) => Promise<{
        data: { users?: AuthUserLike[] } | null
        error: unknown
      }>
    }
  }
}

const PAGE_SIZE = 1000
const MAX_PAGES = 100

export async function findAuthUserByEmail<T extends AuthUserLike = AuthUserLike>(
  adminClient: AdminAuthLike,
  email: string,
): Promise<T | null> {
  const target = String(email).trim().toLowerCase()
  for (let page = 1; page <= MAX_PAGES; page++) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: PAGE_SIZE })
    if (error) throw error
    const users = data?.users ?? []
    const match = users.find((u) => u.email?.toLowerCase() === target)
    if (match) return match as T
    if (users.length < PAGE_SIZE) return null
  }
  return null
}
