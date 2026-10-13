const KEYS = {
  issued: "binicard-demo-issued-tickets",
  scanned: "binicard-demo-scanned-tickets",
  complaints: "binicard-demo-complaints",
  supervisor: "binicard-demo-supervisor-phone",
  driverEarnings: "binicard-demo-driver-earnings",
  driverPhoto: "binicard-demo-driver-photo"
};

const HISTORY_TTL = 30 * 24 * 60 * 60 * 1000;
const STARTING_BALANCE = 1000;

function accountBalanceKey(accountId) {
  return `binicard-demo-balance:${accountId}`;
}

function readArray(key) {
  const value = localStorage.getItem(key);
  if (!value) return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed)) throw new Error(`Los datos guardados para ${key} no tienen el formato esperado.`);
  return parsed;
}

function reportStorageError(action, error) {
  console.error(`No se pudo ${action} en el almacenamiento local.`, error);
  window.dispatchEvent(new CustomEvent("binicard-storage-error", {
    detail: { message: `No se pudo ${action}.` }
  }));
  return false;
}

export function getAccountBalance(accountId) {
  try {
    const saved = localStorage.getItem(accountBalanceKey(accountId));
    if (saved === null) return STARTING_BALANCE;
    const balance = Number(saved);
    if (!Number.isFinite(balance) || balance < 0) throw new Error("El saldo guardado no es válido.");
    return balance;
  } catch (error) {
    reportStorageError("leer el saldo de la cuenta", error);
    return null;
  }
}

export function getDriverEarnings() {
  try {
    const earnings = Number(localStorage.getItem(KEYS.driverEarnings) || 0);
    if (!Number.isFinite(earnings) || earnings < 0) throw new Error("El dinero líquido guardado no es válido.");
    return earnings;
  } catch (error) {
    reportStorageError("leer el dinero líquido del chofer", error);
    return null;
  }
}

export function completeTicketPurchase(ticket) {
  const balanceKey = accountBalanceKey(ticket.userId);
  const keys = [KEYS.issued, balanceKey, KEYS.driverEarnings];
  let previousValues;
  try {
    previousValues = new Map(keys.map((key) => [key, localStorage.getItem(key)]));
    const balance = getAccountBalance(ticket.userId);
    const currentEarnings = getDriverEarnings();
    if (balance === null || currentEarnings === null) return false;
    if (ticket.amount > balance) return "insufficient";
    const tickets = readArray(KEYS.issued).filter((item) => item.code !== ticket.code && item.expiresAt > Date.now());
    tickets.unshift({ ...ticket, usedAt: null, expiresAt: Date.now() + HISTORY_TTL });
    const earnings = currentEarnings + ticket.amount;
    localStorage.setItem(KEYS.issued, JSON.stringify(tickets));
    localStorage.setItem(balanceKey, String(Math.round((balance - ticket.amount) * 100) / 100));
    localStorage.setItem(KEYS.driverEarnings, String(Math.round(earnings * 100) / 100));
    return true;
  } catch (error) {
    for (const [key, value] of previousValues || []) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch (rollbackError) {
        console.error(`No se pudo restaurar ${key} después de un fallo de compra.`, rollbackError);
      }
    }
    return reportStorageError("registrar la compra", error);
  }
}

export function loadTicketHistory(accountId) {
  try {
    const now = Date.now();
    const tickets = readArray(KEYS.issued).filter((ticket) =>
      Number.isFinite(ticket.expiresAt)
      && ticket.expiresAt > now
      && (ticket.userId === accountId || (ticket.recipientUserId === accountId && ticket.recipientStatus === "accepted"))
    );
    return tickets;
  } catch (error) {
    reportStorageError("leer el historial de boletos", error);
    return [];
  }
}

export function loadPendingFriendTickets(recipientUserId) {
  try {
    const now = Date.now();
    return readArray(KEYS.issued).filter((ticket) =>
      Number.isFinite(ticket.expiresAt)
      && ticket.expiresAt > now
      && ticket.recipientUserId === recipientUserId
      && ticket.recipientStatus === "pending"
    );
  } catch (error) {
    reportStorageError("leer los boletos recibidos", error);
    return [];
  }
}

