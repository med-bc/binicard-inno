export const routeName = "Ruta 8108 · Los Chinos (La C)";
export const routeHours = "4:30 a. m. – 10:00 p. m.";
export const routeFrequency = "aproximadamente cada 7 minutos";
export const routeDistricts = "Villa El Salvador, San Juan de Miraflores, Surco, San Borja, Ate, Santa Anita, El Agustino, Rímac, San Martín de Porres, Los Olivos, Comas y Puente Piedra";

export const etuchisaStops = [
  "Los Chinos",
  "Separadora Industrial",
  "María Reiche",
  "Revolución",
  "Colegio Unanué",
  "Forestal",
  "Las Lomas",
  "Universitaria Principal",
  "Modelo",
  "Mateo Pumacahua",
  "Pachacútec",
  "Curva de Nueva Esperanza",
  "9 de Diciembre",
  "8 de Octubre",
  "Pesquero",
  "Villa María",
  "Estación Villa María",
  "Elektra",
  "Villa Jardín",
  "Las Orquídeas",
  "Estación María Auxiliadora",
  "Los Héroes",
  "Estación San Juan",
  "Sedapal",
  "Ciudad",
  "El Pozo",
  "Atocongo",
  "Tinoco",
  "Mercado de Flores (Atocongo)",
  "Ricardo Palma",
  "Benavides",
  "Prosegur",
  "Pedagógico",
  "Vivanco",
  "Primavera",
  "Pentagonito",
  "Puerta del Centro",
  "Trébol de Javier Prado",
  "Los Quechuas",
  "Las Palmeras (Santa Anita)",
  "Puente Santa Rosa",
  "Puente Santa Anita",
  "El Pino",
  "Puente Azul",
  "Perales",
  "Lobatón",
  "Nocheto",
  "Atarjea",
  "Ramiro Prialé",
  "Puente Nuevo",
  "Mercado de Flores (Rímac)",
  "Acho",
  "Puente Trujillo",
  "Caquetá",
  "Puente Control",
  "Óvalo Habich",
  "Honorio Delgado",
  "Grifo Palao",
  "2da de Palao",
  "Británico",
  "Fiori",
  "Plaza Norte",
  "Senati",
  "Megaplaza",
  "Metro Izaguirre",
  "Plaza Vea Izaguirre",
  "Purina",
  "Caseta Tres Postes",
  "Villasol",
  "Yanbal",
  "César Vallejo",
  "Santa Luisa",
  "Puente San Martín",
  "Óvalo Infantas",
  "Plaza Vea",
  "Honestidad",
  "Huandoy / La Cordialidad",
  "Honradez",
  "Puente Chillón",
  "Parque Los Portales",
  "Las Poncianas",
  "Las Azucenas",
  "La Alborada",
  "Paradero 87-B",
  "Rosedal",
  "Los Rosales / Las Acacias",
  "Comisaría La Ensenada",
  "Los Olivos",
  "Grifo 70",
  "Las Palmeras",
  "Valle Hermoso"
];

export const demoFarePerSegment = 0.1;
export const demoBaseFare = 1;
export const demoMaximumFare = 6;

export function getStopFare(originIndex, destinationIndex, isUniversity = false) {
  if (!Number.isInteger(originIndex) || !Number.isInteger(destinationIndex)
    || originIndex < 0 || destinationIndex >= etuchisaStops.length
    || destinationIndex <= originIndex) {
    return null;
  }
  const segments = destinationIndex - originIndex;
  const regularFare = Math.min(
    demoMaximumFare,
    Math.round((demoBaseFare + segments * demoFarePerSegment) * 100) / 100
  );
  return {
    origin: etuchisaStops[originIndex],
    destination: etuchisaStops[destinationIndex],
    originIndex,
    destinationIndex,
    segments,
    regularFare,
    amount: isUniversity ? Math.round(regularFare * 50) / 100 : regularFare
  };
}
