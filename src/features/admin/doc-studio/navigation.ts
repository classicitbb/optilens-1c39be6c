import { FileText, FolderOpen, Image, Mail, PenLine, Receipt, Tag, Truck } from 'lucide-react';

export const DOC_STUDIO_TOOLS = [
  { key: 'invoice', label: 'Invoice', tab: 'billing', billType: 'invoice', icon: Receipt },
  { key: 'quote', label: 'Quotation', tab: 'billing', billType: 'quote', icon: Receipt },
  { key: 'email', label: 'Email', tab: 'email', icon: Mail },
  { key: 'letter', label: 'Letterhead', tab: 'letter', icon: FileText },
  { key: 'files', label: 'My Files', tab: 'files', icon: FolderOpen },
  { key: 'signature', label: 'Signature', tab: 'signature', icon: PenLine },
  { key: 'social', label: 'Social', tab: 'social', icon: Image },
  { key: 'shiplabel', label: 'Ship Label', tab: 'shiplabel', icon: Truck },
  { key: 'statement', label: 'Statement', tab: 'statement', icon: Tag },
  { key: 'proforma', label: 'Pro forma', tab: 'billing', billType: 'proforma', icon: Receipt },
  { key: 'receipt', label: 'Receipt', tab: 'billing', billType: 'receipt', icon: Receipt },
].map(tool => ({ ...tool, route: `/admin/docs/studio?tab=${tool.tab}${'billType' in tool ? `&billType=${tool.billType}` : ''}` }));

export function studioToolForState(tab: string, billType?: string) {
  return DOC_STUDIO_TOOLS.find(tool => tool.tab === tab && (tool.tab !== 'billing' || ('billType' in tool && tool.billType === billType)));
}

const recentKey = (userId: string) => `docstudio-recent-tools:${userId}`;
export function recentStudioTools(userId?: string) {
  let recent: string[] = [];
  try {
    const stored: unknown = userId ? JSON.parse(localStorage.getItem(recentKey(userId)) || '[]') : [];
    if (Array.isArray(stored)) recent = [...new Set(stored.filter((key): key is string => typeof key === 'string'))];
  } catch { /* Defaults remain available when browser storage is unavailable. */ }
  return [...recent.map(key => DOC_STUDIO_TOOLS.find(tool => tool.key === key)).filter((tool): tool is typeof DOC_STUDIO_TOOLS[number] => !!tool), ...DOC_STUDIO_TOOLS.filter(tool => !recent.includes(tool.key))];
}

export function rememberStudioTool(userId: string | undefined, key: string) {
  if (!userId || !DOC_STUDIO_TOOLS.some(tool => tool.key === key)) return;
  try { localStorage.setItem(recentKey(userId), JSON.stringify([key, ...recentStudioTools(userId).map(tool => tool.key).filter(item => item !== key)].slice(0, DOC_STUDIO_TOOLS.length))); } catch { /* Navigation must still work. */ }
}
