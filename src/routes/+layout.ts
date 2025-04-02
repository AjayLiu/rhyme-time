// This file handles authentication state for the entire app
import { user } from "$lib/firebase/firebase";
import { get } from "svelte/store";

export const load = async ({ url }) => {
  const currentUser = get(user);

  // Add protected routes here
  const protectedRoutes = ["/game", "/profile"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    url.pathname.startsWith(route)
  );

  return {
    user: currentUser,
    isProtectedRoute,
  };
};
