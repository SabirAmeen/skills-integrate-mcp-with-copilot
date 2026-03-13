document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const signupContainer = document.getElementById("signup-container");
  const messageDiv = document.getElementById("message");
  const userIconButton = document.getElementById("user-icon-btn");
  const userDropdown = document.getElementById("user-dropdown");
  const loginButton = document.getElementById("login-btn");
  const logoutButton = document.getElementById("logout-btn");
  const authStatus = document.getElementById("auth-status");
  const loginDialog = document.getElementById("login-dialog");
  const loginForm = document.getElementById("login-form");
  const cancelLoginButton = document.getElementById("cancel-login-btn");

  let adminToken = sessionStorage.getItem("adminToken") || "";
  let adminUsername = sessionStorage.getItem("adminUsername") || "";

  function isTeacherLoggedIn() {
    return Boolean(adminToken);
  }

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  function updateAuthUI() {
    if (isTeacherLoggedIn()) {
      authStatus.textContent = `Teacher mode: ${adminUsername}`;
      loginButton.classList.add("hidden");
      logoutButton.classList.remove("hidden");
      signupContainer.classList.remove("hidden");
    } else {
      authStatus.textContent = "Student mode";
      loginButton.classList.remove("hidden");
      logoutButton.classList.add("hidden");
      signupContainer.classList.add("hidden");
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft =
          details.max_participants - details.participants.length;

        // Create participants HTML with delete icons instead of bullet points
        const participantsHTML =
          details.participants.length > 0
            ? `<div class="participants-section">
              <h5>Participants:</h5>
              <ul class="participants-list">
                ${details.participants
                  .map(
                    (email) =>
                      `<li><span class="participant-email">${email}</span>${
                        isTeacherLoggedIn()
                          ? `<button class="delete-btn" data-activity="${name}" data-email="${email}">❌</button>`
                          : ""
                      }</li>`
                  )
                  .join("")}
              </ul>
            </div>`
            : `<p><em>No participants yet</em></p>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-container">
            ${participantsHTML}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });

      // Add event listeners to delete buttons
      document.querySelectorAll(".delete-btn").forEach((button) => {
        button.addEventListener("click", handleUnregister);
      });
    } catch (error) {
      activitiesList.innerHTML =
        "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle unregister functionality
  async function handleUnregister(event) {
    const button = event.target;
    const activity = button.getAttribute("data-activity");
    const email = button.getAttribute("data-email");

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/unregister?email=${encodeURIComponent(email)}`,
        {
          method: "DELETE",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          adminToken = "";
          adminUsername = "";
          sessionStorage.removeItem("adminToken");
          sessionStorage.removeItem("adminUsername");
          updateAuthUI();
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to unregister. Please try again.", "error");
      console.error("Error unregistering:", error);
    }
  }

  userIconButton.addEventListener("click", () => {
    userDropdown.classList.toggle("hidden");
  });

  loginButton.addEventListener("click", () => {
    userDropdown.classList.add("hidden");
    loginDialog.showModal();
  });

  cancelLoginButton.addEventListener("click", () => {
    loginDialog.close();
  });

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value;
    const password = document.getElementById("password").value;

    try {
      const response = await fetch("/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const result = await response.json();

      if (response.ok) {
        adminToken = result.token;
        adminUsername = result.username;
        sessionStorage.setItem("adminToken", adminToken);
        sessionStorage.setItem("adminUsername", adminUsername);
        updateAuthUI();
        fetchActivities();
        loginDialog.close();
        loginForm.reset();
        showMessage(result.message, "success");
      } else {
        showMessage(result.detail || "Login failed", "error");
      }
    } catch (error) {
      showMessage("Failed to log in. Please try again.", "error");
      console.error("Error logging in:", error);
    }
  });

  logoutButton.addEventListener("click", async () => {
    try {
      await fetch("/auth/logout", {
        method: "POST",
        headers: {
          "X-Admin-Token": adminToken,
        },
      });
    } catch (error) {
      console.error("Error logging out:", error);
    }

    adminToken = "";
    adminUsername = "";
    sessionStorage.removeItem("adminToken");
    sessionStorage.removeItem("adminUsername");
    updateAuthUI();
    fetchActivities();
    userDropdown.classList.add("hidden");
    showMessage("Logged out", "success");
  });

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(
          activity
        )}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
          headers: {
            "X-Admin-Token": adminToken,
          },
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();

        // Refresh activities list to show updated participants
        fetchActivities();
      } else {
        if (response.status === 401) {
          adminToken = "";
          adminUsername = "";
          sessionStorage.removeItem("adminToken");
          sessionStorage.removeItem("adminUsername");
          updateAuthUI();
          fetchActivities();
        }
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  updateAuthUI();
  fetchActivities();
});
