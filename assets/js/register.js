import supabase from "./supabase.js";

const form = document.getElementById("registerForm");

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("registerEmail")?.value.trim() || document.getElementById("email")?.value.trim();
    const password = document.getElementById("registerPassword")?.value || document.getElementById("password")?.value;

    const { error } = await supabase.auth.signUp({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Sikeres regisztráció!");
    window.location.href = "index.html";
  });
}
