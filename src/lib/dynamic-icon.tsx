/**
 * Dynamic icon resolver — converts Lucide icon name string to a React component.
 * Used for property type icons stored in DB as string names (e.g. "Home", "Building").
 */
import {
  Home, Building2, Building, Warehouse, Trees, Gamepad2,
  Shovel, Warehouse as WarehouseIcon, Heart, Star, MapPin,
  Dumbbell, Waves, Fence, Car, Coffee, Shield, Zap,
  Sun, Moon, Cloud, Leaf, Flower2, Dog, Cat, Bird,
  Castle, Landmark, Bank, Church, Warehouse2
} from "lucide-react";

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Home,
  Building: Building2,
  Building2,
  Warehouse,
  Trees,
  TreePine: Trees,
  Gamepad: Gamepad2,
  Shovel,
  Warehouse2,
  Castle,
  Landmark,
  Bank,
  Church,
  Hotel: Building2,
  Store: Building2,
  Factory: Warehouse,
  Tent: Castle,
  default: Building2,
};

/**
 * Resolve a Lucide icon name to a component.
 * Falls back to `Building2` if not found.
 */
export function getIconByName(name: string | null | undefined): React.FC<{ className?: string }> {
  if (!name) return Building2;
  // Try exact match first
  const found = ICON_MAP[name];
  if (found) return found;
  // Try with first letter uppercased
  const pascal = name.charAt(0).toUpperCase() + name.slice(1);
  const pascalFound = ICON_MAP[pascal];
  if (pascalFound) return pascalFound;
  return Building2;
}