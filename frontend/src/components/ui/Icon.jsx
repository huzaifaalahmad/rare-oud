import {
  BadgeCheck,
  Bell,
  Boxes,
  ChartNoAxesCombined,
  CircleUserRound,
  Contact,
  GalleryVerticalEnd,
  Heart,
  Home,
  Layers3,
  Mail,
  Menu,
  MessageCircle,
  Music,
  Package,
  PackageSearch,
  PenLine,
  Phone,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  UserRound,
  WandSparkles,
  X
} from 'lucide-react';

const icons = {
  home: Home,
  products: ShoppingBag,
  productSearch: PackageSearch,
  accessories: Boxes,
  music: Music,
  favorite: Heart,
  reviews: Star,
  verified: BadgeCheck,
  contact: Contact,
  phone: Phone,
  whatsapp: MessageCircle,
  mail: Mail,
  admin: ShieldCheck,
  users: UserRound,
  profile: CircleUserRound,
  content: PenLine,
  settings: Settings,
  orders: Package,
  analytics: ChartNoAxesCombined,
  gallery: GalleryVerticalEnd,
  categories: Layers3,
  search: Search,
  filters: SlidersHorizontal,
  sparkle: Sparkles,
  magic: WandSparkles,
  bell: Bell,
  menu: Menu,
  close: X
};

export default function Icon({
  name,
  size = 20,
  strokeWidth = 1.8,
  className = '',
  ...props
}) {
  const Component = icons[name] || Sparkles;

  return (
    <Component
      size={size}
      strokeWidth={strokeWidth}
      className={`lux-icon ${className}`.trim()}
      aria-hidden="true"
      focusable="false"
      {...props}
    />
  );
}
