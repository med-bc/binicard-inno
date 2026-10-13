import { demoState } from "./state.js";
import { demoAccounts } from "./accounts.js";
import { getAccountBalance } from "./storage.js";
import { setAccountBalanceDisplay, setDriverBalanceDisplay, showModal, showToast, switchScreen } from "./ui.js";

function setError(errorId, input, message) {
  const error = document.getElementById(errorId);
  if (error) {
    error.textContent = message;
    error.classList.toggle("visible", Boolean(message));
  }
  input?.classList.toggle("input-invalid", Boolean(message));
  input?.setAttribute("aria-invalid", message ? "true" : "false");
  return !message;
}

export function passwordError(password) {
  const missing = [];
  if (!/\p{Lu}/u.test(password)) missing.push("una mayúscula");
  if (!/\p{N}/u.test(password)) missing.push("un número");
  if (!/[^\p{L}\p{N}]/u.test(password)) missing.push("un carácter especial");
  return missing.length ? `La contraseña debe incluir ${missing.join(", ")}.` : "";
}

function dniError(dni) {
  if (!dni) return "Ingresa tu DNI.";
  if (!/^\d{8}$/.test(dni)) return "El DNI debe tener exactamente 8 dígitos. Complétalo para continuar.";
  return "";
}

function bindNumericDni(input) {
  input?.addEventListener("input", () => {
    input.value = input.value.replace(/\D/g, "").slice(0, 8);
  });
}

function handleStudentLogin(event) {
  event.preventDefault();
  const dni = document.getElementById("login-dni");
  const password = document.getElementById("login-pwd");
  const validDni = setError("login-dni-error", dni, dniError(dni.value));
  const validPassword = setError("login-password-error", password, passwordError(password.value));
  if (!validDni || !validPassword) {
    (validDni ? password : dni).focus();
    return;
  }
  const account = demoAccounts.find((candidate) =>
    candidate.role !== "driver" && candidate.dni === dni.value && candidate.password === password.value
  );
  if (!account) {
    setError("login-password-error", password, "DNI o contraseña incorrectos para las cuentas de demostración.");
    password.focus();
    return;
  }
  demoState.currentUser = account;
  setAccountBalanceDisplay(getAccountBalance(account.id));
  document.getElementById("dashboard-user-name").textContent = account.name;
  document.getElementById("dashboard-role-note").textContent = account.role === "university"
    ? "Descuento universitario demo: 50% en todos los viajes."
    : "Tarifas regulares de la ruta.";
  document.getElementById("university-card-menu-option").classList.toggle("hidden", account.role !== "university");
  showToast(account.role === "university" ? "Perfil universitario: descuento demo del 50%." : "Inicio de sesión de demostración");
  switchScreen("screen-dashboard");
  window.dispatchEvent(new CustomEvent("binicard-login", { detail: account }));
}

function handleDriverLogin(event) {
  event.preventDefault();
  const username = document.getElementById("driver-user");
  const password = document.getElementById("driver-password");
  const driverAccount = demoAccounts.find((account) => account.role === "driver");
  const validUsername = setError("driver-user-error", username, username.value.trim() ? "" : "Ingresa tu usuario.");
  const validPassword = setError("driver-password-error", password, passwordError(password.value));
  if (!validUsername || !validPassword) {
    (validUsername ? password : username).focus();
    return;
  }
  if (username.value.trim() !== driverAccount.username || password.value !== driverAccount.password) {
    setError("driver-password-error", password, "Usuario o contraseña de conductor incorrectos.");
    password.focus();
    return;
  }
  demoState.currentUser = driverAccount;
  setDriverBalanceDisplay();
  document.getElementById("driver-dashboard-user-name").textContent = driverAccount.name;
  showToast("Acceso de conductor de demostración");
  switchScreen("screen-driver-dashboard");
  window.dispatchEvent(new CustomEvent("binicard-login", { detail: driverAccount }));
}

export function showDemoCredentials() {
  showModal("Cuentas para probar (solo demo)", `<div class="space-y-2 text-left">
    <p><strong>Usuario normal (Juan)</strong><br>DNI: 00000001<br>Clave: BiniCard123!</p>
    <p><strong>Usuario normal (Mario)</strong><br>DNI: 00000003<br>Clave: BiniCard123!</p>
    <p><strong>Usuario universitario (Pérez, 50% desc.)</strong><br>DNI: 00000002<br>Clave: UniBini123!</p>
    <p>Cada cuenta de pasajero empieza con S/ 1,000.00 y conserva su propio saldo e historial.</p>
    <p><strong>Chofer Etuchisa</strong><br>Usuario: etuchisa.demo<br>Clave: ChoferBini123!</p>
    <p class="text-[10px] text-amber-700">Credenciales públicas de prueba. No uses estos datos en producción ni para cuentas reales.</p>
  </div>`);
}

