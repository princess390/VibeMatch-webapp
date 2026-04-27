import supabase from "./supabase.js";

async function initAuthUi() {
  await loadNavbar();
  await loadAuthModals();

  setActiveNavLink();
  initNavbarToggleFallback();
  initModalLinks();
  initModalCloseButtons();
  await updateNavbar();
  initAuthForms();
}

async function loadNavbar() {
  const navbar = document.getElementById("navbar");
  if (!navbar) return;

  const res = await fetch("components/navbar.html");
  navbar.innerHTML = await res.text();
}

async function loadAuthModals() {
  await loadComponent("loginModalContainer", "components/login-modal.html");
  await loadComponent("registerModalContainer", "components/register-modal.html");
}

async function loadComponent(containerId, path) {
  const container = document.getElementById(containerId);
  if (!container || container.innerHTML.trim()) return;

  const res = await fetch(path);
  container.innerHTML = await res.text();
}

function setActiveNavLink() {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const params = new URLSearchParams(window.location.search);
  const activeType = params.get("tipus") || params.get("type");

  document.querySelectorAll(".nav-link").forEach(link => {
    const href = link.getAttribute("href");
    if (!href) return;

    link.classList.remove("active");

    if (currentPage === "index.html" && href.includes("index.html")) {
      link.classList.add("active");
    }

    if (currentPage === "eredmenyek.html" && activeType && href.includes("tipus=" + activeType)) {
      link.classList.add("active");
    }

    if (currentPage === "profile.html" && href.includes("profile.html")) {
      link.classList.add("active");
    }
  });
}

function initNavbarToggleFallback() {
  if (window.bootstrap && window.bootstrap.Collapse) return;

  const toggler = document.querySelector(".navbar-toggler");
  if (!toggler) return;

  toggler.addEventListener("click", () => {
    const targetSelector = toggler.getAttribute("data-bs-target");
    const target = targetSelector ? document.querySelector(targetSelector) : null;
    if (!target) return;

    const isOpen = target.classList.toggle("show");
    toggler.setAttribute("aria-expanded", String(isOpen));
  });
}

function initModalLinks() {
  bindModalLink("loginLink", "loginModal");
  bindModalLink("registerLink", "registerModal");
}

function bindModalLink(linkId, modalId) {
  const link = document.getElementById(linkId);
  if (!link) return;

  link.addEventListener("click", event => {
    event.preventDefault();
    openModal(modalId);
  });
}

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (!modal) return;

  if (window.bootstrap && window.bootstrap.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
    return;
  }

  modal.classList.add("show");
  modal.style.display = "block";
  modal.removeAttribute("aria-hidden");
  document.body.classList.add("modal-open");
}

function closeModal(modal) {
  if (!modal) return;

  if (window.bootstrap && window.bootstrap.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modal).hide();
    return;
  }

  modal.classList.remove("show");
  modal.style.display = "none";
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

function initModalCloseButtons() {
  document.querySelectorAll("[data-bs-dismiss='modal']").forEach(button => {
    button.addEventListener("click", () => closeModal(button.closest(".modal")));
  });
}

async function updateNavbar() {
  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const logoutLink = document.getElementById("logoutLink");

  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      if (loginLink) loginLink.style.display = "none";
      if (registerLink) registerLink.style.display = "none";
      if (logoutLink) logoutLink.style.display = "inline-flex";

      if (logoutLink) {
        logoutLink.onclick = async event => {
          event.preventDefault();
          await supabase.auth.signOut();
          window.location.href = "index.html";
        };
      }
    } else {
      if (loginLink) loginLink.style.display = "inline-flex";
      if (registerLink) registerLink.style.display = "inline-flex";
      if (logoutLink) logoutLink.style.display = "none";
    }
  } catch (error) {
    console.error("Nem sikerült lekérni a bejelentkezési állapotot.", error);
    if (loginLink) loginLink.style.display = "inline-flex";
    if (registerLink) registerLink.style.display = "inline-flex";
    if (logoutLink) logoutLink.style.display = "none";
  }
}

function initAuthForms() {
  bindAuthForm({
    formId: "loginForm",
    emailId: "loginEmail",
    passwordId: "loginPassword",
    messageId: "loginMessage",
    loadingText: "Bejelentkezés...",
    successText: "Sikeres bejelentkezés.",
    submit: ({ email, password }) => supabase.auth.signInWithPassword({ email, password })
  });

  bindAuthForm({
    formId: "registerForm",
    emailId: "registerEmail",
    passwordId: "registerPassword",
    messageId: "registerMessage",
    loadingText: "Regisztrálás...",
    successText: "Sikeres regisztráció. Ellenőrizd az emailed, ha megerősítést kér a rendszer.",
    submit: ({ email, password }) => supabase.auth.signUp({ email, password })
  });
}

function bindAuthForm({ formId, emailId, passwordId, messageId, loadingText, successText, submit }) {
  const form = document.getElementById(formId);
  if (!form || form.dataset.bound === "true") return;

  form.dataset.bound = "true";

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById(emailId)?.value.trim();
    const password = document.getElementById(passwordId)?.value;
    const submitButton = form.querySelector("button[type='submit']");
    const originalText = submitButton?.textContent.trim();

    setFormMessage(messageId, "", "");

    if (!email || !password) {
      setFormMessage(messageId, "Add meg az email címet és a jelszót.", "error");
      return;
    }

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = loadingText;
      }

      const { error } = await submit({ email, password });
      if (error) throw error;

      setFormMessage(messageId, successText, "success");

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (error) {
      setFormMessage(messageId, translateAuthError(error.message), "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalText;
      }
    }
  });
}

function setFormMessage(messageId, text, type) {
  const message = document.getElementById(messageId);
  if (!message) return;

  message.textContent = text;
  message.className = type ? `auth-message ${type}` : "auth-message";
}

function translateAuthError(message = "") {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("invalid login credentials")) {
    return "Hibás email cím vagy jelszó.";
  }

  if (lowerMessage.includes("password should be at least")) {
    return "A jelszónak legalább 6 karakter hosszúnak kell lennie.";
  }

  if (lowerMessage.includes("email")) {
    return "Ellenőrizd az email címet.";
  }

  return message || "Hiba történt. Próbáld újra.";
}

document.addEventListener("DOMContentLoaded", initAuthUi);
