export type OfferService = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  currency: string;
  maximumQuantity?: number;
};

export type OfferConditions = {
  refund_before_departure?: {
    allowed: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
  change_before_departure?: {
    allowed: boolean;
    penalty_amount?: string;
    penalty_currency?: string;
  };
};

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumber: string;
  price: number;
  currency: string;
  baseAmount: number;
  taxAmount: number;
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  originAirport?: string;
  destinationAirport?: string;
  originCity?: string;
  destinationCity?: string;
  depDate: string;
  arrDate: string;
  duration: string;
  durationMinutes?: number;
  stops: string;
  stopsCount?: number;
  direct: boolean;
  emissionsKg?: string;
  expiresAt?: string;
  passengerIds?: string[];
  requiresInstantPayment?: boolean;
  paymentRequiredBy?: string;
  services: OfferService[];
  conditions?: OfferConditions;
  aircraft?: string;
  cabin?: string;
  seatsRemaining?: number;
  amenities?: string[];
  totalBaggages?: number;
  partialRefundable?: boolean;
  partialChangeable?: boolean;
};

export type PassengerInfo = {
  first: string;
  last: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  dialCode?: string;
  passport: string;
};

export type OrderStatus = "confirmed" | "awaiting_payment" | "cancelled";

export type Booking = {
  kind: "flight" | "stay" | "car";
  id: string;
  reference: string;
  email: string;
  title: string;
  subtitle: string;
  status: OrderStatus | string;
  depTime: string;
  arrTime: string;
  dep: string;
  arr: string;
  amount: number;
  airlineLogo?: string;
  image?: string;
  createdAt?: string;
  date?: string;
  arrDate?: string;
  actions?: string[];
};

export type OrderRecord = {
  id: string;
  bookingRef: string;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  flightNumber: string;
  cabin: string;
  status: OrderStatus;
  passengerName: string;
  depTime: string;
  arrTime: string;
  depCode: string;
  depCity: string;
  depAirport?: string;
  arrCode: string;
  arrCity: string;
  arrAirport?: string;
  duration: string;
  seat: string;
  gate: string;
  terminal: string;
  departureDate: string;
  amountUsd: number;
};

export type OrderSlice = {
  id: string;
  origin: { code: string; name: string; city: string; terminal: string };
  destination: { code: string; name: string; city: string; terminal: string };
  depTime: string;
  arrTime: string;
  depDate: string;
  arrDate: string;
  duration: string;
  stops: number;
  carrier: string;
  carrierCode: string;
  flightNumber: string;
  aircraft: string;
};

export type OrderPassenger = {
  id: string;
  givenName: string;
  familyName: string;
  title: string;
  gender: string;
  bornOn: string;
  email: string;
  phone: string;
  seat?: string;
  cabin: string;
};

export type OrderService = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  currency: string;
  quantity: number;
  segmentIds: string[];
  passengerIds: string[];
};

export type OrderCondition = {
  allowed: boolean;
  type?: string;
  penaltyAmount?: number;
  penaltyCurrency?: string;
};

export type OrderDetail = {
  id: string;
  bookingRef: string;
  status: OrderStatus;
  airline: string;
  airlineCode: string;
  airlineLogo?: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  slices: OrderSlice[];
  passengers: OrderPassenger[];
  services: OrderService[];
  conditions: {
    refund?: OrderCondition;
    change?: OrderCondition;
    advanceSeatSelection?: boolean;
    priorityBoarding?: boolean;
    priorityCheckIn?: boolean;
  };
  metadata: Record<string, unknown>;
  availableActions: string[];
  documents?: { type: string; uniqueIdentifier: string }[];
};

export type StayOffer = {
  id: string;
  resultId: string;
  name: string;
  rating: number;
  reviews: number;
  city: string;
  location: string;
  pricePerNight: number;
  totalAmount: number;
  currency: string;
  image: string;
  images: string[];
  checkIn: string;
  checkOut: string;
  rateId?: string;
  latitude: number;
  longitude: number;
  description?: string;
  amenities?: string[];
  starRating?: number;
  supplierName?: string;
  checkInTime?: string;
  checkOutTime?: string;
};

export type CarOffer = {
  id: string;
  name: string;
  category: string;
  transmission: string;
  fuel: string;
  seats: number;
  pricePerDay: number;
  totalAmount: number;
  currency: string;
  supplier: string;
  image: string;
  pickup: string;
  dropoff: string;
  pickupDate: string;
  dropoffDate: string;
  pickupTime: string;
  dropoffTime: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffLatitude: number;
  dropoffLongitude: number;
  doors?: number;
  luggage?: number;
  airCon?: boolean;
  gps?: boolean;
  bluetooth?: boolean;
  usb?: boolean;
  mileage?: string;
  fuelPolicy?: string;
  insuranceIncluded?: boolean;
  additionalDriver?: boolean;
};

export type StayBooking = {
  id: string;
  reference: string;
  status: string;
  checkIn: string;
  checkOut: string;
  accommodationName: string;
  totalAmount: number;
  currency: string;
  address?: string;
  image?: string;
  payment?: { txHash: string; chain: string; amountUsd: number };
};

export type CarBooking = {
  id: string;
  reference: string;
  status: string;
  carName: string;
  pickupDate: string;
  dropoffDate: string;
  pickupLocation: string;
  totalAmount: number;
  currency: string;
  image?: string;
  payment?: { txHash: string; chain: string; amountUsd: number };
};