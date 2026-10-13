import { initAuth, logout, recoveryReturnScreen, showDemoCredentials, startRecovery } from "./auth.js";
import {
  complaintsReturnScreen,
  contactSupervisor,
  configureTripLimit,
  configureSupervisorContact,
  editPaymentMethod,
  editProfileField,
  initProfile,
  openComplaintsHistory,
  openComplaints,
  profileReturnScreen,
  profileSettingsScreen,
  studentCardReturnScreen,
  toggleDemoSetting
} from "./profile.js";
import {
  openHistory,
  openDriverHistory,
  paymentReturnScreen,
  preparePurchase,
  respondToFriendTicket,
  showPassengerTariff,
  initTravel,
  startDriverCamera,
  stopDriverCamera,
  updateRouteEstimate
} from "./travel.js";
import {
  closeModal,
  initUI,
  showModal,
  showToast,
  switchScreen,
  toggleBalance,
  togglePasswordVisibility
} from "./ui.js";

Object.assign(window, {
  complaintsReturnScreen,
  closeModal,
  contactSupervisor,
  configureTripLimit,
  configureSupervisorContact,
  editPaymentMethod,
  editProfileField,
  openComplaints,
  openComplaintsHistory,
  profileReturnScreen,
  profileSettingsScreen,
  studentCardReturnScreen,
  openDriverHistory,
  openHistory,
  respondToFriendTicket,
  paymentReturnScreen,
  preparePurchase,
  recoveryReturnScreen,
  logout,
  showDemoCredentials,
  showModal,
  showPassengerTariff,
  showToast,
  startRecovery,
  startDriverCamera,
  stopDriverCamera,
  switchScreen,
  toggleBalance,
  toggleDemoSetting,
  togglePasswordVisibility,
  updateRouteEstimate
});

window.addEventListener("binicard-storage-error", (event) => {
  showToast(event.detail.message);
});

initUI();
initAuth();
initTravel();
initProfile();
