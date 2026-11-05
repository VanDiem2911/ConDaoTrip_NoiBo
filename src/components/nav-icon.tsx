import {
  ArrowLeftRight, BookOpenText, CalendarCheck, Calculator, ChartColumn, Coins, CreditCard, House, Plane,
  Route, Settings, Truck, Users, Hotel, Utensils, Camera, Bike, Fish, Anchor, Ticket, PartyPopper, Ship,
  UserRound, Package, Layers, Map as MapIcon, Compass, Wallet,
} from "lucide-react";
import type { NavIcon } from "@/lib/access";

const MAP = {
  home: House, plane: Plane, calc: Calculator, calendar: CalendarCheck, users: Users, coins: Coins,
  ledger: BookOpenText, swap: ArrowLeftRight, card: CreditCard, chart: ChartColumn, settings: Settings,
  route: Route, truck: Truck,
} as const;

export function NavGlyph({ name, className = "size-5" }: { name: NavIcon; className?: string }) {
  const I = MAP[name];
  return <I className={className} strokeWidth={1.8} aria-hidden />;
}

const CAT: Record<string, typeof Hotel> = {
  hotel: Hotel, flight: Plane, ferry: Ship, transfer: Truck, rental: Bike, boat: Anchor, fishing: Fish,
  gear: Layers, guide: UserRound, meal: Utensils, ticket: Ticket, event: PartyPopper, photo: Camera,
  tour: Compass, package: Package, other: MapIcon,
};
export function CategoryGlyph({ category, className = "size-5" }: { category: string; className?: string }) {
  const I = CAT[category] ?? Wallet;
  return <I className={className} strokeWidth={1.8} aria-hidden />;
}
