import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

describe('managed email payload', () => {
  it.each([
    { html: '<p>Hello partner</p>', text: undefined },
    { html: '<p>Hello partner</p>', text: '   ' },
    { html: '<img src="https://example.com/update.png" alt="Product update">', text: '' },
  ])('always supplies a nonblank text part for $html', async input => {
    const send = vi.fn(async (payload: { text: string }) => {
      if (!payload.text.trim()) throw new Error('missing_parameter: text');
    });
    const code = ts.transpileModule(readFileSync('supabase/functions/_shared/email/managed-send.ts', 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const exports: { sendManagedEmail?: (admin: unknown, input: unknown) => Promise<unknown> } = {};
    vm.runInNewContext(code, { exports, require: () => ({ sendLovableEmail: send, EmailAPIError: class extends Error {} }), Deno: { env: { get: () => 'fixture' } }, console });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const result = await exports.sendManagedEmail!({ from: () => ({ insert }) }, {
      ...input, to: 'partner@example.com', subject: 'Product update', messageId: 'fixture', label: 'raw',
    });
    expect(result).toEqual({ status: 'sent' });
    expect(send).toHaveBeenCalledOnce();
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'sent' }));
  });
});
