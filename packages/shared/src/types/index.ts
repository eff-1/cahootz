export interface RegisterInput {
  email: string;
  password: string;
  dateOfBirth: string;
}

export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface RequestPasswordResetInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface EnableTotpInput {
  secret: string;
  code: string;
}

export interface VerifyTotpInput {
  code: string;
}
