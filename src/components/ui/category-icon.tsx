import { Bot, Briefcase, Building2, Cloud, CodeXml, Gamepad2, GraduationCap, Megaphone, Palette, Search, Shapes, ShoppingBag, Sparkles, Wallet, Zap, Heart, Music, Camera, Plane, Leaf, Shield, Cpu, Newspaper, type LucideIcon } from "lucide-react";

/** Icons admins can pick for categories. Keys are stored in the database. */
export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  bot: Bot,
  code: CodeXml,
  megaphone: Megaphone,
  search: Search,
  cloud: Cloud,
  "shopping-bag": ShoppingBag,
  palette: Palette,
  zap: Zap,
  building: Building2,
  "graduation-cap": GraduationCap,
  briefcase: Briefcase,
  wallet: Wallet,
  gamepad: Gamepad2,
  shapes: Shapes,
  sparkles: Sparkles,
  heart: Heart,
  music: Music,
  camera: Camera,
  plane: Plane,
  leaf: Leaf,
  shield: Shield,
  cpu: Cpu,
  newspaper: Newspaper,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = CATEGORY_ICONS[name] ?? Sparkles;
  return <Icon aria-hidden className={className} />;
}
