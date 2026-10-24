import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import PageSharingDialog from '@/features/atlas/components/PageSharingDialog';
import { makePage } from './fixtures';
import type { AtlasSource } from '@/features/atlas/source/types';
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'admin' } }) }));

describe('Atlas sharing administration', () => {
  it('requires an explicit enable, keeps the opaque link and disables through the source', async () => {
    const token = '11111111-1111-4111-8111-111111111111';
    const source = { getPageSharing: vi.fn().mockResolvedValue(null), listPageAccesses: vi.fn().mockResolvedValue([
      { id:'visit', userId:'account', email:'reader@example.test', title:'Published page', version:3, accessedAt:'2026-10-08T12:00:00Z' },
    ]), setPageSharing: vi.fn().mockResolvedValueOnce({ token, enabled:true }).mockResolvedValueOnce({token,enabled:false}) } as unknown as AtlasSource;
    render(<PageSharingDialog page={makePage()} source={source} open onOpenChange={vi.fn()} />);
    expect(await screen.findByText('reader@example.test')).toBeInTheDocument();
    expect(source.setPageSharing).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', {name:'Enable sharing'}));
    expect(await screen.findByLabelText('Read-only page link')).toHaveValue(`${window.location.origin}/shared/pages/${token}`);
    expect(source.setPageSharing).toHaveBeenCalledWith('page-1',true);
    fireEvent.click(screen.getByRole('button', {name:'Disable sharing'}));
    await screen.findByRole('button', {name:'Enable sharing'});
    expect(source.setPageSharing).toHaveBeenLastCalledWith('page-1',false);
    expect(screen.queryByLabelText('Read-only page link')).not.toBeInTheDocument();
  });
  it('blocks enabling draft pages and fails closed when migration reads fail', async () => {
    const source = { getPageSharing:vi.fn().mockResolvedValue(null), listPageAccesses:vi.fn().mockResolvedValue([]), setPageSharing:vi.fn() } as unknown as AtlasSource;
    const view = render(<PageSharingDialog page={makePage({status:'draft'})} source={source} open onOpenChange={vi.fn()} />);
    expect(await screen.findByRole('button', {name:'Enable sharing'})).toBeDisabled();
    view.unmount();
    source.getPageSharing = vi.fn().mockRejectedValue(new Error('Missing table'));
    render(<PageSharingDialog page={makePage()} source={source} open onOpenChange={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Sharing is unavailable');
    expect(screen.getByRole('button', {name:'Enable sharing'})).toBeDisabled();
  });
});
