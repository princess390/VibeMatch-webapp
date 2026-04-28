import supabase from "./supabase.js";

const form = document.getElementById("loginForm");

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();

    const email = document.getElementById("loginEmail")?.value.trim() || document.getElementById("email")?.value.trim();
    const password = document.getElementById("loginPassword")?.value || document.getElementById("password")?.value;

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "index.html";
  });
}
