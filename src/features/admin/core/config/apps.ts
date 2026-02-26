import {
  DollarSign, ShoppingCart, Users, Target, LifeBuoy, Globe, BookOpen, Settings,
  Package, Eye, Layers, BoxSelect, FileText, Ship, BarChart3, Database, Upload, SlidersHorizontal,
  FileEdit, ShoppingBag, ClipboardList,
  Contact, Tags, Factory,
  Search, UserCheck, Megaphone, PieChart, Bot, Wrench,
  Kanban, CalendarCheck,
  Ticket, UsersRound, ShieldCheck,
  Layout, Palette, UserCircle, Store,
  BookMarked, HelpCircle,
  Building2, UserCog, Lock, ScrollText, Plug,
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
      { label: 'Catalog Publisher', route: '/admin/pricing/publisher', icon: FileText },
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
      { label: 'Quotations', route: '/admin/sales/quotations', icon: FileEdit },
      { label: 'Web Orders', route: '/admin/sales/web-orders', icon: ShoppingBag },
      { label: 'RX Orders', route: '/admin/sales/rx-orders', icon: ClipboardList },
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
    defaultRoute: '/admin/crm/pipeline',
    featurePrefix: 'crm',
    sidebarItems: [
      { label: 'Pipeline', route: '/admin/crm/pipeline', icon: Kanban },
      { label: 'Activities', route: '/admin/crm/activities', icon: CalendarCheck },
    ] satisfies SidebarItem[],
  },
  helpdesk: {
    key: 'helpdesk' as const,
    title: 'Helpdesk',
    icon: LifeBuoy,
    baseRoute: '/admin/helpdesk',
    defaultRoute: '/admin/helpdesk/tickets',
    featurePrefix: 'helpdesk',
    sidebarItems: [
      { label: 'Tickets', route: '/admin/helpdesk/tickets', icon: Ticket },
      { label: 'Teams', route: '/admin/helpdesk/teams', icon: UsersRound },
      { label: 'SLA Policies', route: '/admin/helpdesk/sla', icon: ShieldCheck },
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
      { label: 'Pages / Content', route: '/admin/website/content', icon: Layout },
      { label: 'Brand Microsites', route: '/admin/website/microsites', icon: Palette },
      { label: 'Patient Portals', route: '/admin/website/portals', icon: UserCircle },
      { label: 'Store / Products', route: '/admin/website/store', icon: Store },
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
      { label: 'Help Articles', route: '/admin/knowledge/help', icon: HelpCircle },
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
    ] satisfies SidebarItem[],
  },
} as const;
