"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

type Lang = "en" | "es" | "fr" | "de";

const DICT: Record<Lang, Record<string, string>> = {
  en: {
    home: "Home",
    explore: "Explore",
    bookmarks: "Bookmarks",
    profile: "Profile",
    searchFlights: "Search Flights",
    searchStays: "Search Stays",
    searchCars: "Search Cars",
    bookNow: "Book Now",
    bookThisCar: "Book This Car",
    continue: "Continue",
    continueCheckout: "Continue to Checkout",
    selectFlight: "Select Flight",
    proceedPassengers: "Proceed to Passenger Details",
    connectWallet: "Connect Wallet to Pay",
    priceGuaranteed: "Price Guaranteed",
    totalPayable: "Total Payable",
    popular: "Popular",
    myBookings: "My Bookings",
    upcoming: "Upcoming",
    past: "Past",
    noAccount: "No account needed. Your ticket will be sent to your email and saved to this device.",
    flights: "Flights",
    stays: "Stays",
    cars: "Cars",
  },
  es: {
    home: "Inicio",
    explore: "Explorar",
    bookmarks: "Guardados",
    profile: "Perfil",
    searchFlights: "Buscar Vuelos",
    searchStays: "Buscar Alojamientos",
    searchCars: "Buscar Coches",
    bookNow: "Reservar Ahora",
    bookThisCar: "Reservar Este Coche",
    continue: "Continuar",
    continueCheckout: "Continuar al Pago",
    selectFlight: "Seleccionar Vuelo",
    proceedPassengers: "Continuar a Datos del Pasajero",
    connectWallet: "Conectar Cartera para Pagar",
    priceGuaranteed: "Precio Garantizado",
    totalPayable: "Total a Pagar",
    popular: "Popular",
    myBookings: "Mis Reservas",
    upcoming: "Próximos",
    past: "Pasados",
    noAccount: "No necesitas cuenta. Tu billete se enviará a tu correo y se guardará en este dispositivo.",
    flights: "Vuelos",
    stays: "Alojamientos",
    cars: "Coches",
  },
  fr: {
    home: "Accueil",
    explore: "Explorer",
    bookmarks: "Favoris",
    profile: "Profil",
    searchFlights: "Rechercher des Vols",
    searchStays: "Rechercher des Hébergements",
    searchCars: "Rechercher des Voitures",
    bookNow: "Réserver",
    bookThisCar: "Réserver Cette Voiture",
    continue: "Continuer",
    continueCheckout: "Continuer vers le Paiement",
    selectFlight: "Sélectionner le Vol",
    proceedPassengers: "Continuer vers les Passagers",
    connectWallet: "Connecter le Portefeuille",
    priceGuaranteed: "Prix Garanti",
    totalPayable: "Total à Payer",
    popular: "Populaire",
    myBookings: "Mes Réservations",
    upcoming: "À venir",
    past: "Passés",
    noAccount: "Aucun compte requis. Votre billet sera envoyé par e-mail et enregistré sur cet appareil.",
    flights: "Vols",
    stays: "Hébergements",
    cars: "Voitures",
  },
  de: {
    home: "Start",
    explore: "Entdecken",
    bookmarks: "Lesezeichen",
    profile: "Profil",
    searchFlights: "Flüge Suchen",
    searchStays: "Unterkünfte Suchen",
    searchCars: "Autos Suchen",
    bookNow: "Jetzt Buchen",
    bookThisCar: "Dieses Auto Buchen",
    continue: "Weiter",
    continueCheckout: "Weiter zur Zahlung",
    selectFlight: "Flug Auswählen",
    proceedPassengers: "Weiter zu Passagierdaten",
    connectWallet: "Wallet Verbinden",
    priceGuaranteed: "Preis Garantiert",
    totalPayable: "Zu Zahlender Betrag",
    popular: "Beliebt",
    myBookings: "Meine Buchungen",
    upcoming: "Bevorstehend",
    past: "Vergangen",
    noAccount: "Kein Konto nötig. Ihr Ticket wird per E-Mail gesendet und auf diesem Gerät gespeichert.",
    flights: "Flüge",
    stays: "Unterkünfte",
    cars: "Autos",
  },
};

export function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  const host = (window as Window & { nimiqPay?: { language?: string } })
    .nimiqPay?.language;
  const raw = host || navigator.language?.split("-")[0] || "en";
  return raw in DICT ? (raw as Lang) : "en";
}

const I18nContext = createContext<{ lang: Lang; t: (k: string) => string }>({
  lang: "en",
  t: (k) => k,
});

export function useI18n() {
  return useContext(I18nContext);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang] = useState<Lang>(() => {
    if (typeof window === "undefined") return "en";
    const host = (window as Window & { nimiqPay?: { language?: string } })
      .nimiqPay?.language;
    if (host && host in DICT) return host as Lang;
    return detectLang();
  });

  const t = (k: string) => DICT[lang][k] ?? DICT.en[k] ?? k;

  return (
    <I18nContext.Provider value={{ lang, t }}>{children}</I18nContext.Provider>
  );
}