import { demoState } from "./state.js";
import {
  loadComplaints,
  loadDriverPhoto,
  loadSupervisorPhone,
  saveComplaint,
  saveDriverPhoto,
  saveSupervisorPhone
} from "./storage.js";
import { closeModal, showModal, showToast, switchScreen } from "./ui.js";

function masked(value, type) {
  if (type === "phone") return value.length > 3 ? `${"*".repeat(value.length - 3)}${value.slice(-3)}` : value;
  if (type === "email") {
    const [user, domain] = value.split("@");
    return `${user.slice(0, 1)}***@${domain || ""}`;
  }
  return value.length > 2 ? `${value.slice(0, 2)}${"*".repeat(Math.min(value.length - 2, 6))}` : value;
}

export function editProfileField(field) {
  const labels = { name: "nombre", surname: "apellido", phone: "teléfono", email: "correo" };
  const inputType = field === "email" ? "email" : field === "phone" ? "tel" : "text";
  showModal("Actualizar perfil", `<form id="profile-edit-form" class="space-y-3 text-left">
    <label for="profile-edit-value" class="block text-xs font-semibold">Nuevo ${labels[field]}</label>
    <input id="profile-edit-value" name="value" type="${inputType}" minlength="2" required class="input-pill w-full rounded-xl px-3 py-2 text-sm" placeholder="Escribe el nuevo dato">
    <button class="w-full rounded-full bg-teal-600 py-2 text-xs font-bold text-white">Guardar cambio</button>
  </form>`);
  document.getElementById("profile-edit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const value = event.currentTarget.elements.namedItem("value").value.trim();
    const valid = field === "email"
      ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
      : field === "phone"
        ? /^\+?\d{7,15}$/.test(value.replace(/[\s()-]/g, ""))
        : value.length >= 2;
    if (!valid) {
      showToast("El dato ingresado no tiene un formato válido.");
      return;
    }
    demoState.profile[field] = value;
    const valueElement = document.getElementById(`profile-${field}-value`);
    if (valueElement) valueElement.textContent = masked(value, field);
    closeModal();
    showToast("Dato actualizado solo en esta demostración.");
  });
}

export function editPaymentMethod() {
  showModal("Método de pago de demostración", `<form id="payment-method-form" class="space-y-3 text-left">
    <label for="payment-method-select" class="block text-xs font-semibold">Método preferido</label>
    <select id="payment-method-select" name="method" class="input-pill w-full rounded-xl bg-white px-3 py-2 text-sm">
      <option>Tarjeta</option><option>Yape</option><option>Plin</option>
    </select>
    <button class="w-full rounded-full bg-teal-600 py-2 text-xs font-bold text-white">Guardar</button>
    <p class="text-[10px] text-slate-500">No se almacenan datos de tarjetas ni cuentas.</p>
  </form>`);
  document.getElementById("payment-method-form").addEventListener("submit", (event) => {
    event.preventDefault();
    demoState.paymentLabel = event.currentTarget.elements.namedItem("method").value;
    const selectedPayment = document.querySelector(`input[name="payment-method"][value="${demoState.paymentLabel}"]`);
    if (selectedPayment) selectedPayment.checked = true;
    closeModal();
    showToast(`Método de prueba guardado: ${demoState.paymentLabel}.`);
  });
}

export function configureTripLimit() {
  showModal("Límite por viaje", `<form id="trip-limit-form" class="space-y-3 text-left">
    <label for="trip-limit-value" class="block text-xs font-semibold">Monto máximo en soles</label>
    <input id="trip-limit-value" name="limit" type="number" min="0.01" step="0.01" value="${demoState.tripLimit}" required class="input-pill w-full rounded-xl px-3 py-2 text-sm">
    <button class="w-full rounded-full bg-teal-600 py-2 text-xs font-bold text-white">Guardar límite</button>
  </form>`);
  document.getElementById("trip-limit-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const limit = Number(event.currentTarget.elements.namedItem("limit").value);
    if (!Number.isFinite(limit) || limit <= 0) {
      showToast("Ingresa un monto mayor que cero.");
      return;
    }
    demoState.tripLimit = Math.round(limit * 100) / 100;
    closeModal();
    showToast(`Límite demo configurado: S/ ${demoState.tripLimit.toFixed(2)}.`);
  });
}

export function toggleDemoSetting(setting) {
  if (setting !== "biometric") {
    throw new Error(`Configuración desconocida: ${setting}`);
  }
  demoState.biometricEnabled = !demoState.biometricEnabled;
  showToast(demoState.biometricEnabled
    ? "Biometría activada visualmente; este prototipo no autentica con biometría."
    : "Biometría desactivada en la demostración.");
}

export function openComplaints() {
  showModal("Libro de reclamaciones", `<form id="complaint-form" class="space-y-3 text-left">
    <label for="complaint-message" class="block text-xs font-semibold">Describe tu consulta o reclamo</label>
    <textarea id="complaint-message" name="message" minlength="5" required class="input-pill w-full rounded-xl px-3 py-2 text-sm" rows="4"></textarea>
    <button class="w-full rounded-full bg-teal-600 py-2 text-xs font-bold text-white">Enviar</button>
  </form>`);
  document.getElementById("complaint-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const message = event.currentTarget.elements.namedItem("message").value.trim();
    if (message.length < 5) {
      showToast("Escribe un mensaje de al menos 5 caracteres.");
      return;
    }
    const complaint = {
      id: `REC-${Date.now().toString(36).toUpperCase()}`,
      author: demoState.currentUser?.name || "Usuario demo",
      role: demoState.currentUser?.role || "normal",
      message,
      createdAt: Date.now()
    };
    if (!saveComplaint(complaint)) {
      showToast("No se pudo guardar el reclamo en este navegador.");
      return;
    }
    demoState.complaints = loadComplaints();
    closeModal();
    showModal("Libro de reclamaciones", "Reclamo guardado en este navegador de demostración; no se envió a la empresa.");
  });
}

