export type OfferService = {
  id: string;
  name: string;
  type: string;
  totalAmount: number;
  currency: string;
};

export type FlightOffer = {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  price: number;
  currency: string;
  baseAmount: number;
  taxAmount: number;
  depTime: string;
  arrTime: string;
  origin: string;
  destination: string;
  depDate: string;
  arrDate: string;
  duration: string;
  stops: string;
  direct: boolean;
  services: OfferService[];
};

export type PassengerInfo = {
  first: string;
  last: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  passport: string;
};

export type OrderRecord = {
  id: string;
  bookingRef: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  cabin: string;
  status: string;
  passengerName: string;
  depTime: string;
  arrTime: string;
  depCode: string;
  depCity: string;
  arrCode: string;
  arrCity: string;
  duration: string;
  seat: string;
  gate: string;
  terminal: string;
  departureDate: string;
  amountUsd: number;
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
  pickupTime: string;
  dropoffTime: string;
  pickupLatitude: number;
  pickupLongitude: number;
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
};