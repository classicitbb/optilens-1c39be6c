import {
  DollarSign, ShoppingCart, Users, Target, LifeBuoy, Globe, BookOpen, Settings,
  Package, Eye, Layers, BoxSelect, FileText, Ship, BarChart3, Database, Upload, SlidersHorizontal, GitCompare,
  FileEdit,
  Contact, Tags, Factory,
  Search, UserCheck, Megaphone, PieChart, Bot, Wrench,
  Kanban, CalendarCheck, Inbox,
  LayoutDashboard,
  Ticket,
  Layout, UserCircle, Store,
  BookMarked, HelpCircle,
  Building2, UserCog, Lock, ScrollText, Plug, AlertTriangle, Key, Landmark, Mail,
  type LucideIcon,
} from 'lucide-react';

export type AppKey = keyof typeof ADMIN_APPS;

export interface SidebarItem {
  label: string;
  route: string;
  icon: LucideIcon;
}

export const ADMIN_APPS = {
  pricing: {
    key: 'pricing' as const,
    title: 'Pricing',
    icon: DollarSign,
    baseRoute: '/admin/pricing',
    defaultRoute: '/admin/pricing/catalog',
    featurePrefix: 'pricing',
    sidebarItems: [
      { label: 'Product Catalog', route: '/admin/pricing/catalog', icon: Package },
      { label: 'RX Lens Prices', route: '/admin/pricing/rx-lenses', icon: Eye },
      { label: 'Stock Lens Prices', route: '/admin/pricing/stock-lenses', icon: Layers },
      { label: 'Supplies Prices', route: '/admin/pricing/supplies', icon: BoxSelect },
      { label: 'Supplier Compare', route: '/admin/pricing/compare', icon: GitCompare },
      { label: 'Lens Catalog Builder', route: '/admin/pricing/publisher', icon: FileText },
      { label: 'Import Costings', route: '/admin/pricing/costings', icon: Ship },
      { label: 'Costing Reports', route: '/admin/pricing/costings/reports', icon: BarChart3 },
      { label: 'Reference Data', route: '/admin/pricing/reference', icon: Database },
      { label: 'Imports', route: '/admin/pricing/imports', icon: Upload },
      { label: 'Pricing Settings', route: '/admin/pricing/settings', icon: SlidersHorizontal },
    ] satisfies SidebarItem[],
  },
  sales: {
    key: 'sales' as const,
    title: 'Sales',
    icon: ShoppingCart,
    baseRoute: '/admin/sales',
    defaultRoute: '/admin/sales/quotations',
    featurePrefix: 'sales',
    sidebarItems: [
      { label: 'Orders', route: '/admin/orders', icon: Package },
      { label: 'Quotations', route: '/admin/sales/quotations', icon: FileEdit },
      { label: 'Proposals', route: '/admin/sales/proposals', icon: FileEdit },
    ] satisfies SidebarItem[],
  },
  contacts: {
    key: 'contacts' as const,
    title: 'Contacts',
    icon: Users,
    baseRoute: '/admin/contacts',
    defaultRoute: '/admin/contacts',
    featurePrefix: 'contacts',
    sidebarItems: [
      { label: 'All Contacts', route: '/admin/contacts', icon: Contact },
      { label: 'Tags Config', route: '/admin/contacts/config/tags', icon: Tags },
      { label: 'Industries Config', route: '/admin/contacts/config/industries', icon: Factory },
    ] satisfies SidebarItem[],
  },
  leads: {
    key: 'leads' as const,
    title: 'Leads',
    icon: Target,
    baseRoute: '/admin/leads',
    defaultRoute: '/admin/leads/finder',
    featurePrefix: 'leads',
    sidebarItems: [
      { label: 'Lead Finder', route: '/admin/leads/finder', icon: Search },
      { label: 'My Leads', route: '/admin/leads', icon: UserCheck },
      { label: 'Campaigns & Sequences', route: '/admin/leads/campaigns', icon: Megaphone },
      { label: 'Audit Reports', route: '/admin/leads/reports', icon: PieChart },
      { label: 'AI Assistant', route: '/admin/leads/ai', icon: Bot },
      { label: 'Settings', route: '/admin/leads/settings', icon: Wrench },
    ] satisfies SidebarItem[],
  },
  crm: {
    key: 'crm' as const,
    title: 'CRM',
    icon: Target,
    baseRoute: '/admin/crm',
    defaultRoute: '/admin/crm/dashboard',
    featurePrefix: 'crm',
    sidebarItems: [
      { label: 'Dashboard', route: '/admin/crm/dashboard', icon: LayoutDashboard },
      { label: 'Pipeline', route: '/admin/crm/pipeline', icon: Kanban },
      { label: 'Outbox', route: '/admin/crm/outbox', icon: Inbox },
      { label: 'Activities', route: '/admin/crm/activities', icon: CalendarCheck },
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
  website: {
    key: 'website' as const,
    title: 'Website',
    icon: Globe,
    baseRoute: '/admin/website',
    defaultRoute: '/admin/website/content',
    featurePrefix: 'website',
    sidebarItems: [
      { label: 'Website Portals', route: '/admin/website/portals', icon: UserCircle },
      { label: 'Store / Products', route: '/admin/website/store', icon: Store },
      { label: 'Pages / Content', route: '/admin/website/content', icon: Layout },
    ] satisfies SidebarItem[],
  },
  knowledge: {
    key: 'knowledge' as const,
    title: 'Knowledge',
    icon: BookOpen,
    baseRoute: '/admin/knowledge',
    defaultRoute: '/admin/knowledge/wiki',
    featurePrefix: 'knowledge',
    sidebarItems: [
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
      { label: 'Bank Payment Portals', route: '/admin/settings/bank-payment-portals', icon: Landmark },
      { label: 'Runtime Errors', route: '/admin/settings/runtime-errors', icon: AlertTriangle },
      { label: 'System Releases', route: '/admin/settings/releases', icon: BookMarked },
      { label: 'Email Previews', route: '/admin/settings/email-previews', icon: Mail },
    ] satisfies SidebarItem[],
  },
} as const;
