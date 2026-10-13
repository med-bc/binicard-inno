export const demoAccounts = [
  { id: "passenger:00000001", dni: "00000001", password: "BiniCard123!", role: "normal", name: "Juan" },
  { id: "passenger:00000003", dni: "00000003", password: "BiniCard123!", role: "normal", name: "Mario" },
  { id: "passenger:00000002", dni: "00000002", password: "UniBini123!", role: "university", name: "Pérez" },
  { id: "driver:etuchisa.demo", username: "etuchisa.demo", password: "ChoferBini123!", role: "driver", name: "Chofer demo" }
];

export function findPassengerByDni(dni) {
  return demoAccounts.find((account) => account.role !== "driver" && account.dni === dni) || null;
}
