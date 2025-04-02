<script>
  import { signUp } from "$lib/firebase/auth";
  import { goto } from "$app/navigation";

  let email = "";
  let password = "";
  let confirmPassword = "";
  let error = "";
  let loading = false;

  async function handleSignUp() {
    loading = true;
    error = "";

    if (password !== confirmPassword) {
      error = "Passwords do not match";
      loading = false;
      return;
    }

    const result = await signUp(email, password);

    if (result.success) {
      goto("/game");
    } else {
      error = result.error ?? "";
    }

    loading = false;
  }
</script>

<div class="register-container">
  <h1>Register</h1>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <form on:submit|preventDefault={handleSignUp}>
    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        required
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="password">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="confirm-password">Confirm Password</label>
      <input
        type="password"
        id="confirm-password"
        bind:value={confirmPassword}
        required
        disabled={loading}
      />
    </div>

    <button type="submit" disabled={loading}>
      {loading ? "Registering..." : "Register"}
    </button>
  </form>

  <div class="login-link">
    Already have an account? <a href="/login">Login</a>
  </div>
</div>

<style>
  .register-container {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
  }

  .form-group {
    margin-bottom: 15px;
  }

  label {
    display: block;
    margin-bottom: 5px;
  }

  input {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  button {
    width: 100%;
    padding: 10px;
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }

  .error {
    color: red;
    margin-bottom: 15px;
  }

  .login-link {
    margin-top: 20px;
    text-align: center;
  }
</style>