export function updateFriendTicketStatus(code, recipientUserId, status) {
  if (!["accepted", "rejected"].includes(status)) {
    throw new Error(`Estado de boleto recibido no válido: ${status}`);
  }
  try {
    const tickets = readArray(KEYS.issued);
    const ticket = tickets.find((item) =>
      item.code === code
      && item.recipientUserId === recipientUserId
      && item.recipientStatus === "pending"
      && item.expiresAt > Date.now()
    );
    if (!ticket) return false;
    ticket.recipientStatus = status;
    ticket.respondedAt = Date.now();
    localStorage.setItem(KEYS.issued, JSON.stringify(tickets));
    return ticket;
  } catch (error) {
    reportStorageError("actualizar la respuesta al boleto recibido", error);
    return false;
  }
}

export function findIssuedTicket(code) {
  try {
    const ticket = readArray(KEYS.issued).find((item) => item.code === code && item.expiresAt > Date.now());
    return ticket || null;
  } catch (error) {
    reportStorageError("verificar el boleto", error);
    return null;
  }
}

export function markTicketUsed(code) {
  try {
    const tickets = readArray(KEYS.issued);
    const ticket = tickets.find((item) => item.code === code && item.expiresAt > Date.now());
    if (!ticket) return false;
    if (ticket.usedAt) return "used";
    ticket.usedAt = Date.now();
    localStorage.setItem(KEYS.issued, JSON.stringify(tickets));
    return ticket;
  } catch (error) {
    reportStorageError("marcar el boleto como usado", error);
    return false;
  }
}

export function loadScannedTickets() {
  try {
    const now = Date.now();
    const tickets = readArray(KEYS.scanned).filter((ticket) => Number.isFinite(ticket.expiresAt) && ticket.expiresAt > now);
    localStorage.setItem(KEYS.scanned, JSON.stringify(tickets));
    return tickets;
  } catch (error) {
    reportStorageError("leer el historial escaneado", error);
    return [];
  }
}

export function saveScannedTicket(ticket) {
  try {
    const tickets = readArray(KEYS.scanned).filter((item) => item.code !== ticket.code && item.expiresAt > Date.now());
    tickets.unshift({ ...ticket, expiresAt: Date.now() + HISTORY_TTL });
    localStorage.setItem(KEYS.scanned, JSON.stringify(tickets));
    return true;
  } catch (error) {
    return reportStorageError("guardar el boleto escaneado", error);
  }
}

export function loadComplaints() {
  try {
    return readArray(KEYS.complaints);
  } catch (error) {
    reportStorageError("leer el libro de reclamaciones", error);
    return [];
  }
}

export function saveComplaint(complaint) {
  try {
    const complaints = readArray(KEYS.complaints);
    complaints.unshift(complaint);
    localStorage.setItem(KEYS.complaints, JSON.stringify(complaints));
    return true;
  } catch (error) {
    return reportStorageError("guardar el reclamo", error);
  }
}

export function loadSupervisorPhone() {
  try {
    return localStorage.getItem(KEYS.supervisor) || "";
  } catch (error) {
    reportStorageError("leer el contacto de superiores", error);
    return "";
  }
}

export function saveSupervisorPhone(phone) {
  try {
    localStorage.setItem(KEYS.supervisor, phone);
    return true;
  } catch (error) {
    return reportStorageError("guardar el contacto de superiores", error);
  }
}

export function loadDriverPhoto() {
  try {
    return localStorage.getItem(KEYS.driverPhoto) || "";
  } catch (error) {
    reportStorageError("leer la foto del transporte", error);
    return "";
  }
}

export function saveDriverPhoto(photo) {
  try {
    localStorage.setItem(KEYS.driverPhoto, photo);
    return true;
  } catch (error) {
    return reportStorageError("guardar la foto del transporte", error);
  }
}
