import { cognitoAuthConfig } from "./cognito";

interface StoredUser {
  id_token?: string;
  expires_at?: number;
}

export function getIdToken(): string | null {
  const key = `oidc.user:${cognitoAuthConfig.authority}:${cognitoAuthConfig.client_id}`;
  const raw = sessionStorage.getItem(key);

  if (!raw) {
    return null;
  }

  try {
    const user = JSON.parse(raw) as StoredUser;

    if (!user.id_token) {
      return null;
    }

    if (user.expires_at && user.expires_at * 1000 <= Date.now()) {
      return null;
    }

    return user.id_token;
  } catch {
    return null;
  }
}