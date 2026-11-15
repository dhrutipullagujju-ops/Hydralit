const form = document.getElementById("login-form");
const password = document.getElementById("password");
const error = document.getElementById("login-error");

document.getElementById("toggle-password").addEventListener("click", (event) => {
  const showing = password.type === "text";
  password.type = showing ? "password" : "text";
  event.currentTarget.textContent = showing ? "Show" : "Hide";
  event.currentTarget.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const email = document.getElementById("email").value.trim().toLowerCase();
  // Demo mode keeps only the email in this browser session; the password is never saved.
  sessionStorage.setItem("hydralit-demo-user", email);
  window.location.href = "setup.html";
});
