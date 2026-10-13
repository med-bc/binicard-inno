import { demoState } from "./state.js";
import { findPassengerByDni } from "./accounts.js";
import {
  demoBaseFare,
  demoFarePerSegment,
  demoMaximumFare,
  etuchisaStops,
  getStopFare,
  routeDistricts,
  routeFrequency,
  routeHours,
  routeName
} from "./route.js";
import {
  completeTicketPurchase,
  getAccountBalance,
  findIssuedTicket,
  loadPendingFriendTickets,
  loadScannedTickets,
  loadTicketHistory,
  markTicketUsed,
  saveScannedTicket,
  updateFriendTicketStatus
} from "./storage.js";
import { setAccountBalanceDisplay, setDriverBalanceDisplay, showModal, showToast, switchScreen } from "./ui.js";

let cameraStream = null;
let cameraTimer = null;
let barcodeDetector = null;

function isUniversity() {
  return demoState.currentUser?.role === "university";
}

function populateStopSelect(select, placeholder) {
  select.replaceChildren();
  if (placeholder) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = placeholder;
    select.append(option);
  }
  etuchisaStops.forEach((stop, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${String(index + 1).padStart(3, "0")} · ${stop}`;
    select.append(option);
  });
}

function readRoute(originId, destinationId) {
  if (originId === "" || destinationId === "") return null;
  return getStopFare(Number(originId), Number(destinationId), isUniversity());
}

function setRouteEstimate(origin, destination, elementId) {
  const target = document.getElementById(elementId);
  const route = readRoute(origin.value, destination.value);
  if (!route) {
    target.textContent = "Selecciona el origen y un paradero posterior en la ruta.";
    return null;
  }
  const regular = route.regularFare.toFixed(2);
  const discount = isUniversity()
    ? ` · Tarifa regular S/ ${regular} con 50% de descuento universitario`
    : "";
  target.textContent = `${route.segments} tramos · Tarifa demo: S/ ${route.amount.toFixed(2)}${discount}`;
  return route;
}

export function updateRouteEstimate() {
  setRouteEstimate(
    document.getElementById("route-origin"),
    document.getElementById("route-destination"),
    "route-estimate"
  );
}

export function showPassengerTariff() {
  const studentInfo = isUniversity()
    ? "<p class=\"mt-2 font-bold text-emerald-700\">Tu cuenta universitaria aplica 50% de descuento en todos los viajes de esta demo.</p>"
    : "<p class=\"mt-2\">El perfil universitario recibe 50% de descuento en esta demostración.</p>";
  showModal("Tarifario Etuchisa · referencial", `<p>${routeName}: Santa María (Villa El Salvador) a Valle Hermoso (Puente Piedra). Calcula el precio eligiendo los paraderos en el orden de la ruta.</p><p class=\"mt-2\">Fórmula de prueba: S/ ${demoBaseFare.toFixed(2)} + S/ ${demoFarePerSegment.toFixed(2)} por tramo, hasta S/ ${demoMaximumFare.toFixed(2)}. Es un cálculo referencial, no confirma una tarifa oficial.</p><p class=\"mt-2\">Horario informado: ${routeHours}; frecuencia aproximada: ${routeFrequency}.</p><p class=\"mt-2\">Distritos informados: ${routeDistricts}.</p>${studentInfo}`);
}

function updateFriendRouteEstimate() {
  setRouteEstimate(
    document.getElementById("friend-origin"),
    document.getElementById("friend-destination"),
    "friend-route-estimate"
  );
}

function updateDriverFare() {
  const origin = document.getElementById("driver-fare-origin");
  const destination = document.getElementById("driver-fare-destination");
  const result = document.getElementById("driver-fare-result");
  const route = readRoute(origin.value, destination.value);
  result.textContent = route
    ? `${route.origin} → ${route.destination} · ${route.segments} tramos · S/ ${route.regularFare.toFixed(2)} (referencial)`
    : "Selecciona un paradero de origen y otro posterior en la ruta.";
}

function renderDriverStops() {
  const stops = document.getElementById("driver-stops-list");
  stops.replaceChildren();
  etuchisaStops.forEach((stop, index) => {
    const item = document.createElement("li");
    item.className = "flex gap-2";
    const number = document.createElement("span");
    number.className = "w-8 shrink-0 font-mono text-slate-400";
    number.textContent = String(index + 1).padStart(3, "0");
    const name = document.createElement("span");
    name.textContent = stop;
    item.append(number, name);
    stops.append(item);
  });
}

function showPayment(route, friend = null) {
  const user = demoState.currentUser;
  const friendDni = friend?.dni || "";
  demoState.selectedPurchase = {
    origin: route.origin,
    destination: route.destination,
    originIndex: route.originIndex,
    destinationIndex: route.destinationIndex,
    distance: route.segments,
    regularFare: route.regularFare,
    amount: route.amount,
    friendDni,
    userRole: user?.role || "normal",
    userName: user?.name || "Usuario demo",
    userId: user?.id || "",
    recipientUserId: friend?.id || "",
    recipientName: friend?.name || ""
  };
  const discount = route.regularFare > route.amount
    ? `<br><span class="text-emerald-700">Descuento universitario 50%: −S/ ${(route.regularFare - route.amount).toFixed(2)}</span>`
    : "";
  const passenger = friendDni ? `Boleto para DNI ${friendDni}<br>` : "";
  const receiver = friend ? `Destinatario: ${friend.name}<br>` : "";
  const availableBalance = getAccountBalance(user?.id || "");
  const balanceSummary = availableBalance === null ? "Saldo no disponible; revisa el almacenamiento del navegador."
    : `Saldo disponible: S/ ${availableBalance.toFixed(2)}`;
  document.getElementById("payment-summary").innerHTML =
    `${passenger}${receiver}Sube en: ${route.origin}<br>Baja en: ${route.destination}<br>${route.segments} tramos · Tarifa demo referencial<br><strong>Total demo: S/ ${route.amount.toFixed(2)}</strong>${discount}<br>${balanceSummary}<br>Fórmula de demo: S/ ${demoBaseFare.toFixed(2)} + S/ ${demoFarePerSegment.toFixed(2)} por tramo (máximo S/ 6.00).`;
  const payButton = document.querySelector('#paymentForm button[type="submit"]');
  const exceedsLimit = route.amount > demoState.tripLimit;
  const insufficientBalance = availableBalance === null || route.amount > availableBalance;
  payButton.disabled = exceedsLimit || insufficientBalance;
  payButton.classList.toggle("opacity-50", payButton.disabled);
  payButton.textContent = exceedsLimit ? "Supera el límite configurado"
    : insufficientBalance ? "Saldo insuficiente" : "Pagar boleto";
  switchScreen("screen-payment");
}

export function preparePurchase() {
  const origin = document.getElementById("route-origin");
  const destination = document.getElementById("route-destination");
  const route = readRoute(origin.value, destination.value);
  if (!route) {
    showToast("Selecciona un paradero de origen y otro posterior en la ruta.");
    destination.focus();
    return;
  }
  showPayment(route);
}

function handleFriendPurchase(event) {
  event.preventDefault();
  const dni = document.getElementById("friend-dni");
  const error = document.getElementById("friend-dni-error");
  const validDni = /^\d{8}$/.test(dni.value);
  error.textContent = validDni ? "" : "El DNI de tu amigo debe tener exactamente 8 dígitos.";
  error.classList.toggle("visible", !validDni);
  dni.classList.toggle("input-invalid", !validDni);
  if (!validDni) {
    dni.focus();
    return;
  }
  const recipient = findPassengerByDni(dni.value);
  if (!recipient) {
    error.textContent = "El DNI no pertenece a una cuenta de pasajero de esta demo.";
    error.classList.add("visible");
    dni.classList.add("input-invalid");
    dni.focus();
    return;
  }
  if (recipient.id === demoState.currentUser?.id) {
    error.textContent = "Elige el DNI de otra persona, no el tuyo.";
    error.classList.add("visible");
    dni.classList.add("input-invalid");
    dni.focus();
    return;
  }
  const route = setRouteEstimate(
    document.getElementById("friend-origin"),
    document.getElementById("friend-destination"),
    "friend-route-estimate"
  );
  if (!route) {
    document.getElementById("friend-destination").focus();
    return;
  }
  showPayment(route, recipient);
}

function createTicketCode() {
  if (window.crypto?.randomUUID) return `BC-${window.crypto.randomUUID().toUpperCase()}`;
  return `BC-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
}

function renderPassengerHistory() {
  const history = document.getElementById("history-list");
  history.replaceChildren();
  const tickets = loadTicketHistory(demoState.currentUser?.id);
  demoState.purchases = tickets;
  tickets.forEach((ticket) => {
    const card = document.createElement("article");
    card.className = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
    const heading = document.createElement("div");
    heading.className = "flex items-start justify-between gap-3";
    const route = document.createElement("h3");
    route.className = "text-sm font-bold text-slate-800";
    route.textContent = `${ticket.origin} → ${ticket.destination}`;
    const fare = document.createElement("span");
    fare.className = "whitespace-nowrap text-sm font-extrabold text-teal-700";
    fare.textContent = `S/ ${ticket.amount.toFixed(2)}`;
    heading.append(route, fare);
    const detail = document.createElement("p");
    detail.className = "mt-2 text-xs text-slate-500";
    const received = ticket.recipientUserId === demoState.currentUser?.id && ticket.userId !== demoState.currentUser?.id;
    const transfer = received
      ? ` · Pagado por ${ticket.userName}`
      : ticket.friendDni
        ? ` · Para ${ticket.recipientName || `DNI ${ticket.friendDni}`}${ticket.recipientStatus === "rejected" ? " · Rechazado" : ticket.recipientStatus === "accepted" ? " · Aceptado" : " · Enviado"}`
        : "";
    detail.textContent = `${new Date(ticket.issuedAt).toLocaleString("es-PE")} · ${ticket.distance} tramos · ${ticket.method}${ticket.userRole === "university" ? " · 50% universitario" : ""}${transfer}`;
    const code = document.createElement("p");
    code.className = "mt-1 font-mono text-[10px] text-slate-400";
    code.textContent = ticket.code;
    card.append(heading, detail, code);
    history.append(card);
  });
  document.getElementById("history-empty").classList.toggle("hidden", tickets.length > 0);
}

export function openHistory() {
  if (demoState.currentUser?.role === "driver") {
    openDriverHistory();
    return;
  }
  renderPassengerHistory();
  switchScreen("screen-history");
}

export function paymentReturnScreen() {
  return demoState.selectedPurchase?.friendDni ? "screen-friend-ticket" : "screen-dashboard";
}

function renderTicket(ticket, { received = false } = {}) {
  if (!window.QRCode) {
    showToast("No se pudo cargar el generador de QR. Revisa tu conexión e inténtalo otra vez.");
    return false;
  }
  const qrContainer = document.getElementById("ticket-qrcode");
  qrContainer.replaceChildren();
  qrContainer.classList.remove("hidden");
  try {
    new window.QRCode(qrContainer, {
      text: ticket.code,
      width: 160,
      height: 160,
      correctLevel: window.QRCode.CorrectLevel.M
    });
  } catch (error) {
    console.error("No fue posible generar el QR del boleto.", error);
    showToast("No se pudo generar el QR del boleto.");
    return false;
  }
  document.getElementById("ticket-title").textContent = received ? "Boleto recibido correctamente" : "Pago realizado correctamente";
  document.getElementById("ticket-summary").innerHTML =
    `Sube en: ${ticket.origin}<br>Baja en: ${ticket.destination}<br>${ticket.distance} tramos · S/ ${ticket.amount.toFixed(2)}<br>${received ? `Pagado por: ${ticket.userName}` : `Método: ${ticket.method}`}${ticket.userRole === "university" ? "<br>Descuento universitario demo del 50%" : ""}`;
  document.getElementById("ticket-code").textContent = ticket.code;
  switchScreen("screen-ticket");
  return true;
}

function showFriendTicketNotice(ticket) {
  showModal("Tienes un boleto", `<div class="text-center">
    <div class="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50 text-teal-700"><i data-lucide="mail-open" class="h-9 w-9"></i></div>
    <p class="text-sm font-semibold text-slate-800">Tu amigo <strong>${ticket.userName}</strong> te ha enviado un boleto.</p>
    <p class="mt-2 text-xs text-slate-500">${ticket.origin} → ${ticket.destination} · S/ ${Number(ticket.amount).toFixed(2)}</p>
    <div class="mt-4 grid grid-cols-2 gap-2">
      <button onclick="respondToFriendTicket('${ticket.code}', true)" class="rounded-full bg-teal-600 py-3 text-sm font-bold text-white">Aceptar</button>
      <button onclick="respondToFriendTicket('${ticket.code}', false)" class="rounded-full bg-slate-100 py-3 text-sm font-bold text-slate-700">Rechazar</button>
    </div>
  </div>`);
}

function showNextFriendTicketNotice(accountId) {
  const [ticket] = loadPendingFriendTickets(accountId);
  if (ticket) showFriendTicketNotice(ticket);
}

export function respondToFriendTicket(code, accepted) {
  const recipient = demoState.currentUser;
  if (!recipient || recipient.role === "driver") {
    showToast("Inicia sesión con la cuenta destinataria para responder.");
    return;
  }
  const ticket = updateFriendTicketStatus(code, recipient.id, accepted ? "accepted" : "rejected");
  if (!ticket) {
    showToast("Este boleto ya no está pendiente o venció.");
    return;
  }
  document.getElementById("custom-modal").classList.add("hidden");
  if (accepted) {
    renderTicket(ticket, { received: true });
    return;
  }
  showToast("Rechazaste el boleto enviado por tu amigo.");
  showNextFriendTicketNotice(recipient.id);
}

function initFriendTicketNotifications() {
  window.addEventListener("binicard-login", (event) => {
    const account = event.detail;
    if (account?.role !== "driver") showNextFriendTicketNotice(account.id);
  });
}

function handlePayment(event) {
  event.preventDefault();
  const route = demoState.selectedPurchase;
  if (!route) {
    showToast("No hay una ruta seleccionada. Elige tu destino primero.");
    switchScreen("screen-dashboard");
    return;
  }
  if (route.amount > demoState.tripLimit) {
    showToast(`El boleto supera tu límite de S/ ${demoState.tripLimit.toFixed(2)}.`);
    return;
  }
  const currentBalance = getAccountBalance(route.userId);
  if (currentBalance === null) {
    showToast("No se pudo leer tu saldo. No se registró la compra.");
    return;
  }
  if (route.amount > currentBalance) {
    showToast("Saldo insuficiente. Recarga tu dinero líquido para continuar.");
    return;
  }
  if (!window.QRCode) {
    showToast("No se pudo cargar el generador de QR. Revisa tu conexión e inténtalo otra vez.");
    console.error("La biblioteca QRCode no está disponible.");
    return;
  }

  const code = createTicketCode();
  const issuedAt = Date.now();
  const method = document.querySelector('input[name="payment-method"]:checked')?.value || demoState.paymentLabel;
  const ticket = {
    code,
    status: "pago_simulado",
    origin: route.origin,
    destination: route.destination,
    distance: route.distance,
    amount: route.amount,
    regularFare: route.regularFare,
    friendDni: route.friendDni || "",
    userRole: route.userRole,
    userName: route.userName,
    userId: route.userId,
    recipientUserId: route.recipientUserId,
    recipientName: route.recipientName,
    recipientStatus: route.recipientUserId ? "pending" : "",
    method,
    issuedAt
  };
  const purchaseSaved = completeTicketPurchase(ticket);
  if (purchaseSaved === "insufficient") {
    showToast("Saldo insuficiente. No se registró la compra.");
    return;
  }
  if (!purchaseSaved) {
    showToast("No se pudo guardar la compra; no se descontó el saldo.");
    return;
  }
  setAccountBalanceDisplay(getAccountBalance(ticket.userId));
  setDriverBalanceDisplay();
  demoState.selectedPurchase = null;
  if (ticket.recipientUserId) {
    document.getElementById("ticket-qrcode").replaceChildren();
    document.getElementById("ticket-qrcode").classList.add("hidden");
    document.getElementById("ticket-title").textContent = "Boleto enviado";
    document.getElementById("ticket-summary").textContent =
      `Enviaste el boleto a ${ticket.recipientName}. Cuando ${ticket.recipientName} inicie sesión, podrá aceptar o rechazar la invitación.`;
    document.getElementById("ticket-code").textContent = "";
    showToast("Boleto enviado para que tu amigo lo acepte.");
    switchScreen("screen-ticket");
    return;
  }
  showToast("Boleto de demostración generado");
  renderTicket(ticket);
}

function renderDriverHistory() {
  const list = document.getElementById("driver-history-list");
  list.replaceChildren();
  demoState.scannedTickets = loadScannedTickets();
  demoState.scannedTickets.forEach((ticket) => {
    const card = document.createElement("article");
    card.className = "rounded-xl bg-white p-3 shadow-sm";
    const title = document.createElement("p");
    title.className = "text-xs font-bold";
    title.textContent = `${ticket.origin} → ${ticket.destination}`;
    const details = document.createElement("p");
    details.className = "mt-1 text-[10px] text-slate-500";
    details.textContent = `${new Date(ticket.scannedAt).toLocaleString("es-PE")} · S/ ${Number(ticket.amount).toFixed(2)} · ${ticket.code}`;
    card.append(title, details);
    list.append(card);
  });
  document.getElementById("driver-history-empty").classList.toggle("hidden", demoState.scannedTickets.length > 0);
}

export function openDriverHistory() {
  renderDriverHistory();
  switchScreen("screen-driver-history");
}

function showScanResult(message, valid) {
  const result = document.getElementById("scan-result");
  result.textContent = message;
  result.classList.remove("hidden", "bg-emerald-50", "text-emerald-800", "bg-red-50", "text-red-800");
  result.classList.add(valid ? "bg-emerald-50" : "bg-red-50", valid ? "text-emerald-800" : "text-red-800");
}

function validateTicketCode(code) {
  const ticket = findIssuedTicket(code);
  if (!ticket || ticket.status !== "pago_simulado") {
    showScanResult("Boleto no reconocido: no aparece como emitido por esta demostración.", false);
    return;
  }
  if (ticket.usedAt) {
    showScanResult(`Boleto ya utilizado el ${new Date(ticket.usedAt).toLocaleString("es-PE")}.`, false);
    return;
  }
  const consumed = markTicketUsed(code);
  if (!consumed || consumed === "used") {
    showScanResult("No se pudo reservar el boleto o ya fue utilizado.", false);
    return;
  }
  const record = {
    code: ticket.code,
    origin: ticket.origin,
    destination: ticket.destination,
    amount: ticket.amount,
    userRole: ticket.userRole,
    scannedAt: Date.now()
  };
  if (!saveScannedTicket(record)) {
    showScanResult("Boleto válido, pero no se pudo guardar en el historial local.", false);
    return;
  }
  showScanResult(`Boleto válido · ${ticket.origin} → ${ticket.destination} · S/ ${Number(ticket.amount).toFixed(2)}${ticket.userRole === "university" ? " · 50% universitario" : ""}`, true);
}

function readQrText(text) {
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    validateTicketCode(text.trim());
    return;
  }
  if (!payload || typeof payload.ticketId !== "string" || payload.status !== "pago_simulado") {
    showScanResult("Este QR no contiene un boleto BiniCard válido.", false);
    return;
  }
  validateTicketCode(payload.ticketId);
}

export async function startDriverCamera() {
  const error = document.getElementById("camera-error");
  error.textContent = "";
  error.classList.remove("visible");
  if (!navigator.mediaDevices?.getUserMedia) {
    error.textContent = "La cámara requiere HTTPS o localhost. Abre esta demo en un entorno seguro para escanear.";
    error.classList.add("visible");
    return;
  }
  try {
    if (!("BarcodeDetector" in window)) {
      throw new Error("Este navegador no incluye lector QR por cámara.");
    }
    barcodeDetector = new window.BarcodeDetector({ formats: ["qr_code"] });
    cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    const video = document.getElementById("driver-camera");
    video.srcObject = cameraStream;
    video.classList.remove("hidden");
    document.getElementById("scanner-camera-placeholder").classList.add("hidden");
    await video.play();
    cameraTimer = window.setInterval(async () => {
      if (!barcodeDetector || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
      try {
        const codes = await barcodeDetector.detect(video);
        if (codes.length) {
          stopDriverCamera();
          readQrText(codes[0].rawValue);
        }
      } catch (scanError) {
        console.error("Falló la lectura del QR desde la cámara.", scanError);
        showToast("No se pudo leer el QR de la cámara.");
      }
    }, 300);
  } catch (cameraError) {
    stopDriverCamera();
    error.textContent = cameraError.message || "No se pudo acceder a la cámara.";
    error.classList.add("visible");
  }
}

export function stopDriverCamera() {
  if (cameraTimer !== null) window.clearInterval(cameraTimer);
  cameraTimer = null;
  cameraStream?.getTracks().forEach((track) => track.stop());
  cameraStream = null;
  barcodeDetector = null;
  const video = document.getElementById("driver-camera");
  if (video) {
    video.pause();
    video.srcObject = null;
    video.classList.add("hidden");
  }
  document.getElementById("scanner-camera-placeholder")?.classList.remove("hidden");
}

export function initTravel() {
  const preferredPayment = document.querySelector(`input[name="payment-method"][value="${demoState.paymentLabel}"]`);
  if (preferredPayment) preferredPayment.checked = true;
  const origin = document.getElementById("route-origin");
  const destination = document.getElementById("route-destination");
  const friendOrigin = document.getElementById("friend-origin");
  const friendDestination = document.getElementById("friend-destination");
  const driverOrigin = document.getElementById("driver-fare-origin");
  const driverDestination = document.getElementById("driver-fare-destination");
  populateStopSelect(origin, "Elige paradero de subida");
  populateStopSelect(destination, "Elige paradero de bajada");
  populateStopSelect(friendOrigin, "Elige paradero de subida");
  populateStopSelect(friendDestination, "Elige paradero de bajada");
  populateStopSelect(driverOrigin, "Elige origen");
  populateStopSelect(driverDestination, "Elige destino");
  renderDriverStops();
  origin.addEventListener("change", updateRouteEstimate);
  destination.addEventListener("change", updateRouteEstimate);
  friendOrigin.addEventListener("change", updateFriendRouteEstimate);
  friendDestination.addEventListener("change", updateFriendRouteEstimate);
  driverOrigin.addEventListener("change", updateDriverFare);
  driverDestination.addEventListener("change", updateDriverFare);
  document.getElementById("friendTicketForm").addEventListener("submit", handleFriendPurchase);
  document.getElementById("paymentForm").addEventListener("submit", handlePayment);
  initFriendTicketNotifications();
  demoState.purchases = [];
  demoState.scannedTickets = loadScannedTickets();
  window.stopDriverCamera = stopDriverCamera;
}
