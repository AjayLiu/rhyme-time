<script>
  import { signIn, signInWithGoogle } from "$lib/firebase/auth";
  import { goto } from "$app/navigation";

  let email = "";
  let password = "";
  let error = "";
  let loading = false;

  async function handleSignIn() {
    loading = true;
    error = "";

    const result = await signIn(email, password);

    if (result.success) {
      goto("/game");
    } else {
      error = result.error ?? "";
    }

    loading = false;
  }

  async function handleGoogleSignIn() {
    loading = true;
    error = "";

    const result = await signInWithGoogle();

    if (result.success) {
      goto("/game");
    } else {
      error = result.error;
    }

    loading = false;
  }
</script>

<div class="login-container">
  <h1>Login</h1>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <form on:submit|preventDefault={handleSignIn}>
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

    <button type="submit" disabled={loading}>
      {loading ? "Signing in..." : "Sign in"}
    </button>
  </form>

  <div class="separator">OR</div>

  <button
    on:click={handleGoogleSignIn}
    disabled={loading}
    class="google-button"
  >
    Sign in with Google
  </button>

  <div class="register-link">
    Don't have an account? <a href="/register">Register</a>
  </div>
</div>

<style>
  .login-container {
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

  .google-button {
    background-color: white;
    color: #757575;
    border: 1px solid #ccc;
  }

  .error {
    color: red;
    margin-bottom: 15px;
  }

  .separator {
    margin: 20px 0;
    text-align: center;
    position: relative;
  }

  .separator::before,
  .separator::after {
    content: "";
    position: absolute;
    top: 50%;
    width: 45%;
    height: 1px;
    background-color: #ccc;
  }

  .separator::before {
    left: 0;
  }

  .separator::after {
    right: 0;
  }

  .register-link {
    margin-top: 20px;
    text-align: center;
  }
</style>