export function logout() {
  demoState.currentUser = null;
  switchScreen("screen-login");
}

export function startRecovery(role = "student") {
  demoState.recoveryRole = role;
  demoState.recoveryCode = "";
  document.getElementById("recoveryForm").reset();
  document.getElementById("recoveryCodeForm").reset();
  document.getElementById("recoveryCodeForm").classList.add("hidden");
  document.getElementById("recoveryForm").classList.remove("hidden");
  setError("recovery-contact-error", document.getElementById("recovery-contact"), "");
  setError("recovery-code-error", document.getElementById("recovery-code"), "");
  switchScreen("screen-recovery");
}

export function recoveryReturnScreen() {
  return demoState.recoveryRole === "driver" ? "screen-driver-login" : "screen-login";
}

function handleRecoveryRequest(event) {
  event.preventDefault();
  const contact = document.getElementById("recovery-contact");
  const value = contact.value.trim();
  const phone = value.replace(/[\s()-]/g, "");
  const validContact = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || /^\+?\d{7,15}$/.test(phone);
  if (!setError("recovery-contact-error", contact, validContact ? "" : "Ingresa un correo válido o un teléfono de 7 a 15 dígitos.")) {
    contact.focus();
    return;
  }

  demoState.recoveryCode = "648219";
  document.getElementById("recoveryCodeForm").classList.remove("hidden");
  const demoNote = document.getElementById("recovery-demo-code");
  if (demoNote) demoNote.textContent = "Código de prueba: 648219. En una app real se enviaría al contacto indicado.";
  showToast("Código de prueba generado");
  document.getElementById("recovery-code").focus();
}

function handleRecoveryCode(event) {
  event.preventDefault();
  const code = document.getElementById("recovery-code");
  const valid = setError("recovery-code-error", code, code.value === demoState.recoveryCode ? "" : "El código no es correcto. Revisa e inténtalo otra vez.");
  if (!valid) {
    code.focus();
    return;
  }
  switchScreen("screen-reset-password");
}

function handlePasswordReset(event) {
  event.preventDefault();
  const password = document.getElementById("new-password");
  const confirm = document.getElementById("confirm-password");
  const passwordValid = setError("new-password-error", password, passwordError(password.value));
  const confirmValid = setError("confirm-password-error", confirm, confirm.value === password.value ? "" : "Las contraseñas no coinciden.");
  if (!passwordValid || !confirmValid) {
    (passwordValid ? confirm : password).focus();
    return;
  }
  showToast("Contraseña actualizada en esta demostración");
  document.getElementById("resetPasswordForm").reset();
  switchScreen(recoveryReturnScreen());
}

function handleStudentCard(event) {
  event.preventDefault();
  const form = event.currentTarget;
  let valid = true;
  ["firstName", "lastName", "university", "campus"].forEach((name) => {
    const input = form.elements.namedItem(name);
    const error = form.querySelector(`[data-error-for="${name}"]`);
    const message = input.value.trim() ? "" : "Completa este campo.";
    error.textContent = message;
    error.classList.toggle("visible", Boolean(message));
    input.classList.toggle("input-invalid", Boolean(message));
    valid = valid && !message;
  });
  const dni = form.elements.namedItem("dni");
  const dniMessage = dniError(dni.value);
  const dniFieldError = form.querySelector('[data-error-for="dni"]');
  dniFieldError.textContent = dniMessage;
  dniFieldError.classList.toggle("visible", Boolean(dniMessage));
  dni.classList.toggle("input-invalid", Boolean(dniMessage));
  valid = valid && !dniMessage;

  const proof = document.getElementById("student-proof");
  const proofMessage = proof.files.length ? "" : "Adjunta una constancia o carné vigente.";
  setError("student-proof-error", proof, proofMessage);
  valid = valid && !proofMessage;

  if (!valid) {
    form.querySelector(".input-invalid")?.focus();
    return;
  }
  showToast("Solicitud validada en la demo; no se envió a la universidad.");
  form.reset();
  switchScreen("screen-login");
}

export function initAuth() {
  document.getElementById("loginForm").addEventListener("submit", handleStudentLogin);
  document.getElementById("driverLoginForm").addEventListener("submit", handleDriverLogin);
  document.getElementById("recoveryForm").addEventListener("submit", handleRecoveryRequest);
  document.getElementById("recoveryCodeForm").addEventListener("submit", handleRecoveryCode);
  document.getElementById("resetPasswordForm").addEventListener("submit", handlePasswordReset);
  document.getElementById("studentCardForm").addEventListener("submit", handleStudentCard);
  bindNumericDni(document.getElementById("login-dni"));
  bindNumericDni(document.getElementById("friend-dni"));
  bindNumericDni(document.querySelector('#studentCardForm [name="dni"]'));
}
