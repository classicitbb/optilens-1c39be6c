import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { StrictMode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SharedPageViewer from '@/features/atlas/components/SharedPageViewer';
import ProtectedRoute from '@/components/ProtectedRoute';
import { createAuthHref } from '@/lib/authFlow';
import { APP_ROUTE_REGISTRY } from '@/config/routeRegistry';

const mocks = vi.hoisted(() => ({ user: { id: 'viewer' } as { id: string } | null, open: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, loading: false }) }));
vi.mock('@/features/atlas/source/helpArticlesSource', () => ({ openSharedPage: mocks.open }));
const token = '11111111-1111-4111-8111-111111111111';
const body = { blocks: [{ type: 'paragraph', children: [{ type: 'text', text: 'Published body' }] }] };
const content = { title: 'Published title', body, legacyContent: '', version: 2, publishedAt: null };
const mount = () => render(<StrictMode><MemoryRouter initialEntries={[`/shared/pages/${token}`]}><Routes>
  <Route path="/shared/pages/:token" element={<ProtectedRoute><SharedPageViewer /></ProtectedRoute>} />
  <Route path="/auth" element={<p>Existing account sign-in and registration</p>} />
</Routes></MemoryRouter></StrictMode>);

describe('Shared page website reader', () => {
  beforeEach(() => { mocks.user = { id: 'viewer' }; mocks.open.mockReset(); mocks.open.mockResolvedValue(content); });
  it('renders the shared published page with no editor, staff links, or duplicate StrictMode audit', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: content.title })).toBeInTheDocument();
    expect(screen.getByText('Published body')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /edit|publish|update/i })).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="/admin"],a[href^="/atlas"]')).toBeNull();
    expect(mocks.open).toHaveBeenCalledTimes(1);
    expect(mocks.open).toHaveBeenCalledWith(token);
    expect(screen.getByRole('article')).toHaveClass('max-w-[720px]');
  });
  it('uses the saved full-width setting in the website reader', async () => {
    mocks.open.mockResolvedValue({ ...content, fullWidth: true });
    mount();
    await screen.findByRole('heading', { name: content.title });
    expect(screen.getByRole('article')).toHaveClass('max-w-none');
  });
  it('requires sign-in before making any page/audit call and preserves the registration destination', async () => {
    mocks.user = null;
    mount();
    expect(await screen.findByText('Existing account sign-in and registration')).toBeInTheDocument();
    expect(mocks.open).not.toHaveBeenCalled();
    const registration = new URL(createAuthHref({ mode: 'signup', redirect: `/shared/pages/${token}` }), 'https://example.test');
    expect(registration.searchParams.get('redirect')).toBe(`/shared/pages/${token}`);
  });
  it('shows the same unavailable message for disabled, unpublished, and unknown shares', async () => {
    mocks.open.mockResolvedValue(null);
    mount();
    expect(await screen.findByText('This page is unavailable or is no longer shared.')).toBeInTheDocument();
    expect(screen.queryByText('Published body')).not.toBeInTheDocument();
  });
  it('hides the previous account response while an account switch is loading', async () => {
    const view = mount();
    await screen.findByRole('heading', { name: content.title });
    mocks.open.mockImplementation(() => new Promise(() => {}));
    mocks.user = { id: 'another-account' };
    view.rerender(<MemoryRouter initialEntries={[`/shared/pages/${token}`]}><Routes><Route path="/shared/pages/:token" element={<SharedPageViewer />} /></Routes></MemoryRouter>);
    await waitFor(() => expect(screen.queryByText('Published body')).not.toBeInTheDocument());
    expect(screen.getByText('Loading page…')).toBeInTheDocument();
  });
  it('does not expose content when the audited endpoint fails', async () => {
    mocks.open.mockRejectedValue(new Error('Audit insertion failed'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('could not be opened');
    expect(screen.queryByText('Published body')).not.toBeInTheDocument();
  });
  it('registers a customer-shell authenticated route while Atlas keeps its admin guard', () => {
    expect(APP_ROUTE_REGISTRY.find(r => r.id === 'public.shared-page')).toMatchObject({ path: '/shared/pages/:token', authMode: 'authenticated', layout: 'customer-shell' });
    expect(APP_ROUTE_REGISTRY.find(r => r.id === 'atlas.page')?.authMode).toBe('admin');
  });
});
