export type DesignEntry = {
  id: string;
  name: string;
  theme: "dark" | "light";
  href: string;
  kind: string;
};

export const DESIGNS: DesignEntry[] = [
  { id: "9:8", name: "Home Search", theme: "dark", href: "/", kind: "Flight" },
  { id: "9:105", name: "Search Results", theme: "dark", href: "/search", kind: "Flight" },
  { id: "9:206", name: "Flight Details", theme: "dark", href: "/flight", kind: "Flight" },
  { id: "9:285", name: "Passenger Details", theme: "dark", href: "/passengers", kind: "Flight" },
  { id: "9:344", name: "Web3 Checkout", theme: "dark", href: "/checkout", kind: "Flight" },
  { id: "9:568", name: "Processing Settlement (step 1)", theme: "dark", href: "/processing", kind: "Flight" },
  { id: "9:618", name: "E-Ticket Confirmation", theme: "dark", href: "/ticket", kind: "Flight" },
  { id: "9:718", name: "My Trips", theme: "dark", href: "/trips", kind: "Flight" },
  { id: "9:803", name: "Passenger Class Sheet", theme: "dark", href: "/passengers?sheet=class", kind: "Sheet" },
  { id: "9:862", name: "Filter & Sort Sheet", theme: "dark", href: "/search?sheet=filter", kind: "Sheet" },
  { id: "9:910", name: "Wallet Connection Sheet", theme: "dark", href: "/checkout?sheet=wallet", kind: "Sheet" },
  { id: "9:952", name: "Fare Rules Sheet", theme: "dark", href: "/flight?sheet=rules", kind: "Sheet" },
  { id: "9:1051", name: "Processing Settlement (step 2)", theme: "dark", href: "/processing?step=2", kind: "Flight" },
  { id: "9:1101", name: "E-Ticket (variant)", theme: "dark", href: "/ticket?v=b", kind: "Flight" },
  { id: "9:1196", name: "My Trips (variant)", theme: "dark", href: "/trips?v=b", kind: "Flight" },
  { id: "9:1258", name: "Passenger Class — full screen", theme: "dark", href: "/sheets/class", kind: "Sheet" },
  { id: "9:1338", name: "Filter & Sort — full screen", theme: "dark", href: "/sheets/filter", kind: "Sheet" },
  { id: "9:1413", name: "Wallet Connection — full screen", theme: "dark", href: "/sheets/wallet", kind: "Sheet" },
  { id: "9:1487", name: "Fare Rules — full screen", theme: "dark", href: "/sheets/rules", kind: "Sheet" },
  { id: "17:14", name: "Home Search", theme: "light", href: "/?t=light", kind: "Flight" },
  { id: "17:124", name: "Search Results", theme: "light", href: "/search?t=light", kind: "Flight" },
  { id: "17:234", name: "Flight Details", theme: "light", href: "/flight?t=light", kind: "Flight" },
  { id: "17:319", name: "Passenger Details", theme: "light", href: "/passengers?t=light", kind: "Flight" },
  { id: "17:385", name: "Web3 Checkout", theme: "light", href: "/checkout?t=light", kind: "Flight" },
  { id: "17:481", name: "Processing", theme: "light", href: "/processing?t=light", kind: "Flight" },
  { id: "17:526", name: "E-Ticket", theme: "light", href: "/ticket?t=light", kind: "Flight" },
  { id: "17:610", name: "My Trips", theme: "light", href: "/trips?t=light", kind: "Flight" },
  { id: "17:691", name: "Passenger Class Sheet", theme: "light", href: "/sheets/class?t=light", kind: "Sheet" },
  { id: "17:762", name: "Filter & Sort Sheet", theme: "light", href: "/sheets/filter?t=light", kind: "Sheet" },
  { id: "17:826", name: "Wallet Sheet", theme: "light", href: "/sheets/wallet?t=light", kind: "Sheet" },
  { id: "17:890", name: "Fare Rules Sheet", theme: "light", href: "/sheets/rules?t=light", kind: "Sheet" },
  { id: "17:1510", name: "Accommodations Search", theme: "dark", href: "/stays", kind: "Stays" },
  { id: "17:1600", name: "Accommodation Details", theme: "dark", href: "/stay", kind: "Stays" },
  { id: "17:1677", name: "Accommodation Confirmed", theme: "dark", href: "/stay/confirmed", kind: "Stays" },
  { id: "17:1775", name: "Car Rental Search", theme: "dark", href: "/cars", kind: "Cars" },
  { id: "17:1863", name: "Car Rental Details", theme: "dark", href: "/car", kind: "Cars" },
  { id: "17:1937", name: "Car Rental Confirmed", theme: "dark", href: "/car/confirmed", kind: "Cars" },
  { id: "17:2734", name: "Accommodations Search", theme: "light", href: "/stays?t=light", kind: "Stays" },
  { id: "17:2816", name: "Accommodation Details", theme: "light", href: "/stay?t=light", kind: "Stays" },
  { id: "17:2875", name: "Accommodation Confirmed", theme: "light", href: "/stay/confirmed?t=light", kind: "Stays" },
  { id: "17:2944", name: "Car Rental Search", theme: "light", href: "/cars?t=light", kind: "Cars" },
  { id: "17:3024", name: "Car Rental Details", theme: "light", href: "/car?t=light", kind: "Cars" },
  { id: "17:3080", name: "Car Rental Confirmed", theme: "light", href: "/car/confirmed?t=light", kind: "Cars" },
  { id: "47:63", name: "Onboarding (3 slides)", theme: "dark", href: "/onboarding", kind: "Onboarding" },
];

export const DESIGN_GROUPS = [
  { key: "Flight", label: "Flights" },
  { key: "Sheet", label: "Sheets" },
  { key: "Stays", label: "Accommodations" },
  { key: "Cars", label: "Car Rentals" },
  { key: "Onboarding", label: "Onboarding" },
] as const;