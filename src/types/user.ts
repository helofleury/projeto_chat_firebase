export type ChatUser = {
  uid: string;
  name: string;
  email: string;
  phoneNumber: string;
  birthDate: string; // ISO: AAAA-MM-DD
  photoUrl: string;
  createdAt: number;
};

/** Dados visíveis a qualquer usuário autenticado (busca de usuários). */
export type PublicProfile = {
  uid: string;
  name: string;
  photoUrl: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  birthDate: string; // ISO
  photoUri: string | null;
};