export function complaintsReturnScreen() {
  return demoState.currentUser?.role === "driver" ? "screen-driver-dashboard" : "screen-dashboard";
}

export function profileReturnScreen() {
  return demoState.currentUser?.role === "driver" ? "screen-driver-dashboard" : "screen-dashboard";
}

export function profileSettingsScreen() {
  return demoState.currentUser?.role === "driver" ? "screen-driver-menu" : "screen-menu";
}

export function studentCardReturnScreen() {
  return demoState.currentUser?.role === "university" ? "screen-menu" : "screen-login";
}

export function openComplaintsHistory() {
  const list = document.getElementById("complaints-list");
  const complaints = loadComplaints();
  demoState.complaints = complaints;
  list.replaceChildren();
  complaints.forEach((complaint) => {
    const item = document.createElement("article");
    item.className = "rounded-2xl border border-slate-100 bg-white p-4 shadow-sm";
    const heading = document.createElement("p");
    heading.className = "text-xs font-bold text-teal-800";
    heading.textContent = `${complaint.author} · ${complaint.role === "university" ? "Universitario" : complaint.role === "driver" ? "Chofer" : "Usuario"} · ${new Date(complaint.createdAt).toLocaleString("es-PE")}`;
    const message = document.createElement("p");
    message.className = "mt-2 whitespace-pre-wrap text-sm text-slate-700";
    message.textContent = complaint.message;
    const id = document.createElement("p");
    id.className = "mt-2 font-mono text-[10px] text-slate-400";
    id.textContent = complaint.id;
    item.append(heading, message, id);
    list.append(item);
  });
  document.getElementById("complaints-empty").classList.toggle("hidden", complaints.length > 0);
  switchToComplaints();
}

function switchToComplaints() {
  switchScreen("screen-complaints");
}

export function configureSupervisorContact() {
  const current = loadSupervisorPhone();
  showModal("Contacto de superiores", `<form id="supervisor-contact-form" class="space-y-3 text-left">
    <label for="supervisor-phone" class="block text-xs font-semibold">WhatsApp con código de país (solo números)</label>
    <input id="supervisor-phone" name="phone" type="tel" inputmode="numeric" pattern="[0-9]{8,15}" maxlength="15" value="${current}" placeholder="Ej.: 51999111222" required class="input-pill w-full rounded-xl px-3 py-2 text-sm">
    <p class="text-[10px] text-slate-500">Este número se guarda únicamente en este navegador. No se ha configurado un número oficial de Etuchisa.</p>
    <button class="w-full rounded-full bg-teal-600 py-2 text-xs font-bold text-white">Guardar contacto</button>
  </form>`);
  document.getElementById("supervisor-contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const phone = event.currentTarget.elements.namedItem("phone").value.replace(/\D/g, "");
    if (!/^\d{8,15}$/.test(phone)) {
      showToast("Ingresa entre 8 y 15 dígitos con código de país.");
      return;
    }
    if (!saveSupervisorPhone(phone)) {
      showToast("No se pudo guardar el teléfono en este navegador.");
      return;
    }
    demoState.supervisorPhone = phone;
    closeModal();
    showToast("Contacto guardado en esta demostración.");
  });
}

export function contactSupervisor() {
  const phone = loadSupervisorPhone();
  if (!phone) {
    showToast("Primero configura el número de WhatsApp de los superiores.");
    configureSupervisorContact();
    return;
  }
  window.open(`https://wa.me/${encodeURIComponent(phone)}`, "_blank", "noopener,noreferrer");
}

export function initProfile() {
  demoState.supervisorPhone = loadSupervisorPhone();
  const driverPhoto = document.getElementById("driver-profile-photo");
  const driverPhotoPlaceholder = document.getElementById("driver-photo-placeholder");
  const showDriverPhoto = (photo) => {
    if (!photo) return;
    driverPhoto.src = photo;
    driverPhoto.classList.remove("hidden");
    driverPhotoPlaceholder.classList.add("hidden");
  };
  showDriverPhoto(loadDriverPhoto());
  document.getElementById("driver-photo-input").addEventListener("change", (event) => {
    const [file] = event.currentTarget.files;
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 2 * 1024 * 1024) {
      showToast("Elige una imagen de máximo 2 MB.");
      event.currentTarget.value = "";
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string" || !saveDriverPhoto(reader.result)) {
        showToast("No se pudo guardar la foto en este navegador.");
        return;
      }
      showDriverPhoto(reader.result);
      showToast("Foto del transporte guardada en esta demo.");
    });
    reader.addEventListener("error", () => showToast("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
  ["name", "surname", "phone", "email"].forEach((field) => {
    const valueElement = document.getElementById(`profile-${field}-value`);
    if (valueElement) valueElement.textContent = masked(demoState.profile[field], field);
  });
  document.getElementById("profile-photo").addEventListener("change", (event) => {
    if (event.currentTarget.files.length) {
      showToast("Foto seleccionada solo en esta demo; no se cargó a un servidor.");
    }
  });
}
