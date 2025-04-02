<script>
  import { user } from "$lib/firebase/firebase";
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";

  export let data;

  onMount(() => {
    // Handle authentication redirects
    const unsubscribe = user.subscribe((currentUser) => {
      if (data.isProtectedRoute && !currentUser) {
        // Redirect to login if trying to access protected route without authentication
        goto("/login");
      }
    });

    return unsubscribe;
  });
</script>

<div class="app">
  <header>
    <nav>
      {#if $user}
        <a href="/game">Play Game</a>
        <a href="/profile">Profile</a>
        <button
          on:click={() => import("$lib/firebase/auth").then((m) => m.signOut())}
        >
          Sign Out
        </button>
      {:else}
        <a href="/">Home</a>
        <a href="/login">Login</a>
        <a href="/register">Register</a>
      {/if}
    </nav>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <p>© {new Date().getFullYear()} My SvelteKit App</p>
  </footer>
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  header {
    padding: 1rem;
    background-color: #f5f5f5;
  }

  nav {
    display: flex;
    gap: 1rem;
  }

  main {
    flex: 1;
    padding: 1rem;
  }

  footer {
    padding: 1rem;
    background-color: #f5f5f5;
    text-align: center;
  }
</style>
