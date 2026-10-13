import { demoState } from "./state.js";
import { getDriverEarnings } from "./storage.js";

export function switchScreen(targetScreenId) {
  if (targetScreenId !== "screen-driver-scanner") {
    window.stopDriverCamera?.();
  }
  const activeScreen = document.getElementById(targetScreenId);
  if (!activeScreen) {
    throw new Error(`No existe la pantalla "${targetScreenId}".`);
  }

  document.querySelectorAll(".screen-view").forEach((screen) => {
    screen.classList.add("hidden");
    screen.classList.remove("active-screen");
  });
  activeScreen.classList.remove("hidden");
  activeScreen.classList.add("active-screen");

  document.querySelectorAll(".nav-tab").forEach((button) => {
    button.classList.remove("bg-teal-500", "text-white", "shadow-md");
    button.classList.add("bg-slate-700", "text-slate-300");
  });
  const currentButton = document.getElementById(`btn-${targetScreenId}`);
  if (currentButton) {
    currentButton.classList.remove("bg-slate-700", "text-slate-300");
    currentButton.classList.add("bg-teal-500", "text-white", "shadow-md");
  }

  window.lucide?.createIcons();
}

let toastTimeout;
const balancesVisible = { passenger: false, driver: false };

function formatMoney(amount) {
  return `S/. ${Number(amount).toFixed(2)}`;
}

export function setAccountBalanceDisplay(amount) {
  const balance = document.getElementById("balance-value");
  if (!balance) return;
  balance.dataset.amount = String(amount);
  balance.textContent = amount === null || !Number.isFinite(Number(amount)) ? "S/. --"
    : balancesVisible.passenger ? formatMoney(amount) : "S/. ----";
}

export function setDriverBalanceDisplay(amount = getDriverEarnings()) {
  const balance = document.getElementById("driver-balance-value");
  if (!balance) return;
  balance.dataset.amount = String(amount);
  balance.textContent = amount === null || !Number.isFinite(Number(amount)) ? "S/. --"
    : balancesVisible.driver ? formatMoney(amount) : "S/. ----";
}

export function showToast(message) {
  const toast = document.getElementById("toast-msg");
  if (!toast) {
    console.error("No se encontró el contenedor de notificaciones.");
    return;
  }
  toast.textContent = message;
  toast.style.opacity = "1";
  window.clearTimeout(toastTimeout);
  toastTimeout = window.setTimeout(() => {
    toast.style.opacity = "0";
  }, 3000);
}

export function showModal(title, content) {
  const modal = document.getElementById("custom-modal");
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-body").innerHTML = content;
  modal.classList.remove("hidden");
}

export function closeModal() {
  document.getElementById("custom-modal").classList.add("hidden");
}

export function toggleBalance() {
  const balance = document.getElementById("balance-value");
  const icon = document.getElementById("balance-icon");
  if (demoState.currentUser?.role === "driver") {
    balancesVisible.driver = !balancesVisible.driver;
    setDriverBalanceDisplay();
    return;
  } else {
    balancesVisible.passenger = !balancesVisible.passenger;
    setAccountBalanceDisplay(balance?.dataset.amount ?? 1000);
  }
  icon?.setAttribute("data-lucide", balancesVisible.passenger ? "eye" : "eye-off");
  window.lucide?.createIcons();
}

export function togglePasswordVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const icon = button.querySelector("i");
  const isHidden = input.type === "password";
  input.type = isHidden ? "text" : "password";
  icon?.setAttribute("data-lucide", isHidden ? "eye" : "eye-off");
  window.lucide?.createIcons();
}

export function updateClock() {
  const clock = document.getElementById("current-clock");
  if (!clock) return;
  const now = new Date();
  clock.textContent = `${now.getHours()}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function initUI() {
  window.lucide?.createIcons();
  updateClock();
  window.setInterval(updateClock, 30000);
}
