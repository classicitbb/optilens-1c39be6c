import {
  DollarSign, Users, Target, LifeBuoy, Globe, BookOpen, Settings,
  Package, Eye, FileText, Ship, BarChart3, Database, Upload, SlidersHorizontal, GitCompare,
  ListChecks,
  FileEdit,
  Contact, Tags,
  Search, UserCheck, Megaphone, PieChart, Bot, Wrench,
  Kanban, CalendarCheck, Inbox,
  LayoutDashboard,
  Ticket, MessageSquare,
  Layout, UserCircle, Store, ShoppingCart,
  BookMarked, ClipboardList, HelpCircle,
  Building2, UserCog, Lock, ScrollText, Plug, AlertTriangle, Key, Landmark, Mail, Activity, Smile, CreditCard, Wallet,
  type LucideIcon,
} from 'lucide-react';

export type AppKey = keyof typeof ADMIN_APPS;

export interface SidebarItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const ADMIN_APPS = {
  copilot: {
    key: 'copilot' as const,
    title: 'Copilot Workspace',
    icon: Bot,
    // The workspace itself is full-screen at /copilot; AI tools that use the
    // admin shell live under /admin/copilot so this sidebar shows for them.
    baseRoute: '/admin/copilot',
    defaultRoute: '/copilot',
    featurePrefix: 'copilot',
    sidebarItems: [
      { label: 'Open Workspace', route: '/copilot', icon: Bot },
      { label: 'Leads Assistant', route: '/admin/copilot/leads-assistant', icon: Target },
    ] satisfies SidebarItem[],
  },
  pricing: {
    key: 'pricing' as const,
    title: 'Pricing',
    icon: DollarSign,
    baseRoute: '/admin/pricing',
    defaultRoute: '/admin/pricing/catalog',
    featurePrefix: 'pricing',
    sidebarItems: [
      { label: 'Product Catalog', route: '/admin/pricing/catalog', icon: Package },
      { label: 'Pricelists', route: '/admin/pricing/pricelists', icon: Tags },
      { label: 'Supplier Compare', route: '/admin/pricing/compare', icon: GitCompare },
      { label: 'Lens Classification', route: '/admin/pricing/classification', icon: ListChecks },
      { label: 'Lens Catalog Builder', route: '/admin/pricing/publisher', icon: FileText },
      { label: 'Reference Data', route: '/admin/pricing/reference', icon: Database },
      { label: 'Alias Mapping', route: '/admin/pricing/alias-mapping', icon: GitCompare },
      { label: 'Imports', route: '/admin/pricing/imports', icon: Upload },
      { label: 'Pricing Settings', route: '/admin/pricing/settings', icon: SlidersHorizontal },
    ] satisfies SidebarItem[],
  },
  crm: {
    key: 'crm' as const,
    title: 'CRM',
    icon: Target,
    baseRoute: '/admin/crm',
    defaultRoute: '/admin/crm/dashboard',
    // No `crm` permission rows exist; `contacts` is held by every staff role
    // (viewer: view-only), so it gates the combined Contacts/Leads/CRM app.
    featurePrefix: 'contacts',
    sidebarItems: [
      { label: 'Dashboard', route: '/admin/crm/dashboard', icon: LayoutDashboard },
      { label: 'Pipeline', route: '/admin/crm/pipeline', icon: Kanban },
      { label: 'Contacts', route: '/admin/crm/contacts', icon: Contact },
      { label: 'My Leads', route: '/admin/crm/leads', icon: UserCheck },
      { label: 'Lead Finder', route: '/admin/crm/leads/finder', icon: Search },
      { label: 'Campaigns & Sequences', route: '/admin/crm/leads/campaigns', icon: Megaphone },
      { label: 'Lead Audit Reports', route: '/admin/crm/leads/reports', icon: PieChart },
      { label: 'Activities', route: '/admin/crm/activities', icon: CalendarCheck },
      { label: 'Outbox', route: '/admin/crm/outbox', icon: Inbox },
      { label: 'Proposals', route: '/admin/crm/proposals', icon: FileEdit },
      { label: 'CRM Settings', route: '/admin/crm/settings', icon: Wrench },
    ] satisfies SidebarItem[],
  },
  helpdesk: {
    key: 'helpdesk' as const,
    title: 'Helpdesk',
    icon: LifeBuoy,
    baseRoute: '/admin/helpdesk',
    defaultRoute: '/admin/helpdesk/overview',
    featurePrefix: 'helpdesk',
    sidebarItems: [
      { label: 'Overview', route: '/admin/helpdesk/overview', icon: LayoutDashboard },
      { label: 'Tickets', route: '/admin/helpdesk/tickets', icon: Ticket },
      { label: 'Config', route: '/admin/helpdesk/config', icon: Settings },
    ] satisfies SidebarItem[],
  },
  orders: {
    key: 'orders' as const,
    title: 'Orders',
    icon: ShoppingCart,
    baseRoute: '/admin/orders',
    defaultRoute: '/admin/orders',
    featurePrefix: 'orders',
    sidebarItems: [
      { label: 'Orders', route: '/admin/orders', icon: Package },
      { label: 'Quotations', route: '/admin/orders/quotations', icon: FileEdit },
      { label: 'Rx Order Form', route: '/admin/orders/quotations/new-rx', icon: Eye },
      { label: 'Stock Order Builder', route: '/admin/orders/stock-orders', icon: Package },
      { label: 'Innovations Submissions', route: '/admin/orders/rx-submissions', icon: Upload },
    ] satisfies SidebarItem[],
  },
  finance: {
    key: 'finance' as const,
    title: 'Finance',
    icon: Wallet,
    baseRoute: '/admin/finance',
    defaultRoute: '/admin/finance/costings',
    // No `finance` permission exists yet; `costings` is the finance feature every
    // staff role already holds, so launcher visibility matches the old Pricing entry.
    featurePrefix: 'costings',
    sidebarItems: [
      { label: 'Import Costings', route: '/admin/finance/costings', icon: Ship },
      { label: 'Costing Reports', route: '/admin/finance/costings/reports', icon: BarChart3 },
      { label: 'Payment Activity', route: '/admin/finance/payment-activity', icon: CreditCard },
      { label: 'Walk-in Payments', route: '/admin/finance/walk-in-payments', icon: Landmark },
      { label: 'Bank Payment Portals', route: '/admin/finance/bank-payment-portals', icon: Landmark },
    ] satisfies SidebarItem[],
  },
  website: {
    key: 'website' as const,
    title: 'Website',
    icon: Globe,
    baseRoute: '/admin/website',
    defaultRoute: '/admin/website/portals',
    featurePrefix: 'website',
    sidebarItems: [
      { label: 'Website Portals', route: '/admin/website/portals', icon: UserCircle },
      { label: 'Store / Products', route: '/admin/website/store', icon: Store },
      { label: 'Pages / Content', route: '/admin/website/content', icon: Layout },
      { label: 'Customer Feedback (NPS)', route: '/admin/website/nps', icon: Smile },
      { label: 'Feature Board', route: '/admin/website/features', icon: SlidersHorizontal },
      { label: 'Assistant Quality', route: '/admin/website/assistant/quality', icon: MessageSquare },
    ] satisfies SidebarItem[],
  },
  docstudio: {
    key: 'docstudio' as const,
    title: 'Doc Studio',
    icon: FileEdit,
    baseRoute: '/admin/docs',
    defaultRoute: '/admin/docs/studio',
    featurePrefix: 'website',
    sidebarItems: [
      { label: 'Studio', route: '/admin/docs/studio', icon: FileEdit },
    ] satisfies SidebarItem[],
  },
  knowledge: {
    key: 'knowledge' as const,
    title: 'Knowledge',
    icon: BookOpen,
    baseRoute: '/admin/knowledge',
    defaultRoute: '/admin/knowledge/sops',
    featurePrefix: 'knowledge',
    sidebarItems: [
      { label: 'SOPs', route: '/admin/knowledge/sops', icon: ClipboardList },
      { label: 'Wiki', route: '/admin/knowledge/wiki', icon: BookMarked },
    ] satisfies SidebarItem[],
  },
  settings: {
    key: 'settings' as const,
    title: 'Settings',
    icon: Settings,
    baseRoute: '/admin/settings',
    defaultRoute: '/admin/settings/company',
    featurePrefix: 'settings',
    sidebarItems: [
      { label: 'Company', route: '/admin/settings/company', icon: Building2 },
      { label: 'Users', route: '/admin/settings/users', icon: UserCog },
      { label: 'Roles & Permissions', route: '/admin/settings/roles', icon: Lock },
      { label: 'Audit Log', route: '/admin/settings/audit', icon: ScrollText },
      { label: 'Integrations', route: '/admin/settings/integrations', icon: Plug },
      { label: 'API Keys', route: '/admin/settings/api-keys', icon: Key },
      { label: 'Runtime Errors', route: '/admin/settings/runtime-errors', icon: AlertTriangle },
      { label: 'System Releases', route: '/admin/settings/releases', icon: BookMarked },
      { label: 'Email Previews', route: '/admin/settings/email-previews', icon: Mail },
      { label: 'Edge Function Status', route: '/admin/settings/edge-functions', icon: Activity },
    ] satisfies SidebarItem[],
  },
} as const;
